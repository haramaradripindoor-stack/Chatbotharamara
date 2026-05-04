import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRAGResponse, sendWhatsAppMessage, markAsRead, alertAdmin } from '@/lib/rag'

// ─── Helpers de parsing ───────────────────────────────────────────────────────

function parseWhatsAppMessage(body: Record<string, unknown>) {
  try {
    const entry = (body.entry as Record<string, unknown>[])?.[0]
    const change = (entry?.changes as Record<string, unknown>[])?.[0]
    const value = change?.value as Record<string, unknown>
    const message = (value?.messages as Record<string, unknown>[])?.[0]

    if (!message || message.type !== 'text') return null

    const contact = (value?.contacts as Record<string, unknown>[])?.[0]
    const profile = contact?.profile as Record<string, unknown> | undefined

    return {
      messageId: message.id as string,
      from: message.from as string,
      name: (profile?.name as string) || 'Sin nombre',
      text: (message.text as Record<string, unknown>)?.body as string
    }
  } catch {
    return null
  }
}

// ─── GET — verificación del webhook por Meta ──────────────────────────────────

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST — mensajes entrantes de WhatsApp ────────────────────────────────────

export async function POST(request: NextRequest) {
  // Siempre responder 200 a Meta, incluso si hay errores internos
  try {
    const body = await request.json()
    const parsed = parseWhatsAppMessage(body)

    // Ignorar mensajes que no son texto (imágenes, audios, stickers, etc.)
    if (!parsed) {
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const { messageId, from, name, text } = parsed

    // 1. Check azul inmediato
    await markAsRead(messageId)

    // 2. Buscar o crear lead
    let { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('telefono', from)
      .single()

    if (!lead) {
      const { data: newLead } = await supabaseAdmin
        .from('leads')
        .insert({
          nombre: name,
          telefono: from,
          canal: 'whatsapp',
          estado: 'consulta',
          intent_score: 0,
          modo_manual: false,
          listo_comprar: false
        })
        .select()
        .single()
      lead = newLead
    } else if (lead.nombre === 'Sin nombre' && name !== 'Sin nombre') {
      // Actualizar nombre si lo consiguió ahora
      await supabaseAdmin
        .from('leads')
        .update({ nombre: name })
        .eq('id', lead.id)
      lead.nombre = name
    }

    // 3. Guardar mensaje del usuario
    await supabaseAdmin
      .from('conversations')
      .insert({ lead_id: lead.id, role: 'user', content: text })

    // 4. Si modo manual, salir sin responder
    if (lead.modo_manual) {
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // 5. Cargar historial (últimos 8 mensajes)
    const { data: history } = await supabaseAdmin
      .from('conversations')
      .select('role, content')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(8)

    const conversationHistory = (history || [])
      .reverse()
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // 6. Generar respuesta RAG
    const { message, needsHuman, readyToBuy, intentScore } = await generateRAGResponse(
      text,
      conversationHistory,
      lead.id
    )

    // 7. Enviar respuesta al cliente
    await sendWhatsAppMessage(from, message)

    // 8. Guardar respuesta del bot
    await supabaseAdmin
      .from('conversations')
      .insert({ lead_id: lead.id, role: 'assistant', content: message })

    // 9. Actualizar lead
    const updates: Record<string, unknown> = { intent_score: intentScore }
    if (readyToBuy) {
      updates.listo_comprar = true
      updates.estado = 'cotizacion'
    }
    if (needsHuman) {
      updates.modo_manual = true
      updates.estado = 'seguimiento'
    }
    await supabaseAdmin.from('leads').update(updates).eq('id', lead.id)

    // 10. Alertas al admin
    if (intentScore >= 75 && !readyToBuy) {
      await alertAdmin('hot_lead', { ...lead, intent_score: intentScore })
    }
    if (needsHuman) {
      await alertAdmin('needs_human', lead)
    }

  } catch (err) {
    console.error('[webhook] Error:', err)
    // Nunca retornar error a Meta
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
