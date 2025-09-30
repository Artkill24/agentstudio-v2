import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

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
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query mancante' }, { status: 400 })
    }

    // Check usage limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, team_id')
      .eq('user_id', user.id)
      .single()

    const planLimits: Record<string, number> = {
      starter: 20,
      professional: -1,
      enterprise: -1,
      free: 3
    }

    const plan = subscription?.plan_name || 'free'
    const limit = planLimits[plan]

    if (limit > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count } = await supabase
        .from('research_history')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (count && count >= limit) {
        return NextResponse.json({ 
          error: `Limite mensile raggiunto (${limit} ricerche). Effettua l'upgrade.` 
        }, { status: 429 })
      }
    }

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
      ]
    })

    const synthesis = completion.choices[0]?.message?.content || 'Errore nella ricerca'

    // Save to database
    await supabase
      .from('research_history')
      .insert({
        user_id: user.id,
        team_id: subscription?.team_id,
        query: query,
        results: { synthesis },
        metadata: { timestamp: new Date().toISOString() }
      })

    return NextResponse.json({ 
      results: synthesis,
      sources: []
    })

  } catch (error) {
    console.error('Research error:', error)
    return NextResponse.json({ 
      error: 'Errore nella ricerca' 
    }, { status: 500 })
  }
}