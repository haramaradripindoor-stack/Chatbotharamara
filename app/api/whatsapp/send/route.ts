export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/rag'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { telefono, message, leadId } = await request.json()
    if (!telefono || !message || !leadId) {
      return NextResponse.json({ error: 'Faltan campos: telefono, message, leadId' }, { status: 400 })
    }

    const sent = await sendWhatsAppMessage(telefono, message)
    if (!sent) {
      return NextResponse.json({ error: 'Error al enviar por WhatsApp — verificá META_WHATSAPP_TOKEN' }, { status: 500 })
    }

    const db = getSupabaseAdmin()
    await db.from('conversations').insert({ lead_id: leadId, role: 'human', content: message })
    await db.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
