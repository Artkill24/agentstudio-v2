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

    const { documentType, details } = await request.json()

    if (!documentType || !details) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    // Check limits (stesso codice di prima)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, team_id')
      .eq('user_id', user.id)
      .single()

    const planLimits: Record<string, number> = {
      starter: 50, professional: -1, enterprise: -1, free: 5
    }

    const plan = subscription?.plan_name || 'free'
    const limit = planLimits[plan]

    if (limit > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count } = await supabase
        .from('generated_documents')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (count && count >= limit) {
        return NextResponse.json({ 
          error: `Limite raggiunto (${limit} documenti/mese)` 
        }, { status: 429 })
      }
    }

    const prompt = buildDocumentPrompt(documentType, details)
    
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: [{ role: "user", content: prompt }]
    })

    const documentText = completion.choices[0]?.message?.content || 'Errore generazione'

    await supabase
      .from('generated_documents')
      .insert({
        user_id: user.id,
        team_id: subscription?.team_id,
        document_type: documentType,
        content: documentText,
        metadata: { details }
      })

    return NextResponse.json({ document: documentText })

  } catch (error) {
    console.error('Document error:', error)
    return NextResponse.json({ error: 'Errore generazione' }, { status: 500 })
  }
}

function buildDocumentPrompt(type: string, details: any): string {
  const base = `Sei un assistente legale italiano. Genera un documento professionale.`
  
  const prompts: Record<string, string> = {
    contratto: `${base}\n\nContratto:\n- Parti: ${details.parties}\n- Oggetto: ${details.subject}\n- Corrispettivo: ${details.payment}\n\nIncludi: intestazione, premesse, obblighi, durata, pagamento, recesso, foro competente, GDPR, firme.`,
    lettera: `${base}\n\nLettera formale:\n- Destinatario: ${details.recipient}\n- Oggetto: ${details.subject}\n- Contenuto: ${details.content}`,
    default: `${base}\n\nDocumento "${type}":\n${JSON.stringify(details, null, 2)}`
  }
  
  return prompts[type] || prompts.default
}