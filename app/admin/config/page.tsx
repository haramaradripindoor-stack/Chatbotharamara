'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || ''

interface AgentConfig {
  id: string
  system_prompt: string
  modelo: string
  temperatura: number
  max_tokens: number
}

interface Product {
  id: string
  nombre: string
  categoria: string
  precio_desde: number
  disponible: boolean
}

interface Faq {
  id: string
  pregunta: string
  respuesta: string
  activo: boolean
}

export default function ConfigPage() {
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<'agente' | 'productos' | 'faqs' | 'rag'>('agente')
  const [saving, setSaving] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [indexMsg, setIndexMsg] = useState('')

  // Agente
  const [config, setConfig] = useState<AgentConfig | null>(null)

  // Productos
  const [products, setProducts] = useState<Product[]>([])

  // FAQs
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [newFaqP, setNewFaqP] = useState('')
  const [newFaqR, setNewFaqR] = useState('')

  // RAG Chunk
  const [chunkTitle, setChunkTitle] = useState('')
  const [chunkType, setChunkType] = useState('protocolo')
  const [chunkContent, setChunkContent] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('haramara_admin_auth')
    if (stored === 'ok') setAuthed(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    loadAll()
  }, [authed])

  async function loadAll() {
    const [{ data: cfg }, { data: prods }, { data: faqsData }] = await Promise.all([
      getSupabase().from('agent_config').select('*').eq('activo', true).single(),
      getSupabase().from('products').select('id, nombre, categoria, precio_desde, disponible').order('nombre'),
      getSupabase().from('faqs').select('*').order('created_at', { ascending: false })
    ])
    if (cfg) setConfig(cfg)
    if (prods) setProducts(prods)
    if (faqsData) setFaqs(faqsData)
  }

  async function saveConfig() {
    if (!config) return
    setSaving(true)
    await getSupabase().from('agent_config').update({
      system_prompt: config.system_prompt,
      modelo: config.modelo,
      temperatura: config.temperatura,
      max_tokens: config.max_tokens
    }).eq('id', config.id)
    setSaving(false)
  }

  async function toggleProduct(id: string, current: boolean) {
    await getSupabase().from('products').update({ disponible: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, disponible: !current } : p))
  }

  async function addFaq() {
    if (!newFaqP.trim() || !newFaqR.trim()) return
    const { data } = await getSupabase().from('faqs')
      .insert({ pregunta: newFaqP.trim(), respuesta: newFaqR.trim(), activo: true })
      .select().single()
    if (data) {
      setFaqs(prev => [data, ...prev])
      setNewFaqP('')
      setNewFaqR('')
    }
  }

  async function toggleFaq(id: string, current: boolean) {
    await getSupabase().from('faqs').update({ activo: !current }).eq('id', id)
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, activo: !current } : f))
  }

  async function addChunk() {
    if (!chunkTitle.trim() || !chunkContent.trim()) return
    await getSupabase().from('knowledge_chunks').insert({
      titulo: chunkTitle.trim(),
      tipo: chunkType,
      content: chunkContent.trim()
    })
    setChunkTitle('')
    setChunkContent('')
    alert('Chunk guardado. Acordate de re-indexar.')
  }

  async function runIndex() {
    setIndexing(true)
    setIndexMsg('Indexando...')
    try {
      const res = await fetch(`/api/index-knowledge?secret=${ADMIN_SECRET}`)
      const data = await res.json()
      setIndexMsg(data.message || 'Listo')
    } catch {
      setIndexMsg('Error al indexar')
    }
    setIndexing(false)
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
        <a href="/admin" style={{ color: '#16a34a' }}>Iniciar sesión primero</a>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 22 }}>⚙ Configuración del bot</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>Cambios en vivo — sin redeploy</p>
        </div>
        <a href="/admin" style={{ color: '#888', fontSize: 13, textDecoration: 'none' }}>← Panel de leads</a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #222', paddingBottom: 0 }}>
        {(['agente', 'productos', 'faqs', 'rag'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px',
              color: tab === t ? '#22c55e' : '#666',
              borderBottom: tab === t ? '2px solid #22c55e' : '2px solid transparent',
              fontSize: 14, fontWeight: tab === t ? 700 : 400,
              textTransform: 'capitalize'
            }}
          >
            {t === 'agente' ? '🤖 Agente' : t === 'productos' ? '📦 Productos' : t === 'faqs' ? '❓ FAQs' : '📚 RAG'}
          </button>
        ))}
      </div>

      {/* ─── Tab Agente ─── */}
      {tab === 'agente' && config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>System Prompt</label>
            <textarea
              value={config.system_prompt}
              onChange={e => setConfig({ ...config, system_prompt: e.target.value })}
              rows={14}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Modelo Groq</label>
              <select
                value={config.modelo}
                onChange={e => setConfig({ ...config, modelo: e.target.value })}
                style={{ ...inputStyle, width: '100%' }}
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                <option value="gemma2-9b-it">gemma2-9b-it</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Temperatura ({config.temperatura})</label>
              <input
                type="range" min="0" max="1" step="0.1"
                value={config.temperatura}
                onChange={e => setConfig({ ...config, temperatura: parseFloat(e.target.value) })}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Max tokens</label>
              <input
                type="number" value={config.max_tokens}
                onChange={e => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </div>

          <button onClick={saveConfig} disabled={saving} style={{ ...btnStyle, background: '#16a34a', alignSelf: 'flex-start' }}>
            {saving ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>
      )}

      {/* ─── Tab Productos ─── */}
      {tab === 'productos' && (
        <div>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Activá/pausá productos del catálogo. Los desactivados no aparecen en el RAG.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <div key={p.id} style={{
                background: '#1a1a1a', border: '1px solid #222', borderRadius: 8,
                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{p.nombre}</span>
                  <span style={{ color: '#555', fontSize: 12, marginLeft: 10 }}>{p.categoria}</span>
                  {p.precio_desde > 0 && (
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 10 }}>
                      desde ${p.precio_desde.toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleProduct(p.id, p.disponible)}
                  style={{
                    ...btnStyle, fontSize: 12,
                    background: p.disponible ? '#166534' : '#374151'
                  }}
                >
                  {p.disponible ? '✓ Activo' : 'Pausado'}
                </button>
              </div>
            ))}
            {products.length === 0 && <p style={{ color: '#555' }}>Sin productos. Agregá productos en Supabase.</p>}
          </div>
        </div>
      )}

      {/* ─── Tab FAQs ─── */}
      {tab === 'faqs' && (
        <div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 14 }}>Agregar FAQ</h3>
            <input
              value={newFaqP} onChange={e => setNewFaqP(e.target.value)}
              placeholder="Pregunta"
              style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
            />
            <textarea
              value={newFaqR} onChange={e => setNewFaqR(e.target.value)}
              placeholder="Respuesta"
              rows={3}
              style={{ ...inputStyle, width: '100%', resize: 'none', marginBottom: 12 }}
            />
            <button onClick={addFaq} style={{ ...btnStyle, background: '#16a34a', fontSize: 13 }}>
              + Agregar FAQ
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqs.map(f => (
              <div key={f.id} style={{
                background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: '12px 16px',
                opacity: f.activo ? 1 : 0.5
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{f.pregunta}</span>
                  <button onClick={() => toggleFaq(f.id, f.activo)} style={{
                    ...btnStyle, fontSize: 11, padding: '4px 10px',
                    background: f.activo ? '#166534' : '#374151'
                  }}>
                    {f.activo ? '✓ Activa' : 'Pausada'}
                  </button>
                </div>
                <p style={{ margin: 0, color: '#888', fontSize: 13 }}>{f.respuesta}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab RAG ─── */}
      {tab === 'rag' && (
        <div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 4px', color: '#fff', fontSize: 14 }}>Agregar Knowledge Chunk</h3>
            <p style={{ color: '#666', fontSize: 12, margin: '0 0 12px' }}>Pegá texto de PDFs, protocolos, fichas técnicas. Se vectoriza al indexar.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
              <input
                value={chunkTitle} onChange={e => setChunkTitle(e.target.value)}
                placeholder="Título (ej: Athena Bloom Protocol)"
                style={inputStyle}
              />
              <select value={chunkType} onChange={e => setChunkType(e.target.value)} style={inputStyle}>
                <option value="protocolo">Protocolo</option>
                <option value="catalogo">Catálogo</option>
                <option value="faq">FAQ</option>
                <option value="precio">Precio</option>
                <option value="instalacion">Instalación</option>
              </select>
            </div>

            <textarea
              value={chunkContent} onChange={e => setChunkContent(e.target.value)}
              placeholder="Pegá el texto aquí..."
              rows={8}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', marginBottom: 12 }}
            />

            <button onClick={addChunk} style={{ ...btnStyle, background: '#16a34a', fontSize: 13 }}>
              + Guardar chunk
            </button>
          </div>

          <div style={{ background: '#1a1a2a', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
            <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 14 }}>🔄 Re-indexar todo el conocimiento</h3>
            <p style={{ color: '#666', fontSize: 12, margin: '0 0 12px' }}>
              Vectoriza todos los productos activos, FAQs activas y knowledge chunks en Cohere.
              Necesario después de agregar/editar contenido.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={runIndex}
                disabled={indexing}
                style={{ ...btnStyle, background: '#1d4ed8' }}
              >
                {indexing ? 'Indexando...' : '⚡ Indexar ahora'}
              </button>
              {indexMsg && <span style={{ color: '#22c55e', fontSize: 13 }}>{indexMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #333',
  borderRadius: 8,
  color: '#e5e5e5',
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box'
}

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  padding: '8px 16px',
  fontSize: 14
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#888',
  fontSize: 12,
  marginBottom: 6
}
