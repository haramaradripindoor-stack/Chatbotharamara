import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/rag'

export async function POST(request: NextRequest) {
  // Verificar autenticación
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { telefono, message, leadId } = await request.json()

    if (!telefono || !message || !leadId) {
      return NextResponse.json({ error: 'Faltan campos: telefono, message, leadId' }, { status: 400 })
    }

    // 1. Enviar mensaje real por WhatsApp
    const sent = await sendWhatsAppMessage(telefono, message)

    if (!sent) {
      return NextResponse.json({ error: 'Error al enviar por WhatsApp — verificá META_WHATSAPP_TOKEN' }, { status: 500 })
    }

    // 2. Guardar en Supabase con role: 'human'
    await supabaseAdmin
      .from('conversations')
      .insert({ lead_id: leadId, role: 'human', content: message })

    // 3. Actualizar updated_at del lead
    await supabaseAdmin
      .from('leads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', leadId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
