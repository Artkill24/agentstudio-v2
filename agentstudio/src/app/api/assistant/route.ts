import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { ResearchAgent } from '@/lib/researchAgent'
import { DocumentAgent } from '@/lib/documentAgent'
import { freeChatWithTools } from '@/lib/free-llm-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_TOOL_TURNS = 5

// ---------- Tool declarations (formato OpenAI, compatibile Groq/Cerebras) ----------

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'legal_research',
      description:
        'Esegue una ricerca giuridica o normativa aggiornata con fonti web reali. Usalo per domande su leggi, sentenze, normative, adempimenti, scadenze fiscali o qualsiasi informazione che richiede dati verificati e aggiornati.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'La domanda di ricerca' },
          category: {
            type: 'string',
            enum: ['jurisprudence', 'regulations', 'precedents', 'general'],
            description: 'Categoria della ricerca',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_document',
      description:
        "Genera un documento professionale completo (contratto, lettera formale o informativa privacy GDPR). Usalo quando l'utente chiede di creare, scrivere o preparare un documento.",
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['contract', 'letter', 'privacy'],
            description: 'Tipo di documento',
          },
          clientName: { type: 'string', description: 'Nome del cliente o destinatario' },
          description: { type: 'string', description: 'Descrizione del servizio o contenuto' },
          amount: { type: 'string', description: 'Importo in euro (solo numero), se rilevante' },
          subject: { type: 'string', description: 'Oggetto (per lettere)' },
        },
        required: ['type', 'clientName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_invoice',
      description:
        "Genera una fattura professionale conforme alla normativa italiana con IVA e ritenuta. Usalo quando l'utente chiede una fattura.",
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Nome del cliente' },
          description: { type: 'string', description: 'Descrizione della prestazione' },
          amount: { type: 'string', description: 'Importo imponibile in euro (solo numero)' },
        },
        required: ['clientName', 'amount'],
      },
    },
  },
]

// ---------- Types ----------

interface StudioProfile {
  studio_name: string
  studio_type: string
  practice_areas: string[]
  location: string
}

interface AssistantAction {
  tool: string
  summary: string
  document?: { title: string; content: string; type: string }
  sources?: Array<{ title?: string; url: string }>
}

// ---------- Tool executor ----------

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  profile: StudioProfile,
  userId: string
): Promise<{ resultForModel: Record<string, unknown>; action: AssistantAction | null }> {
  switch (name) {
    case 'legal_research': {
      const limit = await limitsEnforcer.checkResearchLimit(userId)
      if (!limit.allowed) {
        return {
          resultForModel: { error: 'Limite ricerche mensili raggiunto per il piano attuale.' },
          action: null,
        }
      }
      const agent = new ResearchAgent()
      const res = await agent.research(
        {
          query: String(args.query ?? ''),
          category: (['jurisprudence', 'regulations', 'precedents', 'general'].includes(
            String(args.category)
          )
            ? String(args.category)
            : 'general') as 'jurisprudence' | 'regulations' | 'precedents' | 'general',
        },
        profile
      )
      return {
        resultForModel: { results: res.results, sources: res.sources },
        action: { tool: 'legal_research', summary: `Ricerca: ${String(args.query ?? '')}`, sources: res.sources },
      }
    }

    case 'generate_document': {
      const limit = await limitsEnforcer.checkDocumentLimit(userId)
      if (!limit.allowed) {
        return {
          resultForModel: { error: 'Limite documenti mensili raggiunto per il piano attuale.' },
          action: null,
        }
      }
      const agent = new DocumentAgent()
      const doc = await agent.generateDocument(
        {
          type: (['contract', 'letter', 'privacy'].includes(String(args.type))
            ? String(args.type)
            : 'letter') as 'contract' | 'invoice' | 'letter' | 'privacy',
          clientName: String(args.clientName ?? 'Cliente'),
          description: args.description ? String(args.description) : undefined,
          amount: args.amount ? String(args.amount) : undefined,
          subject: args.subject ? String(args.subject) : undefined,
        },
        profile
      )
      await supabase.from('generated_documents').insert({
        user_id: userId,
        title: doc.title,
        content: doc.content,
        document_type: doc.type,
      })
      return {
        resultForModel: { status: 'ok', title: doc.title, preview: doc.content.slice(0, 400) },
        action: { tool: 'generate_document', summary: doc.title, document: doc },
      }
    }

    case 'generate_invoice': {
      const limit = await limitsEnforcer.checkDocumentLimit(userId)
      if (!limit.allowed) {
        return {
          resultForModel: { error: 'Limite documenti mensili raggiunto per il piano attuale.' },
          action: null,
        }
      }
      const agent = new DocumentAgent()
      const doc = await agent.generateDocument(
        {
          type: 'invoice',
          clientName: String(args.clientName ?? 'Cliente'),
          description: args.description ? String(args.description) : undefined,
          amount: String(args.amount ?? '0'),
        },
        profile
      )
      return {
        resultForModel: { status: 'ok', title: doc.title, preview: doc.content.slice(0, 400) },
        action: { tool: 'generate_invoice', summary: doc.title, document: doc },
      }
    }

    default:
      return { resultForModel: { error: `Strumento sconosciuto: ${name}` }, action: null }
  }
}

// ---------- Route ----------

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
      `assistant:${user.id}`,
      RATE_LIMITS.chat.maxRequests,
      RATE_LIMITS.chat.windowMs
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Troppe richieste. Riprova tra ${Math.ceil(rateLimit.resetIn / 1000)} secondi.` },
        { status: 429 }
      )
    }

    const chatLimit = await limitsEnforcer.checkChatLimit(user.id)
    if (!chatLimit.allowed) {
      return NextResponse.json({ error: chatLimit.error, remaining: 0 }, { status: 429 })
    }

    const body = await request.json()
    const message: string = String(body.message ?? '').trim()
    const history: Array<{ role: string; content: string }> = Array.isArray(body.history)
      ? body.history.slice(-20)
      : []

    if (!message || message.length > 4000) {
      return NextResponse.json({ error: 'Messaggio non valido' }, { status: 400 })
    }

    const { data: profileRow } = await supabase
      .from('studio_profiles')
      .select('studio_name, studio_type, practice_areas, location')
      .eq('user_id', user.id)
      .single()

    const profile: StudioProfile = {
      studio_name: profileRow?.studio_name || 'Studio Professionale',
      studio_type: profileRow?.studio_type || 'Studio Legale',
      practice_areas: profileRow?.practice_areas || ['Diritto civile'],
      location: profileRow?.location || 'Italia',
    }

    const systemPrompt = `Sei l'Assistente AI di ${profile.studio_name}, uno ${profile.studio_type} con sede a ${profile.location} (aree: ${profile.practice_areas.join(', ')}).

Hai a disposizione strumenti per: ricerca giuridica con fonti reali, generazione documenti (contratti, lettere, privacy GDPR) e fatture.

Regole:
- Usa gli strumenti quando servono, senza chiedere conferma per richieste chiare.
- Se mancano dati essenziali (es. nome cliente o importo per una fattura), chiedili prima di chiamare lo strumento.
- Per domande su leggi, norme o scadenze usa SEMPRE legal_research: non rispondere a memoria.
- Non inventare mai riferimenti normativi o sentenze.
- Rispondi in italiano, professionale ma diretto. Dopo aver generato un documento, riassumilo in 2-3 righe: il testo completo viene mostrato a parte.`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: String(m.content),
      })),
      { role: 'user', content: message },
    ]

    const actions: AssistantAction[] = []
    let finalText = ''

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const { message: assistantMessage } = await freeChatWithTools(messages, tools)

      const toolCalls = assistantMessage.tool_calls

      if (!toolCalls || toolCalls.length === 0) {
        finalText = assistantMessage.content ?? ''
        break
      }

      messages.push(assistantMessage)

      for (const call of toolCalls) {
        if (call.type !== 'function') continue
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments || '{}')
        } catch {
          args = {}
        }

        const { resultForModel, action } = await executeTool(call.function.name, args, profile, user.id)
        if (action) actions.push(action)

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(resultForModel),
        })
      }
    }

    if (!finalText) {
      finalText =
        actions.length > 0
          ? 'Operazione completata. Trovi il risultato qui sotto.'
          : 'Non sono riuscito a completare la richiesta. Riprova riformulando.'
    }

    return NextResponse.json({ reply: finalText, actions, remaining: chatLimit.remaining })
  } catch (error) {
    console.error('Assistant error:', error)
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('429') || message.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { error: 'Servizio AI sovraccarico. Riprova tra qualche secondo.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: "Errore dell'assistente. Riprova." }, { status: 500 })
  }
}
