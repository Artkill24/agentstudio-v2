import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ClientAgent } from '@/lib/clientAgent'

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

  const agent = new ClientAgent()
  const clients = await agent.list(user.id)
  return NextResponse.json({ clients })
}

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()
  const name = String(body.name ?? '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 })
  }

  const agent = new ClientAgent()
  const { client, created } = await agent.upsert(user.id, {
    name,
    email: body.email ? String(body.email).trim() : undefined,
    phone: body.phone ? String(body.phone).trim() : undefined,
    notes: body.notes ? String(body.notes).trim() : undefined,
  })

  return NextResponse.json({ client, created })
}
