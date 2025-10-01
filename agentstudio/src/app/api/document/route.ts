import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { sanitizeText, documentTypeSchema, ValidationError } from '@/lib/validation'

// ============= CONFIG =============
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

// ============= TYPES =============
interface DocumentDetails {
  // Contratto
  parties?: string
  subject?: string
  payment?: string
  duration?: string
  additionalClauses?: string
  
  // Lettera
  recipient?: string
  content?: string
  tone?: 'formale' | 'informale' | 'legale'
  
  // Privacy
  companyName?: string
  vatNumber?: string
  address?: string
  dataController?: string
  websiteUrl?: string
  
  // Termini
  service?: string
  
  // Generico
  [key: string]: any
}

interface DocumentRequest {
  documentType: string
  details: DocumentDetails
}

// ============= VALIDATION HELPERS =============
function validateAndSanitizeDetails(
  documentType: string,
  details: DocumentDetails
): DocumentDetails {
  const sanitized: DocumentDetails = {}

  // Validazione e sanitizzazione per tipo di documento
  switch (documentType) {
    case 'contratto':
      if (!details.parties) throw new ValidationError('Le parti sono obbligatorie per un contratto')
      if (!details.subject) throw new ValidationError('L\'oggetto è obbligatorio per un contratto')
      if (!details.payment) throw new ValidationError('Il corrispettivo è obbligatorio per un contratto')

      sanitized.parties = sanitizeText(details.parties, 500)
      sanitized.subject = sanitizeText(details.subject, 1000)
      sanitized.payment = sanitizeText(details.payment, 300)
      
      if (details.duration) {
        sanitized.duration = sanitizeText(details.duration, 200)
      }
      if (details.additionalClauses) {
        sanitized.additionalClauses = sanitizeText(details.additionalClauses, 2000)
      }
      break

    case 'lettera':
      if (!details.recipient) throw new ValidationError('Il destinatario è obbligatorio')
      if (!details.subject) throw new ValidationError('L\'oggetto è obbligatorio')
      if (!details.content) throw new ValidationError('Il contenuto è obbligatorio')

      sanitized.recipient = sanitizeText(details.recipient, 300)
      sanitized.subject = sanitizeText(details.subject, 200)
      sanitized.content = sanitizeText(details.content, 5000)
      
      if (details.tone && ['formale', 'informale', 'legale'].includes(details.tone)) {
        sanitized.tone = details.tone
      }
      break

    case 'privacy':
      if (!details.companyName) throw new ValidationError('Il nome dell\'azienda è obbligatorio')
      if (!details.address) throw new ValidationError('L\'indirizzo è obbligatorio')
      if (!details.dataController) throw new ValidationError('Il titolare del trattamento è obbligatorio')

      sanitized.companyName = sanitizeText(details.companyName, 200)
      sanitized.address = sanitizeText(details.address, 500)
      sanitized.dataController = sanitizeText(details.dataController, 200)
      
      if (details.vatNumber) {
        sanitized.vatNumber = sanitizeText(details.vatNumber, 50)
      }
      if (details.websiteUrl) {
        // Validazione URL base
        try {
          new URL(details.websiteUrl)
          sanitized.websiteUrl = sanitizeText(details.websiteUrl, 200)
        } catch {
          throw new ValidationError('URL del sito web non valido')
        }
      }
      break

    case 'termini':
      if (!details.companyName) throw new ValidationError('Il nome dell\'azienda è obbligatorio')
      if (!details.service) throw new ValidationError('La descrizione del servizio è obbligatoria')

      sanitized.companyName = sanitizeText(details.companyName, 200)
      sanitized.service = sanitizeText(details.service, 1000)
      break

    case 'altro':
      // Sanitizza tutti i campi stringa
      Object.entries(details).forEach(([key, value]) => {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeText(value, 2000)
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = value
        }
      })
      break

    default:
      throw new ValidationError(`Tipo di documento non supportato: ${documentType}`)
  }

  return sanitized
}

// ============= PROMPT BUILDING =============
function buildDocumentPrompt(type: string, details: DocumentDetails): string {
  const systemPrompt = `Sei un assistente legale esperto in diritto italiano. 
Genera documenti professionali conformi alle normative italiane vigenti (GDPR, Codice Civile, ecc.).
Usa linguaggio formale, preciso e professionale.
Includi sempre le clausole standard rilevanti per il tipo di documento.
NON includere placeholder come [NOME] o [DATA] - usa informazioni reali fornite o ometti se non disponibili.
Formatta il documento in modo chiaro con intestazioni e paragrafi ben strutturati.`

  const prompts: Record<string, string> = {
    contratto: `${systemPrompt}

TIPO: Contratto professionale
PARTI CONTRAENTI: ${details.parties}
OGGETTO DEL CONTRATTO: ${details.subject}
CORRISPETTIVO: ${details.payment}
${details.duration ? `DURATA: ${details.duration}` : ''}
${details.additionalClauses ? `CLAUSOLE AGGIUNTIVE RICHIESTE:\n${details.additionalClauses}` : ''}

STRUTTURA OBBLIGATORIA:
1. INTESTAZIONE
   - Luogo e data (usa data odierna in formato italiano)
   - Titolo del contratto

2. PREMESSE E IDENTIFICAZIONE PARTI
   - Dati completi delle parti contraenti
   - Premesse che introducono l'oggetto

3. ARTICOLI DEL CONTRATTO:
   Art. 1 - OGGETTO
   Art. 2 - OBBLIGHI DELLA PRIMA PARTE
   Art. 3 - OBBLIGHI DELLA SECONDA PARTE
   Art. 4 - CORRISPETTIVO E MODALITÀ DI PAGAMENTO
   Art. 5 - DURATA E DECORRENZA
   Art. 6 - RECESSO E RISOLUZIONE
   Art. 7 - RISERVATEZZA
   Art. 8 - TRATTAMENTO DATI PERSONALI (GDPR)
   Art. 9 - MODIFICHE AL CONTRATTO
   Art. 10 - COMUNICAZIONI
   Art. 11 - LEGGE APPLICABILE E FORO COMPETENTE
   Art. 12 - DISPOSIZIONI FINALI

4. FIRME
   - Spazio per firma di entrambe le parti
   - Data e luogo di sottoscrizione

Genera un contratto completo, professionale e immediatamente utilizzabile. Ogni articolo deve avere contenuti specifici e dettagliati basati sulle informazioni fornite.`,

    lettera: `${systemPrompt}

TIPO: Lettera formale professionale
DESTINATARIO: ${details.recipient}
OGGETTO: ${details.subject}
CONTENUTO RICHIESTO: ${details.content}
TONO: ${details.tone || 'formale'}

STRUTTURA:
1. INTESTAZIONE MITTENTE
   - Nome/Ragione sociale (allineato a destra)
   - Indirizzo completo
   - Recapiti

2. LUOGO E DATA
   - Città, data completa in italiano

3. DESTINATARIO
   - Spett.le [nome completo]
   - Indirizzo (se disponibile)

4. OGGETTO
   - In grassetto o sottolineato
   - Chiaro e conciso

5. CORPO DELLA LETTERA
   ${details.tone === 'formale' ? `- Saluti iniziali formali (Egregio/Spettabile...)
   - Esposizione chiara e strutturata
   - Paragrafi ben separati` : ''}
   ${details.tone === 'legale' ? `- Riferimenti normativi quando necessario
   - Linguaggio tecnico-legale appropriato
   - Eventuali diffide o richieste formali` : ''}

6. CONCLUSIONE
   - Formula di cortesia appropriata al tono
   - Disponibilità per chiarimenti

7. FIRMA
   - Distinti saluti/Cordiali saluti
   - Nome completo
   - Ruolo/qualifica

Genera una lettera ben formattata, professionale e conforme allo stile italiano. Il contenuto deve essere sviluppato in modo completo partendo dalle informazioni fornite.`,

    privacy: `${systemPrompt}

TIPO: Informativa Privacy ai sensi del GDPR (Regolamento UE 2016/679)
AZIENDA: ${details.companyName}
${details.vatNumber ? `PARTITA IVA: ${details.vatNumber}` : ''}
SEDE LEGALE: ${details.address}
TITOLARE DEL TRATTAMENTO: ${details.dataController}
${details.websiteUrl ? `SITO WEB: ${details.websiteUrl}` : ''}

SEZIONI OBBLIGATORIE (conformi agli artt. 13-14 GDPR):

1. TITOLARE DEL TRATTAMENTO
   - Denominazione completa
   - Sede legale e contatti
   - Eventuale DPO (Data Protection Officer)

2. FINALITÀ DEL TRATTAMENTO E BASE GIURIDICA
   - Esecuzione di un contratto (Art. 6, par. 1, lett. b)
   - Obblighi di legge (Art. 6, par. 1, lett. c)
   - Consenso dell'interessato (Art. 6, par. 1, lett. a)
   - Legittimo interesse (Art. 6, par. 1, lett. f)

3. TIPOLOGIE DI DATI RACCOLTI
   - Dati identificativi
   - Dati di contatto
   - Dati di navigazione
   - Altri dati specifici

4. MODALITÀ DI TRATTAMENTO
   - Trattamento con strumenti informatici e cartacei
   - Misure di sicurezza adottate (Art. 32 GDPR)

5. AMBITO DI COMUNICAZIONE E DIFFUSIONE
   - Destinatari dei dati
   - Assenza di diffusione

6. TRASFERIMENTO DATI EXTRA-UE
   - Eventuale trasferimento e garanzie (Artt. 44-49 GDPR)

7. TEMPI DI CONSERVAZIONE
   - Criteri per determinare la durata
   - Periodi specifici per categoria di dati

8. DIRITTI DELL'INTERESSATO (Artt. 15-22 GDPR)
   - Diritto di accesso (Art. 15)
   - Diritto di rettifica (Art. 16)
   - Diritto alla cancellazione (Art. 17)
   - Diritto di limitazione (Art. 18)
   - Diritto alla portabilità (Art. 20)
   - Diritto di opposizione (Art. 21)
   - Diritto di non essere sottoposto a decisioni automatizzate (Art. 22)
   - Diritto di revoca del consenso

9. MODALITÀ DI ESERCIZIO DEI DIRITTI
   - Come contattare il Titolare
   - Tempi di risposta (1 mese prorogabile di 2)

10. DIRITTO DI RECLAMO
    - Diritto di proporre reclamo al Garante per la Protezione dei Dati Personali
    - Contatti del Garante: www.garanteprivacy.it

11. MODIFICHE ALL'INFORMATIVA
    - Indicazione sulla possibilità di aggiornamenti

Genera un'informativa completa, conforme al GDPR e professionale. Ogni sezione deve essere sviluppata in modo dettagliato e specifico per l'azienda indicata.`,

    termini: `${systemPrompt}

TIPO: Termini e Condizioni di Servizio
AZIENDA: ${details.companyName}
SERVIZIO OFFERTO: ${details.service}

STRUTTURA COMPLETA:

1. DEFINIZIONI
   - Servizio, Utente, Piattaforma, Account, ecc.

2. ACCETTAZIONE DEI TERMINI
   - Modalità di accettazione
   - Età minima (18 anni o maggiore età)

3. DESCRIZIONE DEL SERVIZIO
   - Natura e caratteristiche del servizio
   - Disponibilità e limitazioni

4. REGISTRAZIONE E ACCOUNT
   - Procedura di registrazione
   - Obblighi dell'utente (credenziali, sicurezza)
   - Responsabilità per l'uso dell'account

5. OBBLIGHI DELL'UTENTE
   - Uso lecito del servizio
   - Divieti (spam, contenuti illeciti, ecc.)
   - Rispetto della proprietà intellettuale

6. PROPRIETÀ INTELLETTUALE
   - Diritti dell'azienda sui contenuti
   - Licenza d'uso concessa all'utente
   - Contenuti generati dall'utente

7. CORRISPETTIVI E PAGAMENTI
   - Modalità di pagamento
   - Fatturazione
   - Rimborsi e cancellazioni

8. LIMITAZIONI DI RESPONSABILITÀ
   - Esclusioni di garanzia
   - Limitazioni di responsabilità nei limiti di legge

9. SOSPENSIONE E RISOLUZIONE
   - Cause di sospensione dell'account
   - Procedura di risoluzione
   - Effetti della cessazione

10. MODIFICHE AL SERVIZIO E AI TERMINI
    - Diritto di modifica
    - Comunicazione delle modifiche

11. LEGGE APPLICABILE E FORO COMPETENTE
    - Legge italiana
    - Foro competente esclusivo

12. COMUNICAZIONI
    - Modalità di contatto
    - Validità delle comunicazioni elettroniche

13. DISPOSIZIONI FINALI
    - Clausola di salvaguardia
    - Integralità dell'accordo

Genera termini e condizioni completi, professionali e conformi alla normativa italiana. Ogni sezione deve essere dettagliata e specifica per il servizio descritto.`,

    altro: `${systemPrompt}

TIPO: Documento legale generico
INFORMAZIONI FORNITE:
${Object.entries(details)
  .map(([key, val]) => `- ${key}: ${val}`)
  .join('\n')}

ISTRUZIONI:
Analizza le informazioni fornite e genera un documento legale appropriato.
Includi tutte le sezioni standard necessarie per questo tipo di documento.
Mantieni un tono professionale e formale.
Assicurati che il documento sia completo e utilizzabile.
Includi riferimenti normativi quando appropriato.

Genera un documento professionale e ben strutturato.`
  }

  return prompts[type] || prompts.altro
}

// ============= MAIN HANDLER =============
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined
  let documentType: string | undefined

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Header Authorization mancante o malformato' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.warn('Auth failed:', authError?.message)
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 401 }
      )
    }

    userId = user.id

    // ========== RATE LIMITING ==========
    const rateLimit = await rateLimiter.check(
      `document:${userId}`,
      RATE_LIMITS.document.maxRequests,
      RATE_LIMITS.document.windowMs
    )

    if (!rateLimit.allowed) {
      const resetInSeconds = Math.ceil(rateLimit.resetIn / 1000)
      console.log(`Rate limit exceeded for user ${userId}. Reset in ${resetInSeconds}s`)
      
      return NextResponse.json({
        error: `Limite richieste superato. Riprova tra ${resetInSeconds} secondi.`,
        retryAfter: resetInSeconds,
        remaining: rateLimit.remaining
      }, { 
        status: 429,
        headers: {
          'Retry-After': resetInSeconds.toString(),
          'X-RateLimit-Limit': RATE_LIMITS.document.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetIn).toISOString()
        }
      })
    }

    // ========== PARSE REQUEST BODY ==========
    let body: DocumentRequest
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Body della richiesta non valido' },
        { status: 400 }
      )
    }

    const { documentType: type, details } = body

    if (!type || !details) {
      return NextResponse.json(
        { error: 'Parametri mancanti: documentType e details sono obbligatori' },
        { status: 400 }
      )
    }

    documentType = type

    // ========== VALIDATION ==========
    try {
      // Valida il tipo di documento
      documentTypeSchema.parse(type)
      
      // Valida e sanitizza i dettagli
      const sanitizedDetails = validateAndSanitizeDetails(type, details)
      
      // ========== USAGE LIMITS ENFORCEMENT ==========
      const limitCheck = await limitsEnforcer.checkDocumentLimit(userId)

      if (!limitCheck.allowed) {
        console.log(`Document limit reached for user ${userId}: ${limitCheck.error}`)
        return NextResponse.json({
          error: limitCheck.error,
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          planName: limitCheck.planName,
          upgradeUrl: '/pricing'
        }, { status: 429 })
      }

      // ========== GENERATE DOCUMENT WITH AI ==========
      const prompt = buildDocumentPrompt(type, sanitizedDetails)

      let completion: OpenAI.Chat.Completions.ChatCompletion
      try {
        completion = await openrouter.chat.completions.create({
          model: "deepseek/deepseek-chat-v3.1:free",
          messages: [{ 
            role: "user", 
            content: prompt 
          }],
          temperature: 0.3, // Deterministico per documenti legali
          max_tokens: 4000,
          top_p: 0.9
        })
      } catch (aiError: any) {
        console.error('OpenRouter API error:', {
          status: aiError?.status,
          message: aiError?.message,
          type: aiError?.type,
          userId
        })

        if (aiError?.status === 429) {
          return NextResponse.json(
            { error: 'Servizio AI temporaneamente sovraccarico. Riprova tra qualche minuto.' },
            { status: 503 }
          )
        }

        if (aiError?.status === 401) {
          return NextResponse.json(
            { error: 'Errore di autenticazione con il servizio AI' },
            { status: 502 }
          )
        }

        return NextResponse.json(
          { error: 'Errore durante la generazione del documento. Riprova.' },
          { status: 500 }
        )
      }

      const documentText = completion.choices[0]?.message?.content

      if (!documentText || documentText.length < 100) {
        console.error('Generated document too short or empty', {
          userId,
          type,
          length: documentText?.length || 0
        })
        return NextResponse.json(
          { error: 'Documento generato non valido. Riprova con dettagli più specifici.' },
          { status: 500 }
        )
      }

      // ========== GET SUBSCRIPTION INFO ==========
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('team_id, plan_name')
        .eq('user_id', userId)
        .single()

      // ========== SAVE DOCUMENT TO DATABASE ==========
      const { data: savedDoc, error: saveError } = await supabase
        .from('generated_documents')
        .insert({
          user_id: userId,
          team_id: subscription?.team_id,
          document_type: type,
          content: documentText,
          metadata: {
            details: sanitizedDetails,
            model: completion.model,
            tokens: completion.usage?.total_tokens,
            generatedAt: new Date().toISOString(),
            prompt_version: '2.0'
          }
        })
        .select('id, created_at')
        .single()

      if (saveError) {
        console.error('Failed to save document:', {
          error: saveError,
          userId,
          type
        })
        
        // Documento generato ma non salvato - errore critico
        return NextResponse.json(
          { 
            error: 'Documento generato ma errore nel salvataggio. Contatta il supporto.',
            document: documentText // Comunque restituisci il documento
          },
          { status: 500 }
        )
      }

      // ========== LOGGING & METRICS ==========
      const duration = Date.now() - startTime

      console.log({
        event: 'document_generated_success',
        userId,
        documentType: type,
        documentId: savedDoc.id,
        duration,
        tokens: completion.usage?.total_tokens,
        remaining: limitCheck.remaining,
        planName: limitCheck.planName
      })

      // Log usage metrics (opzionale ma consigliato per analytics)
      await supabase
        .from('usage_metrics')
        .insert({
          user_id: userId,
          action: 'document_generated',
          resource_type: 'document',
          resource_id: savedDoc.id,
          metadata: {
            documentType: type,
            tokens: completion.usage?.total_tokens,
            duration,
            model: completion.model
          }
        })
        .catch(err => console.error('Failed to log metrics:', err))

      // ========== SUCCESS RESPONSE ==========
      return NextResponse.json({
        success: true,
        document: documentText,
        documentId: savedDoc.id,
        usage: {
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          planName: limitCheck.planName,
          resetAt: limitCheck.resetAt
        },
        metadata: {
          type,
          tokens: completion.usage?.total_tokens,
          model: completion.model,
          generatedAt: savedDoc.created_at,
          duration
        }
      }, {
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-Usage-Remaining': limitCheck.remaining.toString()
        }
      })

    } catch (error) {
      if (error instanceof ValidationError) {
        console.log('Validation error:', {
          message: error.message,
          userId,
          documentType: type
        })
        
        return NextResponse.json(
          { error: error.message, field: error.field },
          { status: 400 }
        )
      }
      throw error // Re-throw per catch esterno
    }

  } catch (error: any) {
    console.error('Document generation error:', {
      error: error.message,
      stack: error.stack,
      userId,
      documentType
    })

    return NextResponse.json(
      { error: 'Errore interno del server. Riprova più tardi.' },
      { status: 500 }
    )
  }
}

// ========== GET HANDLER (Retrieve document history) ==========
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const documentType = searchParams.get('type')

    // Build query
    let query = supabase
      .from('generated_documents')
      .select('id, document_type, created_at, metadata', { count: 'exact' })
      .eq('user_id', user.id)

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data: documents, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      documents: documents || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('GET documents error:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei documenti' },
      { status: 500 }
    )
  }
}

// ========== DELETE HANDLER (Delete a document) ==========
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID documento mancante' },
        { status: 400 }
      )
    }

    // Delete only if owned by user
    const { error: deleteError } = await supabase
      .from('generated_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete document error:', deleteError)
      return NextResponse.json(
        { error: 'Errore durante l\'eliminazione' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('DELETE document error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}