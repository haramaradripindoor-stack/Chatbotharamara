# CLAUDE.md — Haramara Bot · Contexto completo para IA
> Última actualización: 2026-05-05
> Versión: 1.5 — Bot LIVE · WhatsApp operativo · Fase 1 Supabase unificado · Productos reales
> Leer completo antes de responder cualquier pregunta de código o arquitectura.

---

## §0 — Visión de negocio (LEER PRIMERO)

**Haramara Drip Indoor** — tienda de sistemas de riego automático para cultivo indoor en Chile (Felipe Vivanco).

El bot es el canal de ventas WhatsApp que reemplaza ManyChat. **No cierra ventas solo** — califica leads, recomienda kits, alerta a Felipe cuando un lead está caliente.

### Stack completo del negocio

| Proyecto | Repo | URL | Supabase |
|---|---|---|---|
| **Admin app** | `Fvivancorne/Administraci-nharamaradrip` | haramaradrip.vercel.app | `llezwblpafarckhvtbdm` |
| **Bot WhatsApp** | `haramaradripindoor-stack/Chatbotharamara` | chatbotharamara.vercel.app | `llezwblpafarckhvtbdm` (mismo — post Fase 1) |

**Fase 1 completada:** ambas apps comparten el mismo Supabase. Las tablas del bot usan prefijo `wa_` para no chocar con las de admin.

---

## §1 — Stack técnico

```
Canal:       Meta WhatsApp Business Cloud API
LLM:         Groq llama-3.3-70b-versatile
Embeddings:  Cohere embed-multilingual-v3.0 (1024 dims)
Base datos:  Supabase llezwblpafarckhvtbdm (compartido con admin app)
Hosting:     Vercel (chatbotharamara.vercel.app)
Framework:   Next.js 14 (App Router) + TypeScript
```

**Número WhatsApp:** +56 9 8281 1295 (migrado a WhatsApp Business)
**Webhook Meta:** verificado ✅ · campo `messages` suscrito ✅

---

## §2 — Reglas absolutas

1. Nunca código inline — siempre patch `.mjs`
2. Nunca cambiar system prompt sin confirmar con Felipe
3. `ADMIN_SECRET` === `NEXT_PUBLIC_ADMIN_SECRET` — deben ser idénticos
4. Solo modelos Groq de §5
5. Webhook siempre responde 200 OK aunque falle internamente
6. Cohere = 1024 dims. No cambiar modelo sin migrar columnas
7. `modo_manual = true` → bot pausado solo para ese número
8. Índices ivfflat se crean DESPUÉS de indexar, no antes
9. Service key nunca al cliente
10. `intent_score` es keyword-based en `lib/rag.ts`, no IA
11. Tabla `agent_config` siempre con ≥1 fila `activo = true`
12. Clientes Supabase son lazy singletons — usar `getSupabase()` / `getSupabaseAdmin()`
13. Tablas del bot usan prefijo `wa_` en el Supabase compartido (`wa_leads`, `wa_products`)

---

## §3 — Workflow de desarrollo

### Bot (Chatbotharamara)
```
Ruta local: C:\Users\FELIP\Documents\GitHub\Chatbotharamara

1. Claude genera patch-bot-vN-descripcion.mjs
2. node "C:\Users\FELIP\Downloads\patch-bot-vN-descripcion.mjs"
3. npx tsc --noEmit   (requiere: npm install typescript --save-dev)
4. Si verde → git add -A → git commit → git push
5. Vercel auto-deploya
```

### Admin (Administraci-nharamaradrip)
```
Ruta local: C:\Users\FELIP\Documents\GitHub\Administraci-nharamaradrip

1. Claude genera patch-admin-sprintN-descripcion.mjs
2. node "C:\Users\FELIP\Downloads\patch-admin-sprintN-descripcion.mjs"
3. git add -A → git commit → git push
```

**Reglas:** patch siempre idempotente · nunca commit si tsc falla · SQL en archivo separado

---

## §4 — Estructura de archivos (real post-v3)

```
Chatbotharamara/
├── app/
│   ├── admin/
│   │   ├── page.tsx              ← Panel leads (auth + realtime + modo manual)
│   │   └── config/page.tsx       ← Config: prompt, FAQs, RAG chunks, productos
│   ├── api/
│   │   ├── whatsapp/webhook/route.ts  ← Recibe mensajes Meta
│   │   ├── whatsapp/send/route.ts     ← Envía desde panel (modo manual)
│   │   └── index-knowledge/route.ts  ← Vectoriza catálogo con Cohere
│   ├── layout.tsx
│   └── page.tsx                  ← Redirect a /admin
├── lib/
│   ├── rag.ts                    ← generateRAGResponse, embedText, sendWhatsApp, alertAdmin, intentScore
│   └── supabase.ts               ← getSupabase() + getSupabaseAdmin() — lazy singletons
├── supabase/migrations/001_init.sql  ← Schema original (Supabase B — ya no se usa)
├── CLAUDE.md
├── GUIA_USO.md
└── package.json
```

**IMPORTANTE:** Todo está en `lib/rag.ts`. No existe `embeddings.ts` ni `whatsapp.ts`.

---

## §5 — Modelos Groq válidos

| Modelo | Contexto | Uso |
|---|---|---|
| `llama-3.3-70b-versatile` | 128k | **ACTIVO — respuestas técnicas** |
| `llama-3.1-8b-instant` | 128k | Respuestas simples |
| `mixtral-8x7b-32768` | 32k | Conversaciones largas |
| `gemma2-9b-it` | 8k | Alternativa |

---

## §6 — Schema de base de datos (Supabase llezwblpafarckhvtbdm)

### Tablas del BOT (prefijo wa_)
```sql
wa_leads        → leads WhatsApp (intent_score, modo_manual, listo_comprar)
conversations   → historial mensajes (role: user/assistant/human)
wa_products     → catálogo del bot con embeddings
faqs            → preguntas frecuentes con embeddings
knowledge_chunks → chunks RAG (PDFs, protocolos)
agent_config    → system prompt editable, modelo, temperatura
```

### Tablas de ADMIN (no tocar desde el bot)
```sql
cotizaciones · insumos · inventario · clientes · leads (vitrina) · plantillas_sistema
```

---

## §7 — Productos reales (cargados en wa_products)

| Producto | Precio | Estado |
|---|---|---|
| Kit Haramara 4 Macetas | $119.000 | ✅ activo |
| Kit Haramara 16 Macetas | $159.000 | ✅ activo |
| App Pro Haramara | $4.990/mes | ✅ activo |
| Sensor WiFi Ambiente VPD | $39.900 | ✅ activo |
| Consola Hub 4 Dispositivos | $79.900 | ✅ activo |

**Costos reales:** Kit 4p = $78.056 · Kit 16p = $87.126
**Sensor VPD:** $22.134 (AliExpress) · **Hub:** $43.674 (AliExpress)

---

## §8 — Flujo del webhook

```
POST /api/whatsapp/webhook
  ↓ parseWhatsAppMessage → markAsRead
  ↓ buscar/crear wa_lead
  ↓ ¿modo_manual? → SÍ: guardar y salir
  ↓ generateRAGResponse (Cohere embed → pgvector → Groq)
  ↓ sendWhatsAppMessage
  ↓ ¿score ≥ 75? → alertAdmin · ¿needsHuman? → modo_manual=true
```

---

## §9 — Estado de sprints

### ✅ Bot completado
- **v1** — Webhook + RAG + panel admin + config + alertas + intent score + modo manual
- **v2** — sendManual real + login con contraseña + notas internas + trigger updated_at
- **v3** — Fix crítico Supabase lazy (resuelve build Vercel) — commit ba097d5
- **v3b** — Fix config page getSupabase()
- **v3c** — CLAUDE.md v1.3 + GUIA_USO.md
- **Fase 1** — Bot migrado a Supabase compartido con admin (llezwblpafarckhvtbdm)

### 🔲 Bot pendiente (v4+)

| Feature | Prioridad |
|---|---|
| Indexar catálogo real (⚡ desde /admin/config → RAG) | 🔴 Urgente |
| Upload PDF desde /admin/config | Alta |
| Plantillas WhatsApp Meta aprobadas | Alta |
| Link de pago cuando listo_comprar=true | Media |
| Mensajes de voz (Groq Whisper) | Media |
| Analytics: conversion rate, tiempo respuesta | Media |
| Instagram DMs (fase 2) | Baja |
| typescript en devDependencies (habilita npx tsc) | Baja |

### 🔲 Integración con admin (Fase 2)
- Mover bot como módulo `/whatsapp` dentro de la admin app
- Lead caliente WhatsApp → 1 click crea cotización en admin
- Un solo Vercel, un solo login

---

## §10 — Variables de entorno (Vercel chatbotharamara)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://llezwblpafarckhvtbdm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...          # NUNCA compartir en el chat
GROQ_API_KEY=...
COHERE_API_KEY=...
META_VERIFY_TOKEN=haramara_webhook_2026
META_WHATSAPP_TOKEN=...
META_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
ADMIN_WHATSAPP=56982811295
ADMIN_SECRET=...
NEXT_PUBLIC_ADMIN_SECRET=...      # mismo valor que ADMIN_SECRET
NEXT_PUBLIC_APP_URL=https://chatbotharamara.vercel.app
```

---

## §11 — Errores comunes

| Error | Causa | Solución |
|---|---|---|
| PGRST116 en /admin/config | agent_config vacía | INSERT en Supabase (ver GUIA_USO.md) |
| supabaseUrl is required | Cliente eager (pre-v3) | Ya corregido en v3 |
| Webhook 403 en browser | Normal — sin hub params | OK, Meta lo llama con params |
| Bot no responde | Token Meta expirado | Regenerar System User token |
| RAG no encuentra nada | Catálogo no indexado | ⚡ Indexar ahora en /admin/config |
| Login incorrecto | NEXT_PUBLIC_ADMIN_SECRET falta | Agregar en Vercel env vars |
| npx tsc falla | typescript no instalado | npm install typescript --save-dev |

---

*Cargar completo al inicio de cada sesión de desarrollo.*
