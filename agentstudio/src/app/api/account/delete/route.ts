import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteUserAccount } from '@/lib/accountDeletion'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Token non valido' }, { status: 401 })

  const body = await request.json()
  const confirmation = String(body.confirmation ?? '').trim()

  // Richiediamo che l'utente digiti esattamente la propria email, non un generico "sì" —
  // è un'azione irreversibile e la conferma deve essere intenzionale, non un click accidentale.
  if (confirmation.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return NextResponse.json(
      { error: 'Conferma non corretta. Digita esattamente la tua email per confermare.' },
      { status: 400 }
    )
  }

  const report = await deleteUserAccount(user.id)

  if (!report.success) {
    return NextResponse.json({ error: report.error ?? 'Eliminazione non riuscita', report }, { status: 500 })
  }

  return NextResponse.json({ success: true, report })
}
