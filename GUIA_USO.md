# Guía de uso — Haramara Bot
> Versión: post-v3 · URL: https://chatbotharamara.vercel.app

---

## 🚀 Acceso rápido

| Qué | URL |
|---|---|
| Panel de leads | https://chatbotharamara.vercel.app/admin |
| Configuración del bot | https://chatbotharamara.vercel.app/admin/config |

---

## ⚠️ Paso obligatorio antes de usar /admin/config

La tabla `agent_config` está vacía. Entrá a **Supabase → SQL Editor** y ejecutá:

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

Después de esto, /admin/config va a cargar correctamente.

---

## 🔐 Login

1. Entrá a `/admin`
2. Ingresá la contraseña (valor de `NEXT_PUBLIC_ADMIN_SECRET` en Vercel)
3. La sesión se guarda en el navegador — no necesitás loguearte de nuevo al volver

---

## 📋 Panel de leads (/admin)

### Qué ves

- **Lista izquierda:** todos los leads ordenados por actividad reciente
- **Número verde (score):** intent score 0-100 (verde ≥70, amarillo ≥40, gris <40)
- **💰:** lead marcado como listo para comprar
- **Badge azul/naranja/violeta:** estado del lead (consulta / cotización / seguimiento)
- **Badge "manual":** el bot está pausado para ese lead

### Acciones disponibles

#### Ver conversación
Clickeá cualquier lead en la lista izquierda → ves el historial completo en tiempo real.

- 👤 = mensaje del cliente
- 🤖 = respuesta del bot
- 👨‍💼 = tu respuesta manual

#### Tomar el control manualmente
1. Clickeá el botón **"🤖 Bot activo"** → se pone **"🎮 Manual ON"** (violeta)
2. Ahora el bot no responde a ese número
3. Escribí tu mensaje en el campo de texto inferior → **Enter** o botón **Enviar**
4. El mensaje llega por WhatsApp de verdad + queda guardado en la conversación
5. Para devolver el control al bot: clickeá **"🎮 Manual ON"** de nuevo

#### Notas internas
- Campo de texto sobre el área de envío manual
- Se guardan en la base de datos, **el cliente nunca las ve**
- Útil para: "quiere 20 plantas", "tiene presupuesto de $200k", "llamar el viernes"

---

## ⚙️ Configuración del bot (/admin/config)

### Tab Agente
- Editá el **system prompt** directamente — los cambios son en vivo, sin redeploy
- Cambiá el **modelo Groq**, **temperatura** (0=preciso, 1=creativo) y **max tokens**
- Guardá con el botón 💾

### Tab Productos
- Activá/pausá productos del catálogo
- Los productos pausados **no aparecen en las respuestas del bot**
- No afecta la tienda — solo el RAG del bot

### Tab FAQs
- Agregá preguntas frecuentes con su respuesta
- El bot las usa como contexto al responder
- Podés pausar FAQs sin borrarlas

### Tab RAG
- **Agregar chunks:** pegá texto de PDFs, protocolos, fichas técnicas
  - Dale un título descriptivo (ej: "Athena Bloom — protocolo semana 4")
  - Elegí el tipo: protocolo / catálogo / faq / precio / instalación
  - Guardá → el chunk queda en la base de datos
- **Re-indexar:** después de agregar productos, FAQs o chunks, siempre clickeá ⚡ **Indexar ahora**
  - Esto vectoriza todo con Cohere para que el bot pueda buscarlo
  - Proceso tarda 10-30 segundos según la cantidad de contenido

---

## 🔔 Alertas automáticas

El bot te manda WhatsApp automáticamente cuando:

| Cuándo | Mensaje |
|---|---|
| Lead con score ≥ 75 | 🔥 "Lead caliente" + nombre + score + link al panel |
| Bot no puede responder | 🆘 "Bot necesita ayuda" + nombre + link al panel |

Las alertas llegan al número configurado en `ADMIN_WHATSAPP`.

---

## 📊 Estados de leads

| Estado | Significa |
|---|---|
| **consulta** | Lead nuevo, bot respondiendo normalmente |
| **cotizacion** | Cliente listo para comprar ([READY_TO_BUY] detectado) |
| **seguimiento** | Bot pausado, Felipe tomó el control o bot escaló |
| **cerrado** | Venta concretada (actualizar manualmente en Supabase) |
| **perdido** | Lead frío sin respuesta (actualizar manualmente) |

---

## 🛠️ Tareas de mantenimiento

### Agregar productos al catálogo
1. Entrá a Supabase → Table Editor → tabla `products`
2. Insertá una fila con: nombre, categoría, descripción, precio_desde, disponible=true
3. Volvé a /admin/config → Tab RAG → clickeá ⚡ Indexar ahora

### Actualizar el catálogo desde /admin/config
Opción más fácil: usá el Tab RAG para pegar fichas de producto como chunks de texto.
No necesitás tocar Supabase directamente.

### Re-indexar el catálogo manualmente
Si el bot no encuentra productos o FAQs:
```
GET https://chatbotharamara.vercel.app/api/index-knowledge?secret=TU_ADMIN_SECRET
```
O desde /admin/config → Tab RAG → ⚡ Indexar ahora.

---

## ❓ Problemas frecuentes

**El bot no responde a los mensajes de WhatsApp**
→ Verificar que el token de Meta no expiró (regenerar System User token)
→ Verificar que el webhook en Meta apunta a `/api/whatsapp/webhook`

**/admin/config da error (PGRST116)**
→ Ejecutar el SQL de seed de agent_config (arriba en esta guía)

**El bot inventa precios o productos**
→ El catálogo no está indexado. Clickeá ⚡ Indexar ahora en /admin/config → Tab RAG

**Las respuestas del bot son muy largas/cortas**
→ Ajustar max_tokens en /admin/config → Tab Agente

**Quiero cambiar el tono del bot**
→ Editar el system prompt en /admin/config → Tab Agente → Guardar

---

*Última actualización: 2026-05-04 · Para cambios de código, seguir el workflow en CLAUDE.md §3*
