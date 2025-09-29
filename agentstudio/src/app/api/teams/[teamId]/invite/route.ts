import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TeamService } from '@/lib/teamService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
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

    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email e ruolo richiesti' }, { status: 400 })
    }

    const teamService = new TeamService()
    const invitation = await teamService.inviteTeamMember(params.teamId, email, role, user.id)

    // Here you would send invitation email (implement with your email service)
    // await sendInvitationEmail(email, invitation)

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Team invite API error:', error)
    return NextResponse.json({ error: 'Errore nell\'invio dell\'invito' }, { status: 500 })
  }
}