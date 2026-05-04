import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Haramara Bot — Panel Admin',
  description: 'Panel de gestión de leads y configuración del bot de ventas'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f0f0f', color: '#e5e5e5' }}>
        {children}
      </body>
    </html>
  )
}
