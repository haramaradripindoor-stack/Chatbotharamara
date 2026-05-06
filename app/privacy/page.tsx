export const metadata = {
  title: 'Política de Privacidad — Haramara Drip Indoor',
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '60px auto', padding: '0 24px', fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidad</h1>
      <p style={{ color: '#666', marginBottom: 40 }}>Haramara Drip Indoor · Última actualización: mayo 2026</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>1. Información que recopilamos</h2>
      <p>Cuando interactúas con nuestro asistente de WhatsApp, recopilamos:</p>
      <ul>
        <li>Tu número de teléfono de WhatsApp</li>
        <li>Tu nombre de perfil de WhatsApp</li>
        <li>El contenido de los mensajes que nos envías</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>2. Cómo usamos tu información</h2>
      <p>Usamos esta información exclusivamente para:</p>
      <ul>
        <li>Responder tus consultas sobre nuestros productos de riego automático</li>
        <li>Recomendarte el sistema de riego adecuado para tus necesidades</li>
        <li>Hacer seguimiento de tu consulta de venta</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>3. Compartición de datos</h2>
      <p>No vendemos, alquilamos ni compartimos tu información personal con terceros, salvo cuando sea requerido por ley. Los mensajes son procesados por servicios de inteligencia artificial (Groq) únicamente para generar respuestas relevantes a tus consultas.</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>4. Retención de datos</h2>
      <p>Conservamos tu historial de conversación por un máximo de 12 meses. Puedes solicitar la eliminación de tus datos en cualquier momento.</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>5. Tus derechos</h2>
      <p>Tienes derecho a acceder, corregir o eliminar tus datos personales. Para ejercer estos derechos, contáctanos en <a href="mailto:haramara.dripindoor@gmail.com">haramara.dripindoor@gmail.com</a>.</p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>6. Contacto</h2>
      <p>Haramara Drip Indoor<br />Chile<br />Email: haramara.dripindoor@gmail.com<br />WhatsApp: +56 9 3286 9909</p>

      <p style={{ marginTop: 48, color: '#999', fontSize: 14 }}>Esta política puede actualizarse periódicamente. Te notificaremos de cambios significativos a través de nuestro canal de WhatsApp.</p>
    </main>
  )
}
