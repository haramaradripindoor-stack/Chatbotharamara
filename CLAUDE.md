# CLAUDE.md — Haramara Bot · Contexto completo para IA
> Última actualización: 2026-05-04
> Versión: 1.0 — Setup inicial documentado · Stack definido · v2 entregado
> Leer completo antes de responder cualquier pregunta de código o arquitectura.

---

## §0 — Visión de negocio (LEER PRIMERO)

### El contexto

**Haramara Drip Indoor** es la tienda de sistemas de riego automático de Felipe para cultivo indoor en Chile. El bot NO es el producto — es el canal de ventas y atención que reemplaza a ManyChat (plan gratis muy limitado).

### Para qué sirve el bot

1. **Calificar leads automáticamente** — el bot hace las preguntas correctas (¿cuántas plantas? ¿qué sustrato? ¿qué ciclo?) y calcula un intent score
2. **Recomendar el kit correcto** — con RAG sobre el catálogo y PDFs técnicos (Athena Handbook, fichas de producto)
3. **Alertar a Felipe** — cuando un lead está caliente (score ≥ 75) o el bot no puede responder
4. **Dejar que Felipe tome el timón** — modo manual por cliente individual, el bot se pausa solo para ese número

### Lo que NO hace el bot

- NO cierra ventas solo — genera la conversación, califica, y pasa al humano
- NO maneja pagos ni pedidos — eso va a la tienda/link de pago
- NO opera con Instagram DMs todavía (Meta Graph API más restrictiva — fase 2)

### Stack completo del negocio (relación entre proyectos)

| Proyecto | Repo | Función |
|---|---|---|
| **Haramara App** | `Fvivancorne/Administraci-nharamaradrip` | Panel admin interno de instalaciones/clientes |
| **Haramara Bot** | (este repo) | Bot WhatsApp de ventas + panel de leads |

Son proyectos separados. No comparten código, pero sí comparten el mismo Supabase si Felipe lo configura así (recomendado: proyectos Supabase separados para no mezclar datos).

---

## §1 — Stack técnico

```
Canal:       Meta WhatsApp Business Cloud API (directo, sin Twilio, sin ManyChat)
LLM:         Groq llama-3.3-70b-versatile (gratis)
Embeddings:  Cohere embed-multilingual-v3.0 (gratis, español nativo)
Base datos:  Supabase (PostgreSQL + pgvector)
Hosting:     Vercel (gratis)
Framework:   Next.js 14 (App Router) + TypeScript
```

**Path local del proyecto:** `C:\Users\FELIP\Downloads\haramara-bot-v2\` (después de descomprimir)
**Repo GitHub:** por crear (aún no tiene repo)
**URL Vercel:** por definir (primer deploy pendiente)

---

## §2 — Reglas absolutas para Claude

**Regla 1:** Nunca generar código inline en el chat para modificaciones. Siempre generar archivo `patch-bot-vN-descripcion.mjs` que Felipe ejecuta localmente con `node patch.mjs`.

**Regla 2:** Nunca cambiar el system prompt del bot (en `lib/rag.ts` o en Supabase `agent_config`) sin confirmar con Felipe primero — es lógica de negocio directa.

**Regla 3:** El `ADMIN_SECRET` y `NEXT_PUBLIC_ADMIN_SECRET` deben ser el mismo valor. Si se cambia uno, cambiar el otro. El panel usa el público para el login client-side; la API usa el privado para el header `x-admin-secret`.

**Regla 4:** No inventar nombres de modelos Groq. Los únicos válidos son los listados en `§5 — Modelos`. Si Groq lanza uno nuevo, preguntar a Felipe antes de usarlo.

**Regla 5:** El webhook de WhatsApp responde SIEMPRE con 200 OK (incluso si hay errores internos), de lo contrario Meta marca el endpoint como caído y deja de enviar mensajes. Manejar todos los errores internamente.

**Regla 6:** Cohere `embed-multilingual-v3.0` genera vectores de **1024 dimensiones**. La columna `embedding` en Supabase es `vector(1024)`. No cambiar el modelo de embeddings sin migrar todas las columnas y reindexar todo.

**Regla 7:** El `modo_manual = true` en un lead pausa el bot SOLO para ese número. El webhook recibe el mensaje, lo guarda en `conversations`, y sale sin responder. Felipe responde desde el panel → `/api/whatsapp/send`.

**Regla 8:** Los índices `ivfflat` en Supabase requieren que haya datos antes de crearlos. Si la migración SQL falla en los índices, es porque las tablas están vacías. Felipe debe crear los índices manualmente DESPUÉS de indexar el catálogo.

**Regla 9:** Nunca exponer `SUPABASE_SERVICE_KEY` al cliente. Solo `NEXT_PUBLIC_SUPABASE_ANON_KEY`. La service key solo va en rutas API (server-side).

**Regla 10:** El `intent_score` se calcula en `calculateIntentScore()` en `lib/rag.ts` — es keyword-based, no IA. Si Felipe quiere ajustar qué palabras suben/bajan el score, editar esa función, no el system prompt.

---

## §3 — Workflow de desarrollo

```
1. Claude genera archivo patch: patch-bot-vN-descripcion.mjs
2. Felipe descarga a: C:\Users\FELIP\Downloads\
3. Felipe corre: node "C:\Users\FELIP\Downloads\patch-bot-vN.mjs"
4. Felipe verifica los archivos modificados
5. Felipe corre: cd haramara-bot && npx tsc --noEmit
6. Si TypeScript verde:
   git add [archivos]
   git commit -m "feat: descripcion"
   git push
7. Vercel auto-deploya desde el push
8. Si falla: Claude corrige el patch, volver a paso 2.
```

**Nunca hacer commit si tsc falla.**

**Para cambios en Supabase:** Claude genera el SQL como comentario o archivo `.sql` separado. Felipe lo ejecuta en el SQL Editor de Supabase. No hay migraciones automáticas.

---

## §4 — Estructura de archivos

```
haramara-bot/
├── app/
│   ├── admin/
│   │   ├── page.tsx              ← Panel de leads (auth + realtime + modo manual)
│   │   └── config/
│   │       └── page.tsx          ← Config agente: prompt, modelos, FAQs, RAG
│   ├── api/
│   │   ├── whatsapp/
│   │   │   ├── webhook/
│   │   │   │   └── route.ts      ← Recibe mensajes de Meta, lógica principal
│   │   │   └── send/
│   │   │       └── route.ts      ← Envía mensajes desde panel admin (modo manual)
│   │   └── index-knowledge/
│   │       └── route.ts          ← Indexa catálogo/FAQs en pgvector (GET=bulk, POST=chunk)
│   ├── layout.tsx
│   └── page.tsx                  ← Redirect a /admin
├── lib/
│   ├── rag.ts                    ← generateRAGResponse, indexProducts, indexFaqs, intent score
│   ├── embeddings.ts             ← getEmbedding, getQueryEmbedding (Cohere)
│   └── whatsapp.ts               ← sendTextMessage, markAsRead, alertAdmin, parseWhatsAppMessage
├── supabase/
│   └── migrations/
│       └── 001_init.sql          ← Schema completo: leads, conversations, products, faqs, knowledge_chunks, agent_config
├── .env.example                  ← Template de variables (nunca subir .env.local)
├── .gitignore
├── CLAUDE.md                     ← Este archivo
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## §5 — APIs externas y límites

### Groq (LLM)
- **URL:** console.groq.com
- **Modelo activo:** `llama-3.3-70b-versatile`
- **Free tier:** 14.400 tokens/min, 500 requests/día (suficiente para una tienda pequeña)
- **Modelos disponibles:**

| Modelo | Contexto | Ideal para |
|---|---|---|
| `llama-3.3-70b-versatile` | 128k | Respuestas técnicas — **RECOMENDADO** |
| `llama-3.1-8b-instant` | 128k | Respuestas simples, más rápido |
| `mixtral-8x7b-32768` | 32k | Conversaciones muy largas |
| `gemma2-9b-it` | 8k | Alternativa si Groq tiene problemas |

### Cohere (Embeddings)
- **URL:** dashboard.cohere.com
- **Modelo:** `embed-multilingual-v3.0`
- **Dimensiones:** 1024 (crítico — no cambiar sin migrar)
- **Free tier:** 1000 calls/mes para production, ilimitado en trial
- **InputType:** `search_document` para indexar, `search_query` para buscar

### Meta WhatsApp Business Cloud API
- **Free tier:** primeras 1000 conversaciones iniciadas por usuario por mes son gratis
- **Conversación:** ventana de 24h desde el último mensaje del cliente
- **Límite mensaje:** 4096 caracteres por mensaje
- **Webhook:** Meta llama GET para verificar, POST para mensajes entrantes
- **Solo texto por ahora:** el webhook ignora mensajes de tipo imagen/audio/sticker

### Supabase
- **pgvector:** extensión habilitada, dimensión 1024
- **Realtime:** usado en el panel admin (postgres_changes en tabla `leads`)
- **Free tier:** 500MB DB, 1GB storage, suficiente para este volumen

---

## §6 — Schema de base de datos

### Tablas principales

```sql
leads (
  id uuid PK,
  nombre text,
  telefono text UNIQUE,     -- número WhatsApp (ej: 56912345678)
  canal text,               -- 'whatsapp' | 'instagram'
  estado text,              -- consulta | cotizacion | seguimiento | cerrado | perdido
  intent_score int,         -- 0-100, calculado en lib/rag.ts
  listo_comprar boolean,    -- true cuando bot detecta [READY_TO_BUY]
  modo_manual boolean,      -- true = bot pausado, Felipe responde
  notas text,               -- notas internas (no se envían al cliente)
  created_at, updated_at
)

conversations (
  id uuid PK,
  lead_id uuid FK → leads,
  role text,                -- 'user' | 'assistant' | 'human'
  content text,
  created_at
)

products (
  id uuid PK,
  nombre, categoria, descripcion, componentes, uso_ideal,
  precio_desde int,         -- CLP
  disponible boolean,
  embedding vector(1024)    -- Cohere
)

faqs (
  id uuid PK,
  pregunta, respuesta,
  activo boolean,
  embedding vector(1024)
)

knowledge_chunks (
  id uuid PK,
  titulo text,
  tipo text,                -- catalogo | protocolo | faq | precio | instalacion
  content text,
  embedding vector(1024)
)

agent_config (
  id uuid PK,
  system_prompt text,       -- editable desde /admin/config sin redeploy
  temperatura float,        -- 0-1
  max_tokens int,
  modelo text,              -- nombre del modelo Groq
  activo boolean
)
```

### Función pgvector
```sql
-- Busca en products + faqs + knowledge_chunks simultáneamente
search_knowledge(query_embedding vector(1024), match_threshold float, match_count int)
→ returns table(content text, tipo text, similarity float)
```

---

## §7 — Flujo del webhook (lógica principal)

```
POST /api/whatsapp/webhook
  ↓
parseWhatsAppMessage(body) → { messageId, from, name, text }
  ↓
markAsRead(messageId)  ← check azul inmediato
  ↓
buscar/crear lead en Supabase
  ↓
¿lead.modo_manual = true?
  → SÍ: guardar mensaje, salir (bot pausado)
  → NO: continuar
  ↓
cargar historial (últimos 8 mensajes)
  ↓
generateRAGResponse(text, history, leadId)
  ├── searchKnowledge(text) → Cohere embed → pgvector similarity search
  ├── getSystemPrompt() → Supabase agent_config (editable en /admin/config)
  ├── groq.chat.completions.create(system + context + history + user)
  ├── detectar [NEEDS_HUMAN] y [READY_TO_BUY] en respuesta
  ├── calculateIntentScore(userMessage, response) → 0-100
  └── guardar en conversations + actualizar lead
  ↓
sendTextMessage(from, cleanMessage)
  ↓
¿intentScore ≥ 75? → alertAdmin + estado='cotizacion'
¿needsHuman?       → alertAdmin + modo_manual=true + estado='seguimiento'
```

---

## §8 — Panel admin

### `/admin` — Dashboard de leads
- **Auth:** pantalla de login con `NEXT_PUBLIC_ADMIN_SECRET`, guardado en `sessionStorage`
- **Realtime:** suscripción postgres_changes en tabla `leads`
- **Modo manual:** toggle por lead individual — bot se pausa, Felipe responde
- **sendManual:** llama `POST /api/whatsapp/send` con header `x-admin-secret` → envía WhatsApp real + guarda como `role: 'human'`
- **Notas internas:** campo por lead, guardado en `leads.notas`, no visible para el cliente
- **Intent score:** barra visual (verde ≥70, amarillo ≥40, gris <40)

### `/admin/config` — Configuración del agente
- **System prompt:** editable en vivo, sin redeploy
- **Modelo/temperatura/tokens:** ajustables sin redeploy
- **Catálogo:** toggle disponible/pausado por producto
- **FAQs:** agregar/pausar, sin redeploy
- **RAG chunks:** pegar texto de PDFs → se vectoriza con Cohere automáticamente

---

## §9 — Intent score — cómo funciona

El score es **keyword-based** (no IA), calculado en `calculateIntentScore()` en `lib/rag.ts`:

```
Score base: 15

+12 por cada keyword de high intent en el mensaje del usuario
    (precio, cuánto vale, quiero comprar, cotización, despacho, webpay...)
+6  por cada keyword de medium intent
    (cómo funciona, compatible, gotero, sustrato...)
+30 si respuesta contiene [READY_TO_BUY] o mensaje menciona "cómo pago"
+15 si mensaje tiene número de 9 dígitos (posible teléfono adicional)
+10 si mensaje tiene "plantas" + número
Máximo: 100
```

**Threshold de alerta:** score ≥ 75 → alerta WhatsApp a Felipe + estado='cotizacion'

---

## §10 — Estado de sprints

### ✅ v1 — Entregado (sesión anterior)
- Webhook WhatsApp funcional
- RAG: Groq + Cohere + pgvector
- Panel admin: leads realtime, conversaciones
- Config panel: prompt, FAQs, RAG, productos
- Sistema de alertas (hot lead + needs human)
- Intent score keyword-based
- Modo manual (toggle por lead)

### ✅ v2 — Entregado (2026-05-04)
**Bugs corregidos:**
- `sendManual` ahora envía WhatsApp de verdad (antes solo guardaba en Supabase)
- Ruta nueva: `POST /api/whatsapp/send`

**Features agregadas:**
- Pantalla de login con contraseña en `/admin` (antes sin auth)
- Botón "Salir" (limpia sessionStorage)
- Notas internas por lead
- `.gitignore` correcto (excluye `node_modules` y `.env.local`)
- `NEXT_PUBLIC_APP_URL` en `.env.example`
- Trigger `updated_at` automático en tabla `leads`
- Índices `ivfflat` para búsquedas RAG más rápidas
- Score numérico visible en la lista de leads
- Indicador 💰 cuando `listo_comprar = true`
- README completo con guía paso a paso

### 🔲 v3 — Pendiente (próximos pasos sugeridos)

| Feature | Prioridad | Descripción |
|---|---|---|
| Upload PDF real | Alta | Subir PDF desde `/admin/config` → extrae texto → vectoriza (hoy solo pegar texto) |
| Mensajes de voz | Media | Parsear audio de WhatsApp → transcribir con Groq Whisper → procesar como texto |
| Instagram DMs | Media | Conectar Meta Graph API para Instagram (más restrictivo que WhatsApp) |
| Plantillas WhatsApp | Alta | Enviar templates aprobados por Meta para reactivar conversaciones >24h |
| Historial en el panel | Baja | Paginación en conversaciones largas (hoy sin límite) |
| Multi-agente | Baja | Separar bot de calificación de bot de soporte técnico |
| Analytics | Media | Dashboard: conversion rate, tiempo de respuesta, tasa de escalación |
| Link de pago | Media | Cuando `listo_comprar = true`, bot manda link de Flow/MercadoPago automáticamente |

---

## §11 — Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # clave pública (safe para el cliente)
SUPABASE_SERVICE_KEY=              # clave service_role (SOLO server-side)

# Groq
GROQ_API_KEY=                      # gsk_...

# Cohere (embeddings)
COHERE_API_KEY=                    # ...

# Meta WhatsApp
META_VERIFY_TOKEN=                 # string inventado para verificar webhook
META_WHATSAPP_TOKEN=               # token permanente de System User con rol admin
META_PHONE_NUMBER_ID=              # ID del número de WA conectado
WHATSAPP_BUSINESS_ACCOUNT_ID=      # ID de la cuenta Business

# Admin
ADMIN_WHATSAPP=                    # número de Felipe sin + (ej: 56912345678)
ADMIN_SECRET=                      # contraseña del panel (MISMO valor en los dos de abajo)
NEXT_PUBLIC_ADMIN_SECRET=          # misma contraseña (expuesta al cliente, necesaria para login)

# URL pública
NEXT_PUBLIC_APP_URL=               # https://haramara-bot.vercel.app
```

⚠️ `ADMIN_SECRET` y `NEXT_PUBLIC_ADMIN_SECRET` deben ser **idénticos**. Cambiar uno sin el otro rompe el login o la API de envío.

---

## §12 — Setup inicial (checklist)

- [ ] Crear proyecto Supabase
- [ ] Ejecutar `supabase/migrations/001_init.sql` en SQL Editor
- [ ] Crear repo en GitHub y hacer push inicial
- [ ] Crear proyecto en Vercel, importar repo, agregar todas las env vars
- [ ] Obtener API key de Groq (console.groq.com)
- [ ] Obtener API key de Cohere (dashboard.cohere.com)
- [ ] Crear Meta App (developers.facebook.com) → tipo Business → producto WhatsApp
- [ ] Configurar webhook en Meta con URL de Vercel + META_VERIFY_TOKEN
- [ ] Generar token permanente de System User en Meta
- [ ] Indexar catálogo: `GET /api/index-knowledge?secret=TU_ADMIN_SECRET`
- [ ] Probar bot mandando un mensaje al número de WhatsApp conectado
- [ ] Verificar que alerta llega al ADMIN_WHATSAPP cuando score sube

---

## §13 — Errores comunes y soluciones

| Error | Causa | Solución |
|---|---|---|
| Webhook retorna 403 | `META_VERIFY_TOKEN` no coincide | Verificar que es el mismo en Meta y en env vars |
| Bot no responde | `META_WHATSAPP_TOKEN` expirado | Regenerar System User token en Meta Developers |
| `sendManual` no envía | Token Meta inválido o número incorrecto | Verificar `META_PHONE_NUMBER_ID` y `META_WHATSAPP_TOKEN` |
| RAG no encuentra nada | Catálogo sin indexar | Llamar `/api/index-knowledge?secret=...` |
| Error de dimensiones pgvector | Modelo Cohere cambiado | No cambiar el modelo — las dimensiones deben ser 1024 |
| Panel muestra "Contraseña incorrecta" | `NEXT_PUBLIC_ADMIN_SECRET` no coincide | Verificar que la env var está en Vercel y re-deploying |
| Índices ivfflat fallan al crear | Tablas vacías | Crear los índices después de indexar el catálogo |
| Bot responde dos veces | Webhook procesado dos veces | Meta puede reintentar — verificar idempotencia en webhook |

---

## §14 — Glosario

| Término | Significado |
|---|---|
| RAG | Retrieval-Augmented Generation — el bot busca contexto relevante antes de responder |
| pgvector | Extensión PostgreSQL para búsqueda por similitud de vectores en Supabase |
| Embedding | Vector numérico de 1024 dimensiones que representa el significado de un texto |
| Intent score | Puntuación 0-100 de probabilidad de compra, calculada por keywords |
| Modo manual | Estado por lead donde el bot se pausa y Felipe responde directamente |
| [NEEDS_HUMAN] | Flag en respuesta del LLM → pausa bot + alerta a Felipe |
| [READY_TO_BUY] | Flag en respuesta del LLM → `listo_comprar = true` + sube intent score |
| System User | Usuario de sistema en Meta con permisos para generar tokens permanentes |
| Conversación WhatsApp | Ventana de 24h desde el último mensaje del cliente |
| Knowledge chunk | Fragmento de texto (de PDF u otra fuente) indexado en pgvector |

---

*Fin del documento — cargar completo al inicio de cada sesión de desarrollo del bot.*
