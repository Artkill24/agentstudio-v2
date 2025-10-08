import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { querySchema, ValidationError } from '@/lib/validation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
    "X-Title": "AgentStudio"
  }
})

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Rate limiting
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

    // Parse and validate input
    const { query } = await request.json()

    // Validation with Zod schema
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

    // Check usage limits with limitsEnforcer
    const limitCheck = await limitsEnforcer.checkResearchLimit(user.id)

    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: limitCheck.error,
        remaining: 0 
      }, { status: 429 })
    }

    // Get subscription info for team_id
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    // Generate research with DeepSeek
    const prompt = `Sei un assistente di ricerca per studi professionali italiani (avvocati, commercialisti, consulenti).

Query dell'utente: "${query}"

Compito:
1. Analizza la query di ricerca
2. Fornisci informazioni rilevanti e accurate
3. Organizza la risposta in modo chiaro e strutturato
4. Evidenzia punti chiave per professionisti
5. Se rilevante, menziona normative o riferimenti legali italiani
6. Usa linguaggio professionale ma comprensibile

Fornisci una risposta completa, accurata e professionale in italiano.`

    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const synthesis = completion.choices[0]?.message?.content

    if (!synthesis) {
      throw new Error('Nessuna risposta generata dal modello')
    }

    // Save to database
    const { error: insertError } = await supabase
      .from('research_history')
      .insert({
        user_id: user.id,
        team_id: subscription?.team_id || null,
        query: query.trim(),
        results: { synthesis },
        metadata: { 
          timestamp: new Date().toISOString(),
          model:  "google/gemini-2.0-flash-exp:free"
        }
      })

    if (insertError) {
      console.error('Error saving research history:', insertError)
      // Don't fail the request if we can't save history
    }

    return NextResponse.json({ 
      results: synthesis,
      sources: [],
      remaining: limitCheck.remaining
    })

  } catch (error) {
    console.error('Research error:', error)

    // Handle OpenRouter specific errors
    if (error instanceof OpenAI.APIError) {
      console.error('OpenRouter API error:', {
        status: error.status,
        message: error.message,
        type: error.type
      })

      if (error.status === 429) {
        return NextResponse.json({ 
          error: 'Troppo richieste al servizio AI. Riprova tra qualche secondo.' 
        }, { status: 429 })
      }

      if (error.status === 401 || error.status === 403) {
        return NextResponse.json({ 
          error: 'Errore di autenticazione con il servizio AI' 
        }, { status: 503 })
      }

      return NextResponse.json({ 
        error: 'Servizio AI temporaneamente non disponibile' 
      }, { status: 503 })
    }

    // Generic error
    return NextResponse.json({ 
      error: 'Errore ricerca' 
    }, { status: 500 })
  }
}