import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DocumentAgent } from '@/lib/documentAgent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Document generation request:', body)

    // Get user from auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
    }

    // Generate document
    const agent = new DocumentAgent()
    const document = await agent.generateDocument(body, profile)

    // Save to database
    const { error: saveError } = await supabase
      .from('generated_documents')
      .insert({
        user_id: user.id,
        document_type: body.type,
        title: document.title,
        content: document.content,
        client_name: body.clientName,
        client_email: body.clientEmail || null,
        amount: body.amount || null,
        metadata: body
      })

    if (saveError) {
      console.error('Save error:', saveError)
    }

    return NextResponse.json({ 
      success: true,
      document: document
    })
    
  } catch (error) {
    console.error('Document generation error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}