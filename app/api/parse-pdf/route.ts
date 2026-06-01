import { NextRequest, NextResponse } from 'next/server'
const pdf = require('pdf-parse')

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const secret = formData.get('secret') as string

    if (secret !== process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const data = await pdf(buffer)
    
    return NextResponse.json({ text: data.text })
  } catch (error: any) {
    console.error('Error parsing PDF:', error)
    return NextResponse.json({ error: 'Error al parsear el PDF', details: error.message }, { status: 500 })
  }
}
