import Groq from 'groq-sdk'
import { CohereClient } from 'cohere-ai'
import { getSupabaseAdmin } from './supabase'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RAGResponse {
  message: string
  needsHuman: boolean
  readyToBuy: boolean
  intentScore: number
}

// ─── Intent Score (keyword-based, NO IA) ─────────────────────────────────────

export function calculateIntentScore(userMessage: string, botResponse: string): number {
  const msg = userMessage.toLowerCase()
  const resp = botResponse.toLowerCase()

  const highIntent = [
    'precio', 'cuánto vale', 'cuanto vale', 'quiero comprar', 'cotización',
    'cotizacion', 'despacho', 'webpay', 'transferencia', 'pagar', 'comprar',
    'pedido', 'stock', 'disponible', 'envío', 'envio', 'delivery'
  ]
  const mediumIntent = [
    'cómo funciona', 'como funciona', 'compatible', 'gotero', 'sustrato',
    'litros', 'plantas', 'maceta', 'sistema', 'riego', 'automático',
    'automatico', 'kit', 'instalación', 'instalacion', 'componentes'
  ]

  let score = 15
  for (const kw of highIntent) { if (msg.includes(kw)) score += 12 }
  for (const kw of mediumIntent) { if (msg.includes(kw)) score += 6 }
  if (resp.includes('[ready_to_buy]') || msg.includes('cómo pago') || msg.includes('como pago')) score += 30
  if (/\d{9}/.test(msg)) score += 15
  if (/\d+/.test(msg) && msg.includes('plant')) score += 10

  return Math.min(score, 100)
}

// ─── Embeddings con Cohere ────────────────────────────────────────────────────

export async function embedText(text: string, inputType: 'search_document' | 'search_query' = 'search_query'): Promise<number[]> {
  const response = await cohere.embed({
    texts: [text],
    model: 'embed-multilingual-v3.0',
    inputType,
  })
  // @ts-ignore
  return response.embeddings[0] as number[]
}

// ─── Búsqueda RAG en pgvector ────────────────────────────────────────────────

export async function searchKnowledge(query: string): Promise<string> {
  try {
    const embedding = await embedText(query, 'search_query')
    const { data, error } = await getSupabaseAdmin().rpc('search_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: 5
    })
    if (error || !data || data.length === 0) return ''
    return data
      .map((row: { content: string; tipo: string }) => `[${row.tipo}] ${row.content}`)
      .join('\n\n')
  } catch {
    return ''
  }
}

// ─── System Prompt desde Supabase ────────────────────────────────────────────

export async function getSystemPrompt(): Promise<{ prompt: string; model: string; temperatura: number; maxTokens: number }> {
  const { data } = await getSupabaseAdmin()
    .from('agent_config')
    .select('*')
    .eq('activo', true)
    .single()

  if (data) {
    return {
      prompt: data.system_prompt,
      model: data.modelo || 'llama-3.3-70b-versatile',
      temperatura: data.temperatura ?? 0.7,
      maxTokens: data.max_tokens ?? 800
    }
  }

  return {
    prompt: `Eres el asistente de ventas de Haramara Drip Indoor, tienda de sistemas de riego automático para cultivo indoor en Chile.

Tu objetivo es:
1. Entender las necesidades del cliente (cantidad de plantas, sustrato, ciclo)
2. Recomendar el kit de riego correcto basándote en el catálogo
3. Calificar si el cliente tiene intención de compra

Reglas:
- Responde siempre en español, en forma amigable y profesional
- Si el cliente quiere comprar o está listo para hacerlo, incluye [READY_TO_BUY] en tu respuesta
- Si no puedes ayudar o el cliente necesita asesoría especializada, incluye [NEEDS_HUMAN] en tu respuesta
- Limita respuestas a 300 palabras máximo
- NO inventes precios ni productos que no estén en el contexto`,
    model: 'llama-3.3-70b-versatile',
    temperatura: 0.7,
    maxTokens: 800
  }
}

// ─── Generación de respuesta RAG ─────────────────────────────────────────────

export async function generateRAGResponse(
  userMessage: string,
  history: ConversationMessage[],
  leadId: string
): Promise<RAGResponse> {
  const context = await searchKnowledge(userMessage)
  const { prompt, model, temperatura, maxTokens } = await getSystemPrompt()

  const systemWithContext = context
    ? `${prompt}\n\n--- CATÁLOGO Y CONOCIMIENTO RELEVANTE ---\n${context}\n---`
    : prompt

  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: systemWithContext },
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ]

  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: temperatura,
    max_tokens: maxTokens
  })

  const rawResponse = completion.choices[0]?.message?.content || 'No pude procesar tu mensaje. Por favor intenta de nuevo.'
  const needsHuman = rawResponse.includes('[NEEDS_HUMAN]')
  const readyToBuy = rawResponse.includes('[READY_TO_BUY]')
  const cleanMessage = rawResponse
    .replace(/\[NEEDS_HUMAN\]/g, '')
    .replace(/\[READY_TO_BUY\]/g, '')
    .trim()
  const intentScore = calculateIntentScore(userMessage, rawResponse)

  return { message: cleanMessage, needsHuman, readyToBuy, intentScore }
}

// ─── Envío de mensaje WhatsApp ────────────────────────────────────────────────

export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text }
        })
      }
    )
    return response.ok
  } catch {
    return false
  }
}

// ─── Marcar mensaje como leído ────────────────────────────────────────────────

export async function markAsRead(messageId: string): Promise<void> {
  try {
    await fetch(
      `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      }
    )
  } catch {}
}

// ─── Alerta a admin ───────────────────────────────────────────────────────────

export async function alertAdmin(reason: 'hot_lead' | 'needs_human', lead: { nombre?: string; telefono: string; intent_score?: number }): Promise<void> {
  const adminPhone = process.env.ADMIN_WHATSAPP
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  if (!adminPhone) return

  const text = reason === 'hot_lead'
    ? `🔥 *Lead caliente!*\n\nCliente: ${lead.nombre || 'Sin nombre'}\nNúmero: +${lead.telefono}\nScore: ${lead.intent_score}/100\n\n👉 ${appUrl}/admin`
    : `🆘 *Bot necesita ayuda*\n\nCliente: ${lead.nombre || 'Sin nombre'}\nNúmero: +${lead.telefono}\n\nEl bot no puede resolver esta consulta.\n\n👉 ${appUrl}/admin`

  await sendWhatsAppMessage(adminPhone, text)
}
