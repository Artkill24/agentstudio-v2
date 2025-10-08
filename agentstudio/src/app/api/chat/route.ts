import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatWithFallback } from '@/lib/openrouter-client'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { sanitizeText, ValidationError } from '@/lib/validation'

// Types
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  conversationHistory?: Message[]
}

// Constants
const MAX_HISTORY_LENGTH = 20
const MAX_MESSAGE_LENGTH = 2000

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 1. Validazione Auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorizzato' }, 
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Token non valido' }, 
        { status: 401 }
      )
    }

    // 2. Rate Limiting
    const rateLimit = await rateLimiter.check(
      `chat:${user.id}`,
      RATE_LIMITS.chat.maxRequests,
      RATE_LIMITS.chat.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: `Troppi messaggi. Riprova tra ${Math.ceil(rateLimit.resetIn / 1000)} secondi.` 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.chat.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + Math.ceil(rateLimit.resetIn / 1000)),
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000))
          }
        }
      )
    }

    // 3. Check Limiti Giornalieri
    const limitCheck = await limitsEnforcer.checkChatLimit(user.id)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: limitCheck.error,
          remaining: 0,
          resetAt: limitCheck.resetAt
        }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining)
          }
        }
      )
    }

    // 4. Parse e Validazione Input
    const body: ChatRequest = await request.json()
    const { message, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Messaggio mancante o non valido' }, 
        { status: 400 }
      )
    }

    // 5. Sanitizza Input
    let sanitizedMessage: string
    try {
      sanitizedMessage = sanitizeText(message, MAX_MESSAGE_LENGTH)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message }, 
          { status: 400 }
        )
      }
      throw error
    }

    // 6. Valida conversationHistory
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'conversationHistory deve essere un array' }, 
        { status: 400 }
      )
    }

    // 7. Prepara Messaggi con sanitizzazione
    const limitedHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH)
    
    const messages = [
      {
        role: "system" as const,
        content: "Sei un assistente AI per studi professionali italiani. Rispondi in italiano professionale, in modo chiaro e conciso."
      },
      ...limitedHistory.map((msg) => {
        try {
          return {
            role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
            content: sanitizeText(String(msg.content), MAX_MESSAGE_LENGTH)
          }
        } catch {
          return null
        }
      }).filter(Boolean) as Array<{ role: 'user' | 'assistant'; content: string }>,
      {
        role: "user" as const,
        content: sanitizedMessage
      }
    ]

    // 8. Chiamata con Fallback Automatico
    const aiResponse = await chatWithFallback(messages, {
      temperature: 0.7,
      max_tokens: 1000
    })

    if (!aiResponse) {
      throw new Error('Risposta AI vuota')
    }

    // 9. Incrementa contatore SOLO dopo successo
    await limitsEnforcer.incrementChatCount(user.id)

    // 10. Risposta con headers di rate limiting
    return NextResponse.json(
      { 
        response: aiResponse,
        timestamp: new Date().toISOString(),
        remaining: limitCheck.remaining - 1,
        resetAt: limitCheck.resetAt
      },
      {
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMITS.chat.maxRequests),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + Math.ceil(RATE_LIMITS.chat.windowMs / 1000))
        }
      }
    )

  } catch (error) {
    console.error('Chat error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })

    // Gestione errori specifici
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      // Rate limit
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Troppe richieste al servizio AI. Riprova tra qualche secondo.' },
          { status: 429 }
        )
      }
      
      // Errore API key
      if (error.message.includes('API key') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Errore di configurazione del servizio' },
          { status: 503 }
        )
      }

      // Timeout
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Timeout nella risposta. Riprova.' },
          { status: 504 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Errore nel processare la richiesta. Riprova.' }, 
      { status: 500 }
    )
  }
}