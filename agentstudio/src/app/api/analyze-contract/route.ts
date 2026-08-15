import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { limitsEnforcer } from '@/lib/limitsEnforcer'
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter'
import { ContractAnalyzer } from '@/lib/contractAnalyzer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB

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
      `analyze-contract:${user.id}`,
      RATE_LIMITS.research.maxRequests,
      RATE_LIMITS.research.windowMs
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Troppe analisi. Riprova tra ${Math.ceil(rateLimit.resetIn / 60000)} minuti.` },
        { status: 429 }
      )
    }

    // Riusa lo stesso limite mensile della ricerca (evita di aggiungere una nuova colonna)
    const limitCheck = await limitsEnforcer.checkResearchLimit(user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo file PDF sono supportati' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 8MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const analyzer = new ContractAnalyzer()
    const analysis = await analyzer.analyze(buffer, file.name)

    return NextResponse.json({ analysis, remaining: limitCheck.remaining })
  } catch (error) {
    console.error('Contract analysis error:', error)
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('estrarre testo')) {
      return NextResponse.json({ error: message }, { status: 422 })
    }

    return NextResponse.json({ error: "Errore durante l'analisi. Riprova." }, { status: 500 })
  }
}
