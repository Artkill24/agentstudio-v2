import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data, error } = await supabase
    .from('studio_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ profile: data })
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()

  // Aggiorna solo i campi effettivamente inviati, senza assumere uno schema fisso:
  // evita di rompere l'update se la tabella ha colonne diverse da quelle previste.
  const updatable: Record<string, unknown> = {}
  const allowedFields = ['studio_name', 'studio_type', 'location', 'team_size', 'practice_areas', 'challenge']
  for (const field of allowedFields) {
    if (body[field] !== undefined) updatable[field] = body[field]
  }

  if (Object.keys(updatable).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('studio_profiles')
    .update(updatable)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
