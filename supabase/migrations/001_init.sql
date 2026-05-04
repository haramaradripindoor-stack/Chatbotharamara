-- ============================================================
-- Haramara Bot — Migración inicial
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Habilitar pgvector
create extension if not exists vector;

-- ─── Tabla: leads ─────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  telefono text unique not null,
  canal text default 'whatsapp',
  estado text default 'consulta',      -- consulta | cotizacion | seguimiento | cerrado | perdido
  intent_score int default 0,
  listo_comprar boolean default false,
  modo_manual boolean default false,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Tabla: conversations ─────────────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  role text not null,                  -- user | assistant | human
  content text not null,
  created_at timestamptz default now()
);

-- ─── Tabla: products ──────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text,
  descripcion text,
  componentes text,
  uso_ideal text,
  precio_desde int default 0,
  disponible boolean default true,
  embedding vector(1024),
  created_at timestamptz default now()
);

-- ─── Tabla: faqs ──────────────────────────────────────────────────────────────
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null,
  respuesta text not null,
  activo boolean default true,
  embedding vector(1024),
  created_at timestamptz default now()
);

-- ─── Tabla: knowledge_chunks ──────────────────────────────────────────────────
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text default 'protocolo',       -- catalogo | protocolo | faq | precio | instalacion
  content text not null,
  embedding vector(1024),
  created_at timestamptz default now()
);

-- ─── Tabla: agent_config ──────────────────────────────────────────────────────
create table if not exists agent_config (
  id uuid primary key default gen_random_uuid(),
  system_prompt text not null,
  temperatura float default 0.7,
  max_tokens int default 800,
  modelo text default 'llama-3.3-70b-versatile',
  activo boolean default true,
  created_at timestamptz default now()
);

-- ─── Config por defecto ───────────────────────────────────────────────────────
insert into agent_config (system_prompt, temperatura, max_tokens, modelo, activo)
values (
  'Eres el asistente de ventas de Haramara Drip Indoor, tienda de sistemas de riego automático para cultivo indoor en Chile.

Tu objetivo es:
1. Entender las necesidades del cliente (cantidad de plantas, sustrato, ciclo de riego)
2. Recomendar el kit de riego correcto basándote en el catálogo disponible
3. Calificar si el cliente tiene intención de compra real

Reglas de comportamiento:
- Responde siempre en español, en forma amigable, cercana y profesional
- Limita tus respuestas a máximo 300 palabras — sé conciso y directo
- Si el cliente pregunta el precio de algo, dalo si lo tenés en contexto. Si no, ofrecé cotizar
- Si el cliente quiere comprar o pagar, incluye [READY_TO_BUY] en tu respuesta
- Si no podés resolver la consulta o el cliente necesita asesoría especializada, incluye [NEEDS_HUMAN]
- No inventes productos ni precios que no estén en el contexto del catálogo
- No uses bullet points excesivos — respondé de forma conversacional',
  0.7,
  800,
  'llama-3.3-70b-versatile',
  true
)
on conflict do nothing;

-- ─── Trigger: updated_at automático en leads ──────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- ─── Índices de búsqueda ──────────────────────────────────────────────────────
create index if not exists idx_leads_telefono on leads(telefono);
create index if not exists idx_conversations_lead_id on conversations(lead_id);
create index if not exists idx_conversations_created_at on conversations(created_at desc);
create index if not exists idx_leads_updated_at on leads(updated_at desc);

-- NOTA: Los índices ivfflat de vectores requieren datos existentes.
-- Correr DESPUÉS de indexar el catálogo con /api/index-knowledge:
--
-- create index if not exists idx_products_embedding on products using ivfflat (embedding vector_cosine_ops);
-- create index if not exists idx_faqs_embedding on faqs using ivfflat (embedding vector_cosine_ops);
-- create index if not exists idx_chunks_embedding on knowledge_chunks using ivfflat (embedding vector_cosine_ops);

-- ─── Función: search_knowledge ────────────────────────────────────────────────
-- Busca simultáneamente en products, faqs y knowledge_chunks
create or replace function search_knowledge(
  query_embedding vector(1024),
  match_threshold float default 0.6,
  match_count int default 5
)
returns table(content text, tipo text, similarity float)
language sql stable
as $$
  select
    (p.nombre || ': ' || coalesce(p.descripcion, '') || ' ' || coalesce(p.componentes, '')) as content,
    'catalogo' as tipo,
    1 - (p.embedding <=> query_embedding) as similarity
  from products p
  where p.disponible = true
    and p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold

  union all

  select
    ('P: ' || f.pregunta || ' R: ' || f.respuesta) as content,
    'faq' as tipo,
    1 - (f.embedding <=> query_embedding) as similarity
  from faqs f
  where f.activo = true
    and f.embedding is not null
    and 1 - (f.embedding <=> query_embedding) > match_threshold

  union all

  select
    (kc.titulo || ': ' || kc.content) as content,
    kc.tipo,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) > match_threshold

  order by similarity desc
  limit match_count;
$$;

-- ─── RLS: habilitar sin políticas (para simplificar con service_role) ─────────
-- Si querés RLS más granular en el futuro, agregá políticas específicas aquí.
-- Por ahora el backend siempre usa service_role key que bypasea RLS.
alter table leads enable row level security;
alter table conversations enable row level security;
alter table products enable row level security;
alter table faqs enable row level security;
alter table knowledge_chunks enable row level security;
alter table agent_config enable row level security;

-- Política permisiva para service_role (el backend)
create policy "service_role bypass" on leads for all using (true);
create policy "service_role bypass" on conversations for all using (true);
create policy "service_role bypass" on products for all using (true);
create policy "service_role bypass" on faqs for all using (true);
create policy "service_role bypass" on knowledge_chunks for all using (true);
create policy "service_role bypass" on agent_config for all using (true);
