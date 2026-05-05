'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

interface Lead {
  id: string; nombre: string; telefono: string; canal: string; estado: string
  intent_score: number; listo_comprar: boolean; modo_manual: boolean
  notas: string | null; created_at: string; updated_at: string
}
interface Conversation {
  id: string; role: string; content: string; created_at: string
}

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || ''

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [manualMessage, setManualMessage] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('haramara_admin_auth') === 'ok') setAuthed(true)
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_SECRET) {
      sessionStorage.setItem('haramara_admin_auth', 'ok')
      setAuthed(true)
    } else { setAuthError('Contraseña incorrecta') }
  }

  function handleLogout() {
    sessionStorage.removeItem('haramara_admin_auth')
    setAuthed(false); setPassword('')
  }

  const loadLeads = useCallback(async () => {
    const db = getSupabase()
    const { data } = await db.from('wa_leads').select('*').order('updated_at', { ascending: false })
    if (data) setLeads(data)
  }, [])

  useEffect(() => {
    if (!authed) return
    loadLeads()
    const db = getSupabase()
    const channel = db.channel('wa-leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_leads' }, () => loadLeads())
      .subscribe()
    return () => { db.removeChannel(channel) }
  }, [authed, loadLeads])

  useEffect(() => {
    if (!selectedLead) return
    setNotes(selectedLead.notas || '')
    const db = getSupabase()
    db.from('conversations').select('*').eq('lead_id', selectedLead.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setConversations(data) })
    const channel = db.channel(`conv-${selectedLead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `lead_id=eq.${selectedLead.id}` },
        (payload) => setConversations(prev => [...prev, payload.new as Conversation]))
      .subscribe()
    return () => { db.removeChannel(channel) }
  }, [selectedLead])

  async function toggleManual(lead: Lead) {
    const newVal = !lead.modo_manual
    await getSupabase().from('wa_leads').update({ modo_manual: newVal }).eq('id', lead.id)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, modo_manual: newVal } : l))
    if (selectedLead?.id === lead.id) setSelectedLead(prev => prev ? { ...prev, modo_manual: newVal } : prev)
  }

  async function sendManual() {
    if (!selectedLead || !manualMessage.trim()) return
    setSending(true)
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ telefono: selectedLead.telefono, message: manualMessage.trim(), leadId: selectedLead.id })
    })
    if (!res.ok) { const err = await res.json(); alert(`Error al enviar: ${err.error}`) }
    else setManualMessage('')
    setSending(false)
  }

  async function saveNotes() {
    if (!selectedLead) return
    setSavingNotes(true)
    await getSupabase().from('wa_leads').update({ notas: notes }).eq('id', selectedLead.id)
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notas: notes } : l))
    setSavingNotes(false)
  }

  const scoreColor = (s: number) => s >= 70 ? '#22c55e' : s >= 40 ? '#eab308' : '#6b7280'
  const estadoBadge = (e: string) => ({ consulta: '#3b82f6', cotizacion: '#f97316', seguimiento: '#a855f7', cerrado: '#22c55e', perdido: '#6b7280' }[e] || '#6b7280')

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 40, width: 340 }}>
        <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: 20 }}>🌿 Haramara Bot</h2>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Panel de administración</p>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)} style={inputStyle} autoFocus />
          {authError && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0' }}>{authError}</p>}
          <button type="submit" style={{ ...btnStyle, marginTop: 16, width: '100%', background: '#16a34a' }}>Entrar</button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: 320, borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: '#fff' }}>🌿 Haramara Bot</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/admin/config" style={{ color: '#888', fontSize: 13, textDecoration: 'none' }}>⚙ Config</a>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer' }}>Salir</button>
          </div>
        </div>
        <div style={{ padding: '8px 0', flex: 1 }}>
          {leads.length === 0 && <p style={{ color: '#555', fontSize: 13, padding: '16px', textAlign: 'center' }}>Sin leads todavía</p>}
          {leads.map(lead => (
            <div key={lead.id} onClick={() => setSelectedLead(lead)} style={{
              padding: '12px 16px', cursor: 'pointer',
              background: selectedLead?.id === lead.id ? '#1e2a1e' : 'transparent',
              borderLeft: selectedLead?.id === lead.id ? '3px solid #16a34a' : '3px solid transparent',
              borderBottom: '1px solid #1a1a1a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{lead.listo_comprar ? '💰 ' : ''}{lead.nombre || 'Sin nombre'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(lead.intent_score) }}>{lead.intent_score}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <span style={{ background: estadoBadge(lead.estado), color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{lead.estado}</span>
                {lead.modo_manual && <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>manual</span>}
                <span style={{ color: '#555', fontSize: 11 }}>+{lead.telefono}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!selectedLead ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
          Seleccioná un lead para ver la conversación
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>{selectedLead.listo_comprar ? '💰 ' : ''}{selectedLead.nombre}</span>
                <span style={{ color: '#555', fontSize: 13 }}>+{selectedLead.telefono}</span>
                <span style={{ background: estadoBadge(selectedLead.estado), color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{selectedLead.estado}</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Intent score:</span>
                <div style={{ width: 80, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${selectedLead.intent_score}%`, height: '100%', background: scoreColor(selectedLead.intent_score), borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(selectedLead.intent_score) }}>{selectedLead.intent_score}/100</span>
              </div>
            </div>
            <button onClick={() => toggleManual(selectedLead)} style={{ ...btnStyle, background: selectedLead.modo_manual ? '#7c3aed' : '#374151', fontSize: 12 }}>
              {selectedLead.modo_manual ? '🎮 Manual ON' : '🤖 Bot activo'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conversations.map(msg => (
              <div key={msg.id} style={{
                maxWidth: '70%',
                alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
                background: msg.role === 'user' ? '#1f2937' : msg.role === 'human' ? '#3b1f7c' : '#1a2e1a',
                borderRadius: 12, padding: '10px 14px'
              }}>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                  {msg.role === 'user' ? '👤 Cliente' : msg.role === 'human' ? '👨‍💼 Felipe' : '🤖 Bot'}
                </div>
                <div style={{ fontSize: 14, color: '#e5e5e5', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                  {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="📝 Notas internas (no se envían al cliente)"
                style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
              <button onClick={saveNotes} disabled={savingNotes} style={{ ...btnStyle, background: '#374151', fontSize: 12 }}>
                {savingNotes ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {selectedLead.modo_manual && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #222' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea value={manualMessage} onChange={e => setManualMessage(e.target.value)}
                  placeholder="Escribí tu mensaje y presioná Enviar"
                  rows={2} style={{ ...inputStyle, flex: 1, resize: 'none', fontSize: 14 }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManual() } }} />
                <button onClick={sendManual} disabled={sending || !manualMessage.trim()}
                  style={{ ...btnStyle, background: '#16a34a', padding: '0 20px' }}>
                  {sending ? '...' : 'Enviar'}
                </button>
              </div>
              <p style={{ margin: '6px 0 0', color: '#555', fontSize: 11 }}>Enter para enviar · Shift+Enter para nueva línea</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
  color: '#e5e5e5', padding: '8px 12px', outline: 'none', width: '100%', boxSizing: 'border-box'
}
const btnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer',
  fontWeight: 600, padding: '8px 16px', fontSize: 14, whiteSpace: 'nowrap'
}
