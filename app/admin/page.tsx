'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Lead, Conversation } from '@/types/admin'
import LeadList from '@/components/admin/LeadList'
import ChatWindow from '@/components/admin/ChatWindow'
import { Settings, LogOut, MessageSquareHeart } from 'lucide-react'

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
    } else { 
      setAuthError('Contraseña incorrecta') 
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('haramara_admin_auth')
    setAuthed(false)
    setPassword('')
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
    if (!res.ok) { 
      const err = await res.json()
      alert(`Error al enviar: ${err.error}`) 
    } else {
      setManualMessage('')
    }
    setSending(false)
  }

  async function saveNotes() {
    if (!selectedLead) return
    setSavingNotes(true)
    await getSupabase().from('wa_leads').update({ notas: notes }).eq('id', selectedLead.id)
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notas: notes } : l))
    setSavingNotes(false)
  }

  // --- Login View ---
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ 
        background: 'rgba(26, 26, 26, 0.8)', backdropFilter: 'blur(16px)', 
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 24, 
        padding: 48, width: 380, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ background: '#16a34a', padding: 8, borderRadius: 12 }}>
            <MessageSquareHeart size={24} color="#fff" />
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 700 }}>Haramara Bot</h2>
        </div>
        <p style={{ margin: '0 0 32px', color: '#888', fontSize: 15 }}>Panel de Administración</p>
        
        <form onSubmit={handleLogin}>
          <input 
            type="password" 
            placeholder="Contraseña de acceso" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
            style={{
              background: '#0f0f0f', border: '1px solid #333', borderRadius: 12,
              color: '#fff', padding: '12px 16px', outline: 'none', width: '100%', boxSizing: 'border-box',
              fontSize: 15, transition: 'border-color 0.2s'
            }} 
            autoFocus 
          />
          {authError && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0', fontWeight: 500 }}>{authError}</p>}
          <button type="submit" style={{ 
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12,
            width: '100%', padding: '12px', marginTop: 24, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.2s'
          }}>
            Ingresar al Panel
          </button>
        </form>
      </div>
    </div>
  )

  // --- Main Dashboard View ---
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>
      {/* Sidebar / Left Column */}
      <div style={{ width: 340, borderRight: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#121212' }}>
        <div style={{ 
          padding: '24px 20px 16px', borderBottom: '1px solid #1f1f1f', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'rgba(18, 18, 18, 0.8)', backdropFilter: 'blur(8px)', zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#16a34a', padding: 6, borderRadius: 8 }}>
              <MessageSquareHeart size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>Haramara Bot</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/admin/config" title="Configuración" style={{ color: '#888', transition: 'color 0.2s' }}>
              <Settings size={18} />
            </a>
            <button onClick={handleLogout} title="Cerrar sesión" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <LeadList leads={leads} selectedLead={selectedLead} setSelectedLead={setSelectedLead} />
        </div>
      </div>

      {/* Main Chat Area */}
      {!selectedLead ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
          <MessageSquareHeart size={64} style={{ opacity: 0.1, marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px', color: '#888' }}>Ningún chat seleccionado</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Seleccioná un lead del panel lateral para ver la conversación.</p>
        </div>
      ) : (
        <ChatWindow 
          selectedLead={selectedLead}
          conversations={conversations}
          notes={notes}
          setNotes={setNotes}
          savingNotes={savingNotes}
          saveNotes={saveNotes}
          manualMessage={manualMessage}
          setManualMessage={setManualMessage}
          sending={sending}
          sendManual={sendManual}
          toggleManual={toggleManual}
        />
      )}
    </div>
  )
}
