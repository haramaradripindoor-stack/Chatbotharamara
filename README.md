# 🌿 Haramara Bot — Sistema de Ventas IA

Bot de ventas para **Haramara Drip Indoor** (@haramaradripindoor) vía WhatsApp.

**Stack 100% gratuito:**
- **LLM**: Groq `llama-3.3-70b-versatile` (gratis)
- **Embeddings**: Cohere `embed-multilingual-v3.0` (gratis, español nativo)
- **BD + Vectores**: Supabase + pgvector (gratis)
- **Hosting**: Vercel (gratis)
- **Canal**: Meta WhatsApp Business Cloud API (gratis hasta 1000 conv/mes)

---

## Setup en 5 pasos

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `supabase/migrations/001_init.sql`
3. Copiar las claves desde **Settings > API**

### 2. Variables de entorno

```bash
cp .env.example .env.local
# Llenar todos los valores
```

**Claves necesarias:**
| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API |
| `SUPABASE_SERVICE_KEY` | Supabase > Settings > API (service_role) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) (gratis) |
| `COHERE_API_KEY` | [dashboard.cohere.com](https://dashboard.cohere.com) (gratis) |
| `META_VERIFY_TOKEN` | Inventarlo tú (ej: `haramara2024`) |
| `META_WHATSAPP_TOKEN` | Meta Developers > WhatsApp > Token |
| `META_PHONE_NUMBER_ID` | Meta Developers > WhatsApp > Phone numbers |
| `ADMIN_WHATSAPP` | Tu número: `56912345678` |

### 3. Deploy en Vercel

```bash
# En GitHub, push este repo
# En vercel.com: New Project > importar el repo
# Agregar todas las env vars
```

URL del deploy: `https://haramara-bot.vercel.app`

### 4. Configurar WhatsApp Business API

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear app tipo **Business**
3. Agregar producto **WhatsApp**
4. En **Webhooks**:
   - URL: `https://haramara-bot.vercel.app/api/whatsapp/webhook`
   - Verify Token: el mismo que pusiste en `META_VERIFY_TOKEN`
   - Subscribir a: `messages`
5. Generar **Token de acceso permanente** (System User con rol admin)

### 5. Indexar el catálogo

Después del deploy, llamar una vez:
```
GET https://haramara-bot.vercel.app/api/index-knowledge?secret=TU_ADMIN_SECRET
```

O desde el panel en `/admin/config` → pestaña "RAG / PDFs" → botón "Reindexar todo"

---

## Panel de administración

`/admin` — Dashboard de leads con:
- Lista de clientes con intent score en tiempo real
- Conversaciones completas
- **Tomar el timón**: activa modo manual por cliente (bot se pausa)
- Cambiar estados: consulta → cotización → seguimiento → cerrado

`/admin/config` — Configurar el agente:
- Editar system prompt sin tocar código
- Cambiar modelo Groq
- Activar/desactivar productos del catálogo
- Agregar FAQs
- Subir contenido de PDFs al RAG

---

## Lógica del bot

```
Mensaje WhatsApp entrante
        ↓
Webhook recibe → marca como leído ✓✓
        ↓
¿Lead nuevo? → crear en Supabase
        ↓
¿Modo manual activo? → no responder (Felipe está en control)
        ↓
Buscar contexto relevante (Cohere embeddings → Supabase pgvector)
        ↓
Generar respuesta (Groq llama-3.3-70b + historial + contexto)
        ↓
Calcular intent_score
        ↓
Enviar respuesta al cliente
        ↓
intent_score ≥ 75 → alerta WhatsApp a Felipe 🔥
bot dice [NEEDS_HUMAN] → pausar bot + alerta a Felipe ✋
```

---

## Agregar PDFs de protocolos

En `/admin/config` → "RAG / PDFs":
1. Pegar el texto del PDF (Athena Handbook, fichas de producto, etc.)
2. Seleccionar tipo: protocolo / catálogo / precio / instalación
3. Click "Agregar al RAG" → se vectoriza con Cohere automáticamente

El bot tendrá ese conocimiento disponible en todas las respuestas.

---

## Modelos Groq disponibles (todos gratis)

| Modelo | Uso ideal |
|---|---|
| `llama-3.3-70b-versatile` | Respuestas técnicas de calidad (recomendado) |
| `llama-3.1-8b-instant` | Ultra rápido, respuestas simples |
| `mixtral-8x7b-32768` | Contexto largo (conversaciones largas) |
| `gemma2-9b-it` | Alternativa Google |

Cambiar en `/admin/config` sin redeploy.
