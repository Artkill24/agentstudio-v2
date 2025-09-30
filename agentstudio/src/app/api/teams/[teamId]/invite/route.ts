import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TeamService } from '@/lib/teamService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
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

    const { teamId } = await context.params // FIX: await params

    const teamService = new TeamService()
    
    try {
      const invitation = await teamService.inviteTeamMember(teamId, email, role, user.id)
      return NextResponse.json({ invitation })
    } catch (error: any) {
      // Handle duplicate invitation
      if (error?.code === '23505') {
        return NextResponse.json({ 
          error: 'Questo utente è già stato invitato al team' 
        }, { status: 400 })
      }
      throw error
    }

  } catch (error) {
    console.error('Team invite API error:', error)
    return NextResponse.json({ error: 'Errore nell\'invio dell\'invito' }, { status: 500 })
  }
}