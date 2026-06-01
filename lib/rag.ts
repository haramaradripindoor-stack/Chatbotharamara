import Groq from 'groq-sdk'
import { CohereClient } from 'cohere-ai'
import { getSupabaseAdmin } from './supabase'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build' })
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY || 'dummy_key_for_build' })

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

// calculateIntentScore eliminado: La IA ahora asigna el intent_score de forma nativa vía JSON.

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
- Responde SIEMPRE en español, en forma amigable y profesional.
- Limita respuestas a 300 palabras máximo.
- NO inventes precios ni productos que no estén en el contexto.

INSTRUCCIÓN CRÍTICA: Debes responder EXCLUSIVAMENTE con un objeto JSON válido.
El formato esperado es:
{
  "message": "Tu respuesta para el cliente",
  "intentScore": 85, // Tu calificación del 1 al 100 de la intención de compra
  "readyToBuy": true, // true si quiere pagar/comprar ahora, false de lo contrario
  "needsHuman": false // true si le haces una pregunta técnica que no puedes resolver
}`,
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
    max_tokens: maxTokens,
    response_format: { type: 'json_object' }
  })

  const rawResponse = completion.choices[0]?.message?.content || '{}'
  
  try {
    const parsed = JSON.parse(rawResponse)
    return {
      message: parsed.message || 'No pude procesar tu mensaje. Por favor intenta de nuevo.',
      needsHuman: Boolean(parsed.needsHuman),
      readyToBuy: Boolean(parsed.readyToBuy),
      intentScore: typeof parsed.intentScore === 'number' ? parsed.intentScore : 15
    }
  } catch (error) {
    console.error('Error parsing Groq JSON response:', error)
    return { 
      message: rawResponse, 
      needsHuman: true, 
      readyToBuy: false, 
      intentScore: 0 
    }
  }
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
