import React, { useEffect, useRef } from 'react'
import { Lead, Conversation } from '@/types/admin'
import { Send, Bot, HandMetal, Save, ThermometerSun } from 'lucide-react'

interface ChatWindowProps {
  selectedLead: Lead
  conversations: Conversation[]
  notes: string
  setNotes: (n: string) => void
  savingNotes: boolean
  saveNotes: () => void
  manualMessage: string
  setManualMessage: (m: string) => void
  sending: boolean
  sendManual: () => void
  toggleManual: (l: Lead) => void
}

export default function ChatWindow({
  selectedLead,
  conversations,
  notes,
  setNotes,
  savingNotes,
  saveNotes,
  manualMessage,
  setManualMessage,
  sending,
  sendManual,
  toggleManual
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversations])

  const scoreColor = (s: number) => (s >= 70 ? '#22c55e' : s >= 40 ? '#eab308' : '#6b7280')
  const estadoBadge = (e: string) =>
    ({ consulta: '#3b82f6', cotizacion: '#f97316', seguimiento: '#a855f7', cerrado: '#22c55e', perdido: '#6b7280' }[e] || '#6b7280')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#121212' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #1f1f1f', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'rgba(26, 26, 26, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>
              {selectedLead.listo_comprar ? '💰 ' : ''}{selectedLead.nombre}
            </span>
            <span style={{ color: '#888', fontSize: 14 }}>+{selectedLead.telefono}</span>
            <span style={{ 
              background: `${estadoBadge(selectedLead.estado)}20`, 
              color: estadoBadge(selectedLead.estado), 
              fontSize: 12, 
              fontWeight: 600,
              padding: '2px 8px', 
              borderRadius: 12,
              border: `1px solid ${estadoBadge(selectedLead.estado)}40`
            }}>
              {selectedLead.estado.toUpperCase()}
            </span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThermometerSun size={14} color={scoreColor(selectedLead.intent_score)} />
            <span style={{ fontSize: 12, color: '#888' }}>Intent score:</span>
            <div style={{ width: 100, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ 
                width: `${selectedLead.intent_score}%`, 
                height: '100%', 
                background: scoreColor(selectedLead.intent_score), 
                borderRadius: 3,
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(selectedLead.intent_score) }}>
              {selectedLead.intent_score}/100
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => toggleManual(selectedLead)} 
          style={{ 
            background: selectedLead.modo_manual ? 'rgba(168, 85, 247, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
            border: `1px solid ${selectedLead.modo_manual ? '#a855f7' : '#22c55e'}`,
            color: selectedLead.modo_manual ? '#d8b4fe' : '#bbf7d0',
            borderRadius: 8, 
            cursor: 'pointer',
            fontWeight: 600, 
            padding: '8px 16px', 
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          {selectedLead.modo_manual ? <HandMetal size={16} /> : <Bot size={16} />}
          {selectedLead.modo_manual ? 'MODO MANUAL' : 'BOT ACTIVO'}
        </button>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {conversations.map(msg => {
          const isUser = msg.role === 'user'
          const isHuman = msg.role === 'human'
          
          return (
            <div key={msg.id} style={{
              maxWidth: '75%',
              alignSelf: isUser ? 'flex-start' : 'flex-end',
              background: isUser ? '#1f2937' : isHuman ? '#4c1d95' : '#14532d',
              border: `1px solid ${isUser ? '#374151' : isHuman ? '#5b21b6' : '#166534'}`,
              borderRadius: 16, 
              borderBottomLeftRadius: isUser ? 4 : 16,
              borderBottomRightRadius: !isUser ? 4 : 16,
              padding: '12px 16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: 11, color: isUser ? '#9ca3af' : isHuman ? '#ddd6fe' : '#bbf7d0', marginBottom: 6, fontWeight: 600 }}>
                {isUser ? '👤 Cliente' : isHuman ? '👨‍💼 Felipe' : '🤖 Bot'}
              </div>
              <div style={{ fontSize: 14, color: '#f3f4f6', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {msg.content}
              </div>
              <div style={{ fontSize: 10, color: isUser ? '#6b7280' : isHuman ? '#a78bfa' : '#86efac', marginTop: 8, textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Notes & Actions Bar */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid #1f1f1f', background: '#1a1a1a' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            placeholder="📝 Notas internas (no visibles para el cliente)..."
            style={{ 
              background: '#0f0f0f', border: '1px solid #333', borderRadius: 8,
              color: '#e5e5e5', padding: '10px 16px', outline: 'none', flex: 1, fontSize: 13 
            }} 
          />
          <button 
            onClick={saveNotes} 
            disabled={savingNotes} 
            style={{ 
              background: '#374151', border: 'none', borderRadius: 8, color: '#fff', 
              cursor: 'pointer', fontWeight: 600, padding: '0 16px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Save size={16} />
            {savingNotes ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Manual Message Input */}
      {selectedLead.modo_manual && (
        <div style={{ padding: '16px 24px', background: '#1a1a1a', borderTop: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <textarea 
              value={manualMessage} 
              onChange={e => setManualMessage(e.target.value)}
              placeholder="Escribe un mensaje al cliente..."
              rows={2} 
              style={{ 
                background: '#0f0f0f', border: '1px solid #333', borderRadius: 8,
                color: '#fff', padding: '12px 16px', outline: 'none', flex: 1, 
                resize: 'none', fontSize: 14, fontFamily: 'inherit'
              }}
              onKeyDown={e => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  sendManual(); 
                } 
              }} 
            />
            <button 
              onClick={sendManual} 
              disabled={sending || !manualMessage.trim()}
              style={{ 
                background: '#16a34a', border: 'none', borderRadius: 8, color: '#fff', 
                cursor: manualMessage.trim() ? 'pointer' : 'not-allowed', 
                fontWeight: 600, padding: '0 24px', opacity: sending || !manualMessage.trim() ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {sending ? '...' : <Send size={18} />}
              Enviar
            </button>
          </div>
          <p style={{ margin: '8px 0 0', color: '#666', fontSize: 11 }}>
            Enter para enviar · Shift+Enter para salto de línea
          </p>
        </div>
      )}
    </div>
  )
}
