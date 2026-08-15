import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { ResearchAgent } from '@/lib/researchAgent'
import { DocumentAgent } from '@/lib/documentAgent'
import { DeadlineAgent } from '@/lib/deadlineAgent'
import { ClientAgent } from '@/lib/clientAgent'
import { FiscalCalendarAgent } from '@/lib/fiscalCalendarAgent'
import { checkVatNumber, validateCodiceFiscale, calculateInvoiceFiscal } from '@/lib/taxTools'
import { TimeTrackingAgent } from '@/lib/timeTrackingAgent'
import { sendEmail } from '@/lib/emailSender'
import { TemplateAgent } from '@/lib/templateAgent'
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
      name: 'populate_fiscal_calendar',
      description:
        "Cerca il calendario fiscale ufficiale italiano aggiornato (IVA, F24, dichiarazioni) per l'anno indicato e aggiunge automaticamente le scadenze trovate allo Scadenzario. Usalo quando l'utente chiede di popolare, importare o caricare le scadenze fiscali standard dell'anno.",
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'number', description: 'Anno di riferimento, default anno corrente' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_vat_number',
      description:
        "Verifica una Partita IVA tramite il sistema ufficiale VIES della Commissione Europea (dato reale, non simulato). Usalo prima di fatturare a un nuovo cliente o quando l'utente chiede di controllare una P.IVA.",
      parameters: {
        type: 'object',
        properties: {
          countryCode: { type: 'string', description: 'Codice paese a 2 lettere (es. IT, DE, FR)' },
          vatNumber: { type: 'string', description: 'Numero di partita IVA senza prefisso paese' },
        },
        required: ['countryCode', 'vatNumber'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_codice_fiscale',
      description:
        "Verifica formalmente se un Codice Fiscale italiano rispetta lo schema corretto (16 caratteri). Controllo di formato, non verifica l'esistenza reale in Anagrafe Tributaria.",
      parameters: {
        type: 'object',
        properties: {
          codiceFiscale: { type: 'string', description: 'Il codice fiscale da 16 caratteri da verificare' },
        },
        required: ['codiceFiscale'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_invoice_fiscal',
      description:
        "Calcola rapidamente IVA, ritenuta d'acconto e netto a percepire per una fattura, senza generare un documento. Usalo per domande tipo 'quanto netto su una fattura di 2000 euro forfettario' o 'calcola l'IVA su 1500 euro'.",
      parameters: {
        type: 'object',
        properties: {
          imponibile: { type: 'number', description: 'Importo imponibile in euro' },
          regime: { type: 'string', enum: ['forfettario', 'ordinario'], description: 'Regime fiscale' },
          aliquotaIva: { type: 'number', description: 'Aliquota IVA percentuale, default 22 (solo regime ordinario)' },
          ritenutaAcconto: { type: 'boolean', description: 'Se applicare la ritenuta d\'acconto 20%, default true per regime ordinario' },
        },
        required: ['imponibile', 'regime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_time_entry',
      description:
        "Registra ore lavorate per un cliente, da fatturare in seguito. Usalo quando l'utente dice di aver lavorato un certo numero di ore per un cliente.",
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Nome del cliente' },
          description: { type: 'string', description: 'Descrizione breve dell\'attività svolta' },
          hours: { type: 'number', description: 'Ore lavorate' },
          hourlyRate: { type: 'number', description: 'Tariffa oraria in euro, opzionale' },
        },
        required: ['clientName', 'description', 'hours'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_billing_summary',
      description:
        "Genera il riepilogo delle ore non ancora fatturate per un cliente, con il totale da mettere in parcella. Usalo quando l'utente chiede di preparare la parcella o vedere le ore da fatturare per un cliente.",
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Nome del cliente' },
          markAsBilled: { type: 'boolean', description: 'Se true, segna le ore come già fatturate dopo il riepilogo' },
        },
        required: ['clientName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aml_checklist',
      description:
        "Fornisce la checklist di adeguata verifica antiriciclaggio (AML) da compilare prima di accettare un nuovo cliente, come richiesto dal D.Lgs. 231/2007 per professionisti (avvocati, commercialisti, notai). Usalo quando l'utente parla di un nuovo cliente, apertura pratica, o chiede la checklist antiriciclaggio.",
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Nome del cliente per cui generare la checklist' },
        },
        required: ['clientName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email_to_client',
      description:
        "Invia un'email a un cliente già in rubrica (serve che il cliente abbia un'email salvata). Usalo quando l'utente chiede di mandare, inviare o spedire via email un documento, un sollecito o un messaggio a un cliente. Le risposte del cliente arrivano alla vera casella email del professionista, non ad AgentStudio.",
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Nome del cliente destinatario (deve avere email in rubrica)' },
          subject: { type: 'string', description: "Oggetto dell'email" },
          message: { type: 'string', description: "Testo del messaggio, o il contenuto del documento da inviare" },
        },
        required: ['clientName', 'subject', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_template',
      description:
        "Salva un testo come template riutilizzabile con segnaposto tipo {{nomeCliente}} o {{importo}}. Usalo quando l'utente chiede di salvare un modello, un template, o dice che vuole riusare una formulazione per il futuro. Se l'utente fa riferimento a un documento appena generato in conversazione, usane il contenuto.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome con cui riconoscere il template in futuro' },
          content: { type: 'string', description: 'Testo del template, con segnaposto tra doppie graffe es. {{clientName}}' },
          documentType: { type: 'string', enum: ['contract', 'letter', 'invoice', 'privacy', 'custom'] },
        },
        required: ['name', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_templates',
      description: "Elenca i template salvati dallo studio, con i segnaposto che contengono. Usalo quando l'utente chiede quali template ha o cerca un template.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_from_template',
      description:
        "Genera un documento a partire da un template salvato, sostituendo i segnaposto con i valori forniti. Usalo quando l'utente chiede di usare un template esistente per un nuovo documento.",
      parameters: {
        type: 'object',
        properties: {
          templateName: { type: 'string', description: 'Nome del template da usare' },
          variables: {
            type: 'object',
            description: 'Coppie chiave-valore per riempire i segnaposto, es. {"clientName": "Mario Rossi", "importo": "1500"}',
          },
        },
        required: ['templateName', 'variables'],
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
  userId: string,
  userEmail: string
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

    case 'populate_fiscal_calendar': {
      const agent = new FiscalCalendarAgent()
      const result = await agent.populate(
        userId,
        typeof args.year === 'number' ? args.year : undefined
      )
      return {
        resultForModel: {
          added: result.added,
          skipped: result.skipped,
          deadlines: result.deadlines,
          disclaimer:
            'Scadenze importate da ricerca web reale. Vanno sempre verificate con il calendario ufficiale Agenzia delle Entrate o con un commercialista prima di farvi affidamento.',
        },
        action: {
          tool: 'populate_fiscal_calendar',
          summary: `${result.added} scadenze fiscali importate`,
          sources: result.sources,
        },
      }
    }

    case 'check_vat_number': {
      const result = await checkVatNumber(String(args.countryCode ?? ''), String(args.vatNumber ?? ''))
      return {
        resultForModel: { ...result },
        action: {
          tool: 'check_vat_number',
          summary: result.valid
            ? `P.IVA ${result.countryCode}${result.vatNumber} valida${result.name ? ` — ${result.name}` : ''}`
            : `P.IVA ${result.countryCode}${result.vatNumber}: ${result.error ?? 'non valida'}`,
        },
      }
    }

    case 'validate_codice_fiscale': {
      const result = validateCodiceFiscale(String(args.codiceFiscale ?? ''))
      return {
        resultForModel: { ...result },
        action: {
          tool: 'validate_codice_fiscale',
          summary: result.valid ? 'Codice Fiscale formalmente valido' : `Codice Fiscale non valido: ${result.reason}`,
        },
      }
    }

    case 'calculate_invoice_fiscal': {
      const result = calculateInvoiceFiscal({
        imponibile: typeof args.imponibile === 'number' ? args.imponibile : parseFloat(String(args.imponibile ?? '0')),
        regime: args.regime === 'forfettario' ? 'forfettario' : 'ordinario',
        aliquotaIva: typeof args.aliquotaIva === 'number' ? args.aliquotaIva : undefined,
        ritenutaAcconto: typeof args.ritenutaAcconto === 'boolean' ? args.ritenutaAcconto : undefined,
      })
      return {
        resultForModel: { ...result },
        action: {
          tool: 'calculate_invoice_fiscal',
          summary: `Netto a percepire: €${result.nettoPercepito.toFixed(2)}`,
        },
      }
    }

    case 'log_time_entry': {
      if (args.clientName) {
        await new ClientAgent().upsert(userId, { name: String(args.clientName) }).catch(() => null)
      }
      const agent = new TimeTrackingAgent()
      const entry = await agent.logTime(userId, {
        clientName: String(args.clientName ?? ''),
        description: String(args.description ?? ''),
        hours: typeof args.hours === 'number' ? args.hours : parseFloat(String(args.hours ?? '0')),
        hourlyRate: typeof args.hourlyRate === 'number' ? args.hourlyRate : undefined,
      })
      return {
        resultForModel: { status: 'ok', entry },
        action: { tool: 'log_time_entry', summary: `${entry.hours}h registrate per ${entry.client_name}` },
      }
    }

    case 'generate_billing_summary': {
      const agent = new TimeTrackingAgent()
      const summary = await agent.getUnbilledSummary(userId, String(args.clientName ?? ''))
      if (args.markAsBilled === true && summary.entries.length > 0) {
        await agent.markBilled(userId, String(args.clientName ?? ''))
      }
      return {
        resultForModel: {
          totalHours: summary.totalHours,
          totalAmount: summary.totalAmount,
          details: agent.formatSummaryForModel(summary),
        },
        action: {
          tool: 'generate_billing_summary',
          summary: `Riepilogo ore per ${summary.clientName}: ${summary.totalHours}h`,
        },
      }
    }

    case 'aml_checklist': {
      const clientName = String(args.clientName ?? 'il cliente')
      const checklist = [
        'Identificazione: documento d\'identità valido e codice fiscale/P.IVA verificati',
        'Titolare effettivo: identificato se il cliente è una persona giuridica (assetto proprietario)',
        'Scopo e natura della prestazione professionale richiesta: documentata',
        'Verifica che il cliente non sia in liste di sanzioni internazionali (OFAC, UE, ONU)',
        'Valutazione del rischio: politically exposed person (PEP)? operazioni in contanti rilevanti?',
        'Origine dei fondi: verificata per operazioni di importo significativo',
        'Conservazione documentale: fascicolo cliente con tutta la documentazione raccolta',
      ]
      return {
        resultForModel: {
          clientName,
          checklist,
          disclaimer:
            'Checklist standard di riferimento (D.Lgs. 231/2007). Non sostituisce la consulenza di un esperto in materia antiriciclaggio per casi complessi o ad alto rischio.',
        },
        action: {
          tool: 'aml_checklist',
          summary: `Checklist antiriciclaggio per ${clientName}`,
        },
      }
    }

    case 'send_email_to_client': {
      const clientAgent = new ClientAgent()
      const client = await clientAgent.findByName(userId, String(args.clientName ?? ''))

      if (!client) {
        return {
          resultForModel: { error: 'Cliente non trovato in rubrica. Aggiungilo prima con nome ed email.' },
          action: null,
        }
      }
      if (!client.email) {
        return {
          resultForModel: { error: `${client.name} non ha un'email salvata in rubrica. Aggiungila prima di inviare.` },
          action: null,
        }
      }

      const result = await sendEmail({
        to: client.email,
        subject: String(args.subject ?? 'Comunicazione'),
        bodyText: String(args.message ?? ''),
        senderName: profile.studio_name,
        replyTo: userEmail,
      })

      if (!result.sent) {
        return { resultForModel: { error: result.error }, action: null }
      }

      return {
        resultForModel: { status: 'ok', sentTo: client.email },
        action: { tool: 'send_email_to_client', summary: `Email inviata a ${client.name} (${client.email})` },
      }
    }

    case 'save_template': {
      const agent = new TemplateAgent()
      const template = await agent.save(userId, {
        name: String(args.name ?? ''),
        content: String(args.content ?? ''),
        documentType: typeof args.documentType === 'string' ? args.documentType : undefined,
      })
      return {
        resultForModel: { status: 'ok', name: template.name },
        action: { tool: 'save_template', summary: `Template salvato: ${template.name}` },
      }
    }

    case 'list_templates': {
      const agent = new TemplateAgent()
      const templates = await agent.list(userId)
      return {
        resultForModel: { count: templates.length, templates: agent.formatListForModel(templates) },
        action: null,
      }
    }

    case 'generate_from_template': {
      const agent = new TemplateAgent()
      const template = await agent.findByName(userId, String(args.templateName ?? ''))

      if (!template) {
        return {
          resultForModel: { error: 'Template non trovato. Usa list_templates per vedere quelli disponibili.' },
          action: null,
        }
      }

      const variables = (args.variables && typeof args.variables === 'object' ? args.variables : {}) as Record<string, string>
      const filledContent = agent.fill(template, variables)

      return {
        resultForModel: { status: 'ok', title: template.name, preview: filledContent.slice(0, 400) },
        action: {
          tool: 'generate_from_template',
          summary: template.name,
          document: { title: template.name, content: filledContent, type: template.document_type },
        },
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
          const parsed = JSON.parse(call.function.arguments || '{}')
          args = parsed && typeof parsed === 'object' ? parsed : {}
        } catch {
          args = {}
        }

        const { resultForModel, action } = await executeTool(call.function.name, args, profile, user.id, user.email ?? '')
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
