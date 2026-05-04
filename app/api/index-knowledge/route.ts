import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { embedText } from '@/lib/rag'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { products: 0, faqs: 0, chunks: 0, errors: [] as string[] }

  // ─── Indexar productos ────────────────────────────────────────────────────
  try {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, nombre, categoria, descripcion, componentes, uso_ideal, precio_desde')
      .eq('disponible', true)

    for (const product of products || []) {
      const text = [
        `Producto: ${product.nombre}`,
        `Categoría: ${product.categoria}`,
        `Descripción: ${product.descripcion}`,
        product.componentes ? `Componentes: ${product.componentes}` : '',
        product.uso_ideal ? `Ideal para: ${product.uso_ideal}` : '',
        product.precio_desde ? `Precio desde: $${product.precio_desde.toLocaleString('es-CL')} CLP` : ''
      ].filter(Boolean).join('\n')

      const embedding = await embedText(text, 'search_document')

      await supabaseAdmin
        .from('products')
        .update({ embedding })
        .eq('id', product.id)

      results.products++
    }
  } catch (err) {
    results.errors.push(`products: ${err}`)
  }

  // ─── Indexar FAQs ─────────────────────────────────────────────────────────
  try {
    const { data: faqs } = await supabaseAdmin
      .from('faqs')
      .select('id, pregunta, respuesta')
      .eq('activo', true)

    for (const faq of faqs || []) {
      const text = `Pregunta: ${faq.pregunta}\nRespuesta: ${faq.respuesta}`
      const embedding = await embedText(text, 'search_document')

      await supabaseAdmin
        .from('faqs')
        .update({ embedding })
        .eq('id', faq.id)

      results.faqs++
    }
  } catch (err) {
    results.errors.push(`faqs: ${err}`)
  }

  // ─── Indexar knowledge chunks ─────────────────────────────────────────────
  try {
    const { data: chunks } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, titulo, tipo, content')

    for (const chunk of chunks || []) {
      const text = `${chunk.titulo}\n${chunk.content}`
      const embedding = await embedText(text, 'search_document')

      await supabaseAdmin
        .from('knowledge_chunks')
        .update({ embedding })
        .eq('id', chunk.id)

      results.chunks++
    }
  } catch (err) {
    results.errors.push(`chunks: ${err}`)
  }

  return NextResponse.json({
    ok: true,
    indexed: results,
    message: `Indexados: ${results.products} productos, ${results.faqs} FAQs, ${results.chunks} chunks`
  })
}
