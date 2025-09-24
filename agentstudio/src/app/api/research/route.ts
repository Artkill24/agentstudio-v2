import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ResearchAgent } from '@/lib/researchAgent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Research request:', body)

    // Auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
    }

    // Perform research
    const agent = new ResearchAgent()
    const results = await agent.research(body, profile)

    // Save to history
    const { error: saveError } = await supabase
      .from('research_history')
      .insert({
        user_id: user.id,
        query: body.query,
        category: body.category,
        results: results.results,
        metadata: { jurisdiction: body.jurisdiction }
      })

    if (saveError) {
      console.error('Save error:', saveError)
    }

    return NextResponse.json({ 
      success: true,
      results: results
    })
    
  } catch (error) {
    console.error('Research error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Get research history
    const { data: history } = await supabase
      .from('research_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ history })
    
  } catch (error) {
    console.error('History error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}