# 🌿 Haramara Bot — WhatsApp Sales AI

Bot de ventas IA para **Haramara Drip Indoor** vía WhatsApp Business.

**Stack 100% gratuito:**

| Pieza | Herramienta | Costo |
|---|---|---|
| LLM | Groq `llama-3.3-70b-versatile` | Gratis |
| Embeddings RAG | Cohere `embed-multilingual-v3.0` | Gratis |
| BD + vectores | Supabase + pgvector | Gratis |
| Hosting | Vercel | Gratis |
| Canal WhatsApp | Meta Business Cloud API | Gratis hasta 1000 conv/mes |

---

## Cómo funciona

```
Cliente WhatsApp → Webhook Vercel → Groq (contexto del catálogo PDF)
                                          ↓
                                   ¿Puede cerrar solo?
                                  /                    \
                                Sí                     No
                                 ↓                      ↓
                          Responde + guarda       🔥 Alerta a Felipe
                          lead en Supabase        ✋ Pausa el bot
```

---

## Setup en 5 pasos

### Paso 1 — Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. **SQL Editor** → ejecutar `supabase/migrations/001_init.sql`
3. **Settings > API** → copiar las 3 claves

### Paso 2 — Variables de entorno
```bash
cp .env.example .env.local
# Llenar todos los valores
```

| Variable | Dónde conseguirla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API |
| `SUPABASE_SERVICE_KEY` | Supabase > Settings > API (service_role) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `COHERE_API_KEY` | [dashboard.cohere.com](https://dashboard.cohere.com) |
| `META_VERIFY_TOKEN` | Invéntalo (ej: `haramara2025`) |
| `META_WHATSAPP_TOKEN` | Meta Developers > System User Token |
| `META_PHONE_NUMBER_ID` | Meta Developers > WhatsApp > Phone numbers |
| `ADMIN_WHATSAPP` | Tu número: `56912345678` |
| `ADMIN_SECRET` | Contraseña del panel (invéntala) |
| `NEXT_PUBLIC_ADMIN_SECRET` | La misma contraseña |
| `NEXT_PUBLIC_APP_URL` | URL de Vercel (ej: `https://haramara-bot.vercel.app`) |

### Paso 3 — Deploy Vercel
```bash
git add . && git commit -m "init" && git push
```
En vercel.com: New Project → importar repo → agregar env vars → Deploy.

### Paso 4 — WhatsApp Business API (Meta)
1. [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Agregar producto **WhatsApp**
3. **Webhooks**:
   - URL: `https://haramara-bot.vercel.app/api/whatsapp/webhook`
   - Verify Token: el mismo de `META_VERIFY_TOKEN`
   - Subscribir a: `messages`
4. **System Users** → crear usuario admin → generar token con `whatsapp_business_messaging`

### Paso 5 — Indexar catálogo (una vez post-deploy)
```
GET https://haramara-bot.vercel.app/api/index-knowledge?secret=TU_ADMIN_SECRET
```
O desde `/admin/config` → RAG / PDFs → "Reindexar todo".

---

## Panel `/admin`
- Leads en tiempo real con intent score
- **✋ MANUAL / 🤖 BOT**: pausa el bot por cliente individual
- Responder desde el panel → **se envía por WhatsApp de verdad**
- Notas internas por lead
- Cambiar estados: Consulta → Cotización → Seguimiento → Cerrado

## Panel `/admin/config`
- Editar system prompt sin tocar código
- Cambiar modelo Groq en vivo
- Activar/desactivar productos
- Agregar FAQs
- Subir texto de PDFs al RAG (Athena Handbook, fichas, etc.)

## Agregar PDFs al bot
1. Copia el texto del PDF
2. `/admin/config` → RAG / PDFs → pegar texto → tipo → "Agregar al RAG"
3. Cohere lo vectoriza automáticamente → el bot lo usa desde ya

## Alertas automáticas
- **🔥 Score ≥ 75**: lead caliente → WhatsApp a ti + estado "Cotización"
- **✋ [NEEDS_HUMAN]**: bot no puede manejar → pausa automática + alerta

## Desarrollo local
```bash
npm install && npm run dev
```
Para probar webhook local: usa [ngrok](https://ngrok.com) → `ngrok http 3000`.
