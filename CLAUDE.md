# CLAUDE.md — Haramara Bot · Contexto completo para IA
> Última actualización: 2026-05-04
> Versión: 1.3 — v3 deployado · paths corregidos · estructura real documentada
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
| **Haramara Bot** | `haramaradripindoor-stack/Chatbotharamara` | Bot WhatsApp de ventas + panel de leads |

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

**Path local del proyecto:** `C:\Users\FELIP\Documents\GitHub\Chatbotharamara`
**Repo GitHub:** `https://github.com/haramaradripindoor-stack/Chatbotharamara`
**URL Vercel:** `https://chatbotharamara.vercel.app`

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

**Regla 11:** La tabla `agent_config` debe tener SIEMPRE al menos una fila con `activo = true`. Si está vacía, `/admin/config` muestra error PGRST116. Insertar el registro inicial con el SQL de §12.

**Regla 12:** Los clientes Supabase son lazy singletons (post-v3). Siempre importar `getSupabase()` o `getSupabaseAdmin()` — NUNCA los exports directos `supabase` o `supabaseAdmin` que ya no existen.

---

## §3 — Workflow de desarrollo

**Ruta local del repo:** `C:\Users\FELIP\Documents\GitHub\Chatbotharamara`

### Pasos exactos (en orden, sin saltear ninguno)

```
1. Claude genera archivo patch: patch-bot-vN-descripcion.mjs

2. Felipe descarga a: C:\Users\FELIP\Downloads\
   y corre:
   cd "C:\Users\FELIP\Documents\GitHub\Chatbotharamara"
   node "C:\Users\FELIP\Downloads\patch-bot-vN-descripcion.mjs"

3. Felipe corre TypeScript:
   npx tsc --noEmit
   (requiere: npm install typescript --save-dev)

4. Si TypeScript está verde:
   git add -A
   git commit -m "feat/fix: descripcion"
   git push

5. Vercel auto-deploya desde el push.
   Si falla el build en Vercel → Claude corrige el patch, volver a paso 1.
```

**Reglas absolutas de este workflow:**
- Claude NUNCA genera código inline para modificar archivos. Siempre genera el `.mjs`.
- Nunca hacer commit si `tsc` falla — ni aunque "parezca" que el error es menor.
- El patch debe ser idempotente: correrlo dos veces no debe romper nada.

**Para cambios en Supabase:** Claude genera el SQL como archivo `.sql` separado. Felipe lo ejecuta en el SQL Editor de Supabase. No hay migraciones automáticas.

**Para instalar TypeScript (una sola vez):**
```
cd "C:\Users\FELIP\Documents\GitHub\Chatbotharamara"
npm install typescript --save-dev
```

---

## §4 — Estructura de archivos (estado real post-v3)

```
Chatbotharamara/
├── app/
│   ├── admin/
│   │   ├── page.tsx              ← Panel de leads (auth + realtime + modo manual)
│   │   └── config/
│   │       └── page.tsx          ← Config agente: prompt, modelos, FAQs, RAG chunks
│   ├── api/
│   │   ├── whatsapp/
│   │   │   ├── webhook/
│   │   │   │   └── route.ts      ← Recibe mensajes de Meta, lógica principal
│   │   │   └── send/
│   │   │       └── route.ts      ← Envía mensajes desde panel admin (modo manual)
│   │   └── index-knowledge/
│   │       └── route.ts          ← Indexa catálogo/FAQs en pgvector
│   ├── layout.tsx
│   └── page.tsx                  ← Redirect a /admin
├── lib/
│   ├── rag.ts                    ← TODO: generateRAGResponse, embedText, sendWhatsAppMessage,
│   │                                       markAsRead, alertAdmin, calculateIntentScore
│   │                                       (funciones consolidadas, no hay embeddings.ts ni whatsapp.ts)
│   └── supabase.ts               ← getSupabase() y getSupabaseAdmin() — clientes lazy (post-v3)
├── supabase/
│   └── migrations/
│       └── 001_init.sql          ← Schema completo: leads, conversations, products, faqs,
│                                    knowledge_chunks, agent_config + función search_knowledge
├── .env.example
├── .gitignore
├── CLAUDE.md                     ← Este archivo
├── GUIA_USO.md                   ← Guía operativa para Felipe
├── package.json
├── next.config.js
└── tsconfig.json
```

**IMPORTANTE — lib/:** Todo está en `rag.ts`. No existe `embeddings.ts` ni `whatsapp.ts` separados. Si Claude propone crear esos archivos, recordarle que la arquitectura consolidada es intencional.

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
- **Modelo:** `embed-multilingual-v3.0`
- **Dimensiones:** 1024 (crítico — no cambiar sin migrar)
- **InputType:** `search_document` para indexar, `search_query` para buscar

### Meta WhatsApp Business Cloud API
- **Free tier:** primeras 1000 conversaciones iniciadas por usuario por mes son gratis
- **Ventana:** 24h desde el último mensaje del cliente
- **Límite:** 4096 caracteres por mensaje

### Supabase
- **pgvector:** extensión habilitada, dimensión 1024
- **Realtime:** usado en el panel admin (postgres_changes en tabla `leads`)

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
  embedding vector(1024)
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
  modelo text,
  activo boolean            -- SIEMPRE debe haber 1 fila con activo=true
)
```

---

## §7 — Flujo del webhook (lógica principal)

```
POST /api/whatsapp/webhook
  ↓
parseWhatsAppMessage(body) → { messageId, from, name, text }
  ↓
markAsRead(messageId)
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
  ├── getSystemPrompt() → Supabase agent_config
  ├── groq.chat.completions.create(system + context + history + user)
  ├── detectar [NEEDS_HUMAN] y [READY_TO_BUY]
  ├── calculateIntentScore(userMessage, response) → 0-100
  └── guardar en conversations + actualizar lead
  ↓
sendWhatsAppMessage(from, cleanMessage)
  ↓
¿intentScore ≥ 75? → alertAdmin + estado='cotizacion'
¿needsHuman?       → alertAdmin + modo_manual=true + estado='seguimiento'
```

---

## §8 — Panel admin

### `/admin` — Dashboard de leads
- **Auth:** pantalla de login con `NEXT_PUBLIC_ADMIN_SECRET`, guardado en `sessionStorage`
- **Realtime:** suscripción postgres_changes en tabla `leads`
- **Modo manual:** toggle por lead individual
- **sendManual:** llama `POST /api/whatsapp/send` → envía WhatsApp real + guarda como `role: 'human'`
- **Notas internas:** campo por lead, no visible para el cliente

### `/admin/config` — Configuración del agente
- **REQUIERE:** al menos 1 fila en `agent_config` con `activo = true` (ver §12)
- **System prompt:** editable en vivo, sin redeploy
- **Modelo/temperatura/tokens:** ajustables sin redeploy
- **Catálogo:** toggle disponible/pausado por producto
- **FAQs:** agregar/pausar, sin redeploy
- **RAG chunks:** pegar texto de PDFs → se vectoriza con Cohere

---

## §9 — Intent score

```
Score base: 15
+12 por keyword de high intent (precio, cuánto vale, quiero comprar, cotización...)
+6  por keyword de medium intent (cómo funciona, compatible, gotero, sustrato...)
+30 si respuesta contiene [READY_TO_BUY] o mensaje menciona "cómo pago"
+15 si mensaje tiene número de 9 dígitos
+10 si mensaje tiene "plantas" + número
Máximo: 100

Threshold de alerta: score ≥ 75 → alerta WhatsApp a Felipe
```

---

## §10 — Estado de sprints

### ✅ v1 — Entregado
- Webhook WhatsApp funcional
- RAG: Groq + Cohere + pgvector
- Panel admin: leads realtime, conversaciones
- Config panel: prompt, FAQs, RAG, productos
- Sistema de alertas + intent score + modo manual

### ✅ v2 — Entregado (2026-05-04)
- `sendManual` ahora envía WhatsApp de verdad
- Login con contraseña en `/admin`
- Notas internas por lead
- Trigger `updated_at` automático

### ✅ v3 — Deployado (2026-05-04) — commit ba097d5
- **Fix crítico:** clientes Supabase lazy (resuelve `supabaseUrl is required` en Vercel)
- `export const dynamic = 'force-dynamic'` en todas las rutas API
- `getSupabase()` y `getSupabaseAdmin()` reemplazan exports directos
- Fix en `app/admin/config/page.tsx` (usaba `supabase.from()` directo)

### 🔲 v4 — Pendiente

| Feature | Prioridad | Descripción |
|---|---|---|
| Seed agent_config | 🔴 Urgente | Insertar fila inicial — sin esto /admin/config da PGRST116 |
| Upload PDF real | Alta | Subir PDF desde /admin/config → extrae texto → vectoriza |
| Plantillas WhatsApp | Alta | Templates aprobados por Meta para reactivar conversaciones >24h |
| Mensajes de voz | Media | Audio WhatsApp → Groq Whisper → texto |
| Analytics | Media | Conversion rate, tiempo de respuesta, tasa de escalación |
| Link de pago | Media | Cuando listo_comprar=true, bot manda link Flow/MercadoPago |
| Instagram DMs | Media | Meta Graph API para Instagram (fase 2) |
| TypeScript dev dep | Baja | Agregar typescript a devDependencies para habilitar npx tsc |

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
META_WHATSAPP_TOKEN=               # token permanente de System User
META_PHONE_NUMBER_ID=              # ID del número de WA conectado
WHATSAPP_BUSINESS_ACCOUNT_ID=      # ID de la cuenta Business

# Admin
ADMIN_WHATSAPP=                    # número de Felipe sin + (ej: 56912345678)
ADMIN_SECRET=                      # contraseña del panel
NEXT_PUBLIC_ADMIN_SECRET=          # mismo valor que ADMIN_SECRET

# URL pública
NEXT_PUBLIC_APP_URL=               # https://chatbotharamara.vercel.app
```

⚠️ `ADMIN_SECRET` y `NEXT_PUBLIC_ADMIN_SECRET` deben ser **idénticos**.

---

## §12 — Setup inicial / seed obligatorio

### SQL inicial para agent_config (EJECUTAR EN SUPABASE SQL EDITOR)

```sql
INSERT INTO agent_config (system_prompt, modelo, temperatura, max_tokens, activo)
VALUES (
  'Eres el asistente de ventas de Haramara Drip Indoor, tienda de sistemas de riego automático para cultivo indoor en Chile.

Tu objetivo es:
1. Entender las necesidades del cliente (cantidad de plantas, sustrato, ciclo)
2. Recomendar el kit de riego correcto basándote en el catálogo
3. Calificar si el cliente tiene intención de compra

Reglas:
- Responde siempre en español, en forma amigable y profesional
- Si el cliente quiere comprar o está listo, incluye [READY_TO_BUY] en tu respuesta
- Si no puedes ayudar, incluye [NEEDS_HUMAN] en tu respuesta
- Limita respuestas a 300 palabras máximo
- NO inventes precios ni productos que no estén en el contexto',
  'llama-3.3-70b-versatile',
  0.7,
  800,
  true
);
```

### Checklist completo de setup

- [ ] Crear proyecto Supabase
- [ ] Ejecutar `supabase/migrations/001_init.sql`
- [ ] **Ejecutar SQL seed de agent_config (arriba)**
- [ ] Crear repo en GitHub y hacer push inicial
- [ ] Crear proyecto en Vercel, agregar todas las env vars
- [ ] Configurar webhook en Meta con URL Vercel + META_VERIFY_TOKEN
- [ ] Indexar catálogo: `GET /api/index-knowledge?secret=TU_ADMIN_SECRET`
- [ ] Probar bot mandando mensaje al número WhatsApp conectado

---

## §13 — Errores comunes y soluciones

| Error | Causa | Solución |
|---|---|---|
| PGRST116 en /admin/config | agent_config vacía | Ejecutar SQL seed de §12 |
| supabaseUrl is required | Cliente Supabase eager (pre-v3) | Ya corregido en v3 — verificar que el deploy es ba097d5+ |
| Webhook retorna 403 | META_VERIFY_TOKEN no coincide | Verificar que es el mismo en Meta y en env vars |
| Bot no responde | META_WHATSAPP_TOKEN expirado | Regenerar System User token en Meta Developers |
| RAG no encuentra nada | Catálogo sin indexar | Llamar /api/index-knowledge?secret=... |
| Error dimensiones pgvector | Modelo Cohere cambiado | No cambiar el modelo — dimensiones deben ser 1024 |
| Panel: "Contraseña incorrecta" | NEXT_PUBLIC_ADMIN_SECRET no coincide | Verificar env var en Vercel y re-deploy |
| Índices ivfflat fallan | Tablas vacías | Crear índices después de indexar el catálogo |
| npx tsc: "not the tsc command" | typescript no instalado | npm install typescript --save-dev |

---

## §14 — Glosario

| Término | Significado |
|---|---|
| RAG | Retrieval-Augmented Generation |
| pgvector | Extensión PostgreSQL para búsqueda por similitud |
| Embedding | Vector de 1024 dimensiones que representa el significado de un texto |
| Intent score | Puntuación 0-100 de probabilidad de compra, keyword-based |
| Modo manual | Estado por lead donde el bot se pausa y Felipe responde |
| [NEEDS_HUMAN] | Flag en respuesta del LLM → pausa bot + alerta |
| [READY_TO_BUY] | Flag en respuesta del LLM → listo_comprar=true |
| Lazy singleton | Patrón donde el cliente se crea solo la primera vez que se usa |
| force-dynamic | Directiva Next.js que fuerza renderizado en runtime, no en build |

---

*Fin del documento — cargar completo al inicio de cada sesión de desarrollo del bot.*
