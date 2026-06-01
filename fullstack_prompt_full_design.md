# 🌿 Haramara Bot — Fullstack Prompt & Design Architecture

Este documento consolida la arquitectura fullstack, el diseño de interfaces (UI/UX) y la ingeniería de prompts para el bot de ventas de **Haramara Drip Indoor**.

---

## 🤖 1. El System Prompt Definitivo (Ingeniería de Prompts)

El siguiente es el **System Prompt optimizado** para exprimir al máximo `llama-3.3-70b-versatile` en Groq. Está diseñado para actuar como un vendedor experto, utilizando un tono amigable, persuasivo y resolutivo.

**Instrucción para actualizar en Supabase (`agent_config`):**
```text
Eres el experto asesor de ventas de Haramara Drip Indoor, la tienda líder en sistemas de riego automático para cultivo indoor en Chile.

Tu objetivo principal es cerrar ventas y asesorar al cliente de manera precisa:
1. Entender sus necesidades exactas (cantidad de plantas, tipo de sustrato, tamaño de la carpa).
2. Recomendar el kit de riego o producto ideal basándote ÚNICAMENTE en tu conocimiento y el catálogo.
3. Identificar rápidamente si el cliente tiene intención de compra real.

Reglas Críticas de Comportamiento:
- Tono: Amigable, profesional, al grano y sutilmente persuasivo (ej. "Te recomiendo el Kit de 4 macetas porque te ahorrará mucho tiempo de riego").
- Lenguaje: Español neutral/chileno (evita el voseo argentino como "tenés" o "podés", usa "tienes" o "puedes").
- Brevedad: Respuestas cortas, máximo 2 o 3 párrafos cortos (WhatsApp es un canal rápido). No uses bullet points excesivos a menos que sea estrictamente necesario.
- Precios: Solo entrega precios si los tienes en el contexto proporcionado. NUNCA inventes productos ni precios.
- Compra: Si el cliente muestra una intención clara de compra (pregunta por pago, despacho, stock), incluye OBLIGATORIAMENTE el tag [READY_TO_BUY] en cualquier parte de tu respuesta.
- Derivación: Si te hacen una pregunta técnica compleja que no puedes resolver con tu contexto, o si el cliente está molesto, incluye el tag [NEEDS_HUMAN].
```

---

## 🏗️ 2. Arquitectura Fullstack (End-to-End)

El ecosistema está construido 100% sobre tecnologías Serverless de alta velocidad y cero costo inicial.

### Stack Tecnológico
- **Frontend / Backend:** Next.js 14 (App Router) alojado en **Vercel**.
- **Canal de Comunicación:** Meta WhatsApp Business Cloud API.
- **Base de Datos & Vectores:** **Supabase** (PostgreSQL) con la extensión `pgvector`.
- **Motor de IA (LLM):** **Groq** (`llama-3.3-70b-versatile`) para inferencia ultra-rápida (128k contexto).
- **Motor de Embeddings (RAG):** **Cohere** (`embed-multilingual-v3.0` a 1024 dimensiones) para indexar catálogo y FAQs.

### Workflow del Dato (El Embudo del Webhook)
1. **Ingreso:** Cliente envía mensaje a WhatsApp.
2. **Webhook Meta (`POST /api/whatsapp/webhook`):** Vercel recibe el payload, extrae teléfono y texto. Se marca como "leído" de inmediato.
3. **Gestión de Leads (`wa_leads`):** Si no existe, se crea el lead. Si está en `modo_manual = true`, el bot aborta y no responde.
4. **Vectorización (Cohere):** Se genera el embedding del mensaje del usuario.
5. **Búsqueda Semántica (pgvector):** La función RPC `search_knowledge` busca match en `products`, `faqs`, y `knowledge_chunks` (threshold > 0.6).
6. **Inferencia (Groq):** Se ensambla el Contexto RAG + Historial de Conversación (últimos 8 mensajes) + System Prompt y se consulta a Llama 3.3.
7. **Reglas de Negocio (Intent Score):**
   - El código TypeScript analiza *keywords* en la respuesta y en la pregunta (ej. "comprar", "transferencia") para sumar puntos al `intent_score`.
   - Si Groq emite `[READY_TO_BUY]`, suma 30 puntos e incrementa el estado a `cotizacion`.
   - Si emite `[NEEDS_HUMAN]`, pasa a modo manual.
8. **Envío y Alertas:** Groq responde al cliente. Si el lead supera los **75 puntos**, se dispara una alerta de WhatsApp al celular del administrador (Felipe).

---

## 🎨 3. Diseño de Interfaz (UI/UX) - Panel de Administración

El Dashboard (ubicado en `/admin`) está diseñado bajo el concepto de **Dark Modern Glassmorphism**, ideal para herramientas internas de alto uso.

### Paleta de Colores
- **Fondo Base:** `#1a1a1a` (Negro asfalto, reduce fatiga visual).
- **Acentos Primarios:** Verde Haramara `#16a34a` (Para botones de acción principal, indicadores de éxito).
- **Acentos Secundarios:** Morado vibrante `#7c3aed` (Para destacar cuando el bot está pausado/modo manual).
- **Estados de Lead (Badges):**
  - Consulta: Azul (`#3b82f6`)
  - Cotización: Naranja (`#f97316`)
  - Seguimiento: Morado (`#a855f7`)
  - Cerrado: Verde (`#22c55e`)
  - Perdido: Gris (`#6b7280`)

### Micro-interacciones y Flujo
- **Sidebar de Leads (Izquierda):**
  - Lista reactiva en tiempo real (Supabase Realtime).
  - Cada tarjeta de lead muestra su puntaje de intención (`intent_score`). El puntaje es verde vibrante si es >70, amarillo >40, gris el resto.
  - Indicador visual `💰` si el usuario está `listo_comprar = true`.
- **Chat Central (Derecha):**
  - Burbujas de chat estilo iMessage/WhatsApp en modo oscuro.
  - Bot (`🤖`) en verde petróleo oscuro (`#1a2e1a`).
  - Humano/Admin (`👨‍💼`) en morado profundo (`#3b1f7c`).
  - Cliente (`👤`) en gris pizarra (`#1f2937`).
- **Botón de Control Manual ("Toggle"):**
  - Ubicado en la cabecera. Es el "Interruptor de Emergencia".
  - Estado Bot: Gris (`#374151`) con emoji `🤖`.
  - Estado Manual: Morado (`#7c3aed`) con emoji `🎮`.
  - Al cambiarlo a Manual, se despliega instantáneamente la barra inferior para escribir (usando el endpoint `/api/whatsapp/send`).

---

## 🚀 4. Sprints de Mejora Continua (Next Steps)

Para llevar esta arquitectura al siguiente nivel, se recomienda:
1. **Indexación Dinámica de PDFs:** Integrar subida directa de fichas técnicas en `/admin/config` extrayendo el texto y subiéndolo directo a `knowledge_chunks`.
2. **Auto-Checkout:** Cuando un lead llegue a estado `cotizacion` y `ready_to_buy`, generar un link de pago único y enviarlo adjunto a la respuesta de Groq.
3. **Groq Whisper:** Procesamiento de audios de WhatsApp pasando la nota de voz por Whisper antes del Pipeline RAG.
