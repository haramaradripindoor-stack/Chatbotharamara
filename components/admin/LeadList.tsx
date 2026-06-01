import React from 'react'
import { Lead } from '@/types/admin'
import { User, MessageCircle, DollarSign, Bot, HandMetal } from 'lucide-react'

interface LeadListProps {
  leads: Lead[]
  selectedLead: Lead | null
  setSelectedLead: (l: Lead) => void
}

export default function LeadList({ leads, selectedLead, setSelectedLead }: LeadListProps) {
  const scoreColor = (s: number) => (s >= 70 ? '#22c55e' : s >= 40 ? '#eab308' : '#6b7280')
  const estadoBadge = (e: string) =>
    ({ consulta: '#3b82f6', cotizacion: '#f97316', seguimiento: '#a855f7', cerrado: '#22c55e', perdido: '#6b7280' }[e] || '#6b7280')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {leads.length === 0 && (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#555', fontSize: 13 }}>
          <MessageCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          Sin leads todavía
        </div>
      )}
      
      {leads.map((lead) => {
        const isSelected = selectedLead?.id === lead.id
        return (
          <div
            key={lead.id}
            onClick={() => setSelectedLead(lead)}
            style={{
              padding: '14px 16px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
              borderLeft: isSelected ? '3px solid #16a34a' : '3px solid transparent',
              borderBottom: '1px solid #1f1f1f',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {lead.listo_comprar ? (
                  <DollarSign size={14} color="#f97316" />
                ) : (
                  <User size={14} color="#888" />
                )}
                <span style={{ fontWeight: 600, color: isSelected ? '#fff' : '#e5e5e5', fontSize: 14 }}>
                  {lead.nombre || 'Sin nombre'}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(lead.intent_score) }}>
                {lead.intent_score}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
              <span
                style={{
                  background: `${estadoBadge(lead.estado)}20`, // 20% opacity
                  color: estadoBadge(lead.estado),
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: `1px solid ${estadoBadge(lead.estado)}40`
                }}
              >
                {lead.estado.toUpperCase()}
              </span>
              
              {lead.modo_manual ? (
                <span title="Modo Manual" style={{ color: '#a855f7', display: 'flex', alignItems: 'center' }}>
                  <HandMetal size={12} />
                </span>
              ) : (
                <span title="Bot Activo" style={{ color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                  <Bot size={12} />
                </span>
              )}
              
              <span style={{ color: '#666', fontSize: 11, marginLeft: 'auto' }}>
                +{lead.telefono}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
