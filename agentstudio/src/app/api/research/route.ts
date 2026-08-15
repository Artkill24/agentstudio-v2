import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { querySchema, ValidationError } from '@/lib/validation'
import { ResearchAgent } from '@/lib/researchAgent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
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

    const rateLimit = await rateLimiter.check(
      `research:${user.id}`,
      RATE_LIMITS.research.maxRequests,
      RATE_LIMITS.research.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Troppe ricerche. Riprova tra ${Math.ceil(rateLimit.resetIn / 60000)} minuti.`,
          resetIn: rateLimit.resetIn
        },
        { status: 429 }
      )
    }

    const { query, category } = await request.json()

    try {
      querySchema.parse(query)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({
          error: 'Query non valida',
          details: error.message
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Query non valida' }, { status: 400 })
    }

    const limitCheck = await limitsEnforcer.checkResearchLimit(user.id)

    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: limitCheck.error,
        remaining: 0
      }, { status: 429 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('studio_name, studio_type, practice_areas, location')
      .eq('user_id', user.id)
      .single()

    const studioProfile = {
      studio_name: profile?.studio_name || 'Studio Professionale',
      studio_type: profile?.studio_type || 'Studio Legale',
      practice_areas: profile?.practice_areas || ['Diritto civile'],
      location: profile?.location || 'Italia'
    }

    const validCategories = ['jurisprudence', 'regulations', 'precedents', 'general'] as const
    const researchCategory = validCategories.includes(category)
      ? category
      : 'general'

    const agent = new ResearchAgent()
    const research = await agent.research(
      {
        query: query.trim(),
        category: researchCategory,
      },
      studioProfile
    )

    if (!research.results) {
      throw new Error('Nessuna risposta generata dal modello')
    }

    const { error: insertError } = await supabase
      .from('research_history')
      .insert({
        user_id: user.id,
        team_id: subscription?.team_id || null,
        query: query.trim(),
        results: { synthesis: research.results, sources: research.sources },
        metadata: {
          timestamp: research.timestamp,
          provider: 'tavily+groq',
          grounded: true,
          category: researchCategory
        }
      })

    if (insertError) {
      console.error('Error saving research history:', insertError)
    }

    return NextResponse.json({
      results: research.results,
      sources: research.sources,
      remaining: limitCheck.remaining
    })

  } catch (error) {
    console.error('Research error:', error)

    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate')) {
      return NextResponse.json({
        error: 'Troppe richieste al servizio di ricerca. Riprova tra qualche secondo.'
      }, { status: 429 })
    }

    if (message.includes('TAVILY_API_KEY')) {
      return NextResponse.json({
        error: 'Servizio di ricerca non configurato. Contatta il supporto.'
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Errore durante la ricerca. Riprova.'
    }, { status: 500 })
  }
}
