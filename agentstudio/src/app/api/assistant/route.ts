import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { ResearchAgent } from '@/lib/researchAgent'
import { DocumentAgent } from '@/lib/documentAgent'
import { DeadlineAgent } from '@/lib/deadlineAgent'
import { ClientAgent } from '@/lib/clientAgent'
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
  {
    type: 'function',
    function: {
      name: 'create_deadline',
      description:
        "Registra una nuova scadenza o promemoria nello Scadenzario (adempimento fiscale, termine legale, fattura da emettere, scadenza generica). Usalo quando l'utente chiede di ricordare, annotare o tracciare una scadenza.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titolo breve della scadenza' },
          dueDate: { type: 'string', description: 'Data di scadenza in formato YYYY-MM-DD' },
          clientName: { type: 'string', description: 'Cliente associato, se rilevante' },
          category: {
            type: 'string',
            enum: ['fiscal', 'legal', 'invoice', 'general'],
            description: 'Categoria della scadenza',
          },
          notes: { type: 'string', description: 'Note aggiuntive' },
        },
        required: ['title', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_deadlines',
      description:
        "Elenca le scadenze registrate nello Scadenzario. Usalo quando l'utente chiede quali scadenze ha, cosa scade a breve, o un riepilogo degli adempimenti.",
      parameters: {
        type: 'object',
        properties: {
          onlyPending: { type: 'boolean', description: 'Se true, mostra solo quelle non completate' },
          withinDays: { type: 'number', description: 'Filtra solo le scadenze entro N giorni da oggi' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upsert_client',
      description:
        "Salva o aggiorna un cliente nella rubrica. Usalo quando l'utente fornisce dati di contatto di un cliente (email, telefono) da ricordare, o esplicitamente chiede di salvare/aggiungere un cliente.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome del cliente' },
          email: { type: 'string', description: 'Email del cliente' },
          phone: { type: 'string', description: 'Telefono del cliente' },
          notes: { type: 'string', description: 'Note aggiuntive sul cliente' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_clients',
      description:
        "Elenca i clienti in rubrica, opzionalmente filtrati per nome. Usalo quando l'utente chiede chi sono i suoi clienti o cerca un cliente specifico.",
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Testo per filtrare per nome, opzionale' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_reminder_letter',
      description:
        "Genera una lettera di sollecito/promemoria per una scadenza imminente o scaduta, da inviare al cliente o per uso interno. Usalo quando l'utente chiede di sollecitare, ricordare o scrivere un promemoria su una scadenza specifica.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titolo della scadenza da sollecitare' },
          dueDate: { type: 'string', description: 'Data di scadenza (YYYY-MM-DD)' },
          clientName: { type: 'string', description: 'Nome del cliente destinatario' },
          notes: { type: 'string', description: 'Dettagli aggiuntivi da includere nel sollecito' },
        },
        required: ['title', 'clientName'],
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
      if (args.clientName) {
        await new ClientAgent().upsert(userId, { name: String(args.clientName) }).catch(() => null)
      }
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
      if (args.clientName) {
        await new ClientAgent().upsert(userId, { name: String(args.clientName) }).catch(() => null)
      }
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

    case 'create_deadline': {
      if (args.clientName) {
        await new ClientAgent().upsert(userId, { name: String(args.clientName) }).catch(() => null)
      }
      const agent = new DeadlineAgent()
      const deadline = await agent.create(userId, {
        title: String(args.title ?? 'Scadenza'),
        dueDate: String(args.dueDate ?? ''),
        clientName: args.clientName ? String(args.clientName) : undefined,
        category: (['fiscal', 'legal', 'invoice', 'general'].includes(String(args.category))
          ? String(args.category)
          : 'general') as 'fiscal' | 'legal' | 'invoice' | 'general',
        notes: args.notes ? String(args.notes) : undefined,
      })
      return {
        resultForModel: { status: 'ok', deadline },
        action: {
          tool: 'create_deadline',
          summary: `Scadenza registrata: ${deadline.title} (${deadline.due_date})`,
        },
      }
    }

    case 'list_deadlines': {
      const agent = new DeadlineAgent()
      const deadlines = await agent.list(userId, {
        onlyPending: args.onlyPending === true,
        withinDays: typeof args.withinDays === 'number' ? args.withinDays : undefined,
      })
      return {
        resultForModel: { count: deadlines.length, deadlines: agent.formatForModel(deadlines) },
        action: null,
      }
    }

    case 'generate_reminder_letter': {
      const limit = await limitsEnforcer.checkDocumentLimit(userId)
      if (!limit.allowed) {
        return {
          resultForModel: { error: 'Limite documenti mensili raggiunto per il piano attuale.' },
          action: null,
        }
      }
      const docAgent = new DocumentAgent()
      const doc = await docAgent.generateDocument(
        {
          type: 'letter',
          clientName: String(args.clientName ?? 'Cliente'),
          subject: `Sollecito: ${String(args.title ?? 'scadenza')}`,
          description: `Scadenza "${String(args.title ?? '')}" ${
            args.dueDate ? `del ${String(args.dueDate)}` : ''
          }. ${args.notes ? String(args.notes) : ''} Scrivi un sollecito cortese ma chiaro.`,
        },
        profile
      )
      return {
        resultForModel: { status: 'ok', title: doc.title, preview: doc.content.slice(0, 400) },
        action: { tool: 'generate_reminder_letter', summary: doc.title, document: doc },
      }
    }

    case 'upsert_client': {
      const agent = new ClientAgent()
      const { client, created } = await agent.upsert(userId, {
        name: String(args.name ?? ''),
        email: args.email ? String(args.email) : undefined,
        phone: args.phone ? String(args.phone) : undefined,
        notes: args.notes ? String(args.notes) : undefined,
      })
      return {
        resultForModel: { status: 'ok', created, client },
        action: {
          tool: 'upsert_client',
          summary: created ? `Cliente aggiunto: ${client.name}` : `Cliente aggiornato: ${client.name}`,
        },
      }
    }

    case 'list_clients': {
      const agent = new ClientAgent()
      const clients = await agent.list(userId, args.search ? String(args.search) : undefined)
      return {
        resultForModel: { count: clients.length, clients: agent.formatForModel(clients) },
        action: null,
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
    const conversationId: string | null = body.conversationId ? String(body.conversationId) : null

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

    // Persisti i messaggi se la conversazione esiste (silenzioso: non blocca la risposta)
    if (conversationId) {
      try {
        await supabase.from('assistant_messages').insert([
          { conversation_id: conversationId, role: 'user', content: message },
          { conversation_id: conversationId, role: 'assistant', content: finalText, actions },
        ])

        // Titolo automatico dalla prima domanda, solo se la conversazione è ancora "Nuova conversazione"
        const { data: conv } = await supabase
          .from('assistant_conversations')
          .select('title')
          .eq('id', conversationId)
          .single()

        if (conv?.title === 'Nuova conversazione') {
          const autoTitle = message.length > 60 ? message.slice(0, 57) + '...' : message
          await supabase
            .from('assistant_conversations')
            .update({ title: autoTitle, updated_at: new Date().toISOString() })
            .eq('id', conversationId)
        } else {
          await supabase
            .from('assistant_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId)
        }
      } catch (persistError) {
        console.error('Failed to persist conversation:', persistError)
      }
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
