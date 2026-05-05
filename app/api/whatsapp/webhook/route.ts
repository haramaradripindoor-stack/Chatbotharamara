export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateRAGResponse, sendWhatsAppMessage, markAsRead, alertAdmin } from '@/lib/rag'

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
  } catch { return null }
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = parseWhatsAppMessage(body)
    if (!parsed) return NextResponse.json({ status: 'ok' }, { status: 200 })

    const { messageId, from, name, text } = parsed
    const db = getSupabaseAdmin()

    await markAsRead(messageId)

    let { data: lead } = await db.from('wa_leads').select('*').eq('telefono', from).single()
    if (!lead) {
      const { data: newLead } = await db.from('wa_leads').insert({
        nombre: name, telefono: from, canal: 'whatsapp',
        estado: 'consulta', intent_score: 0, modo_manual: false, listo_comprar: false
      }).select().single()
      lead = newLead
    } else if (lead.nombre === 'Sin nombre' && name !== 'Sin nombre') {
      await db.from('wa_leads').update({ nombre: name }).eq('id', lead.id)
      lead.nombre = name
    }

    await db.from('conversations').insert({ lead_id: lead.id, role: 'user', content: text })

    if (lead.modo_manual) return NextResponse.json({ status: 'ok' }, { status: 200 })

    const { data: history } = await db.from('conversations')
      .select('role, content').eq('lead_id', lead.id)
      .order('created_at', { ascending: false }).limit(8)

    const conversationHistory = (history || []).reverse()
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const { message, needsHuman, readyToBuy, intentScore } = await generateRAGResponse(text, conversationHistory, lead.id)

    await sendWhatsAppMessage(from, message)
    await db.from('conversations').insert({ lead_id: lead.id, role: 'assistant', content: message })

    const updates: Record<string, unknown> = { intent_score: intentScore }
    if (readyToBuy) { updates.listo_comprar = true; updates.estado = 'cotizacion' }
    if (needsHuman) { updates.modo_manual = true; updates.estado = 'seguimiento' }
    await db.from('wa_leads').update(updates).eq('id', lead.id)

    if (intentScore >= 75 && !readyToBuy) await alertAdmin('hot_lead', { ...lead, intent_score: intentScore })
    if (needsHuman) await alertAdmin('needs_human', lead)

  } catch (err) { console.error('[webhook] Error:', err) }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
