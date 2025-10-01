import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TeamService } from '@/lib/teamService'
import { emailService } from '@/lib/emailService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_ROLES = ['member', 'admin', 'viewer'] // Adjust based on your roles

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    // Verify environment configuration
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('NEXT_PUBLIC_APP_URL not configured')
      return NextResponse.json({ 
        error: 'Configurazione server non valida' 
      }, { status: 500 })
    }

    // Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Parse and validate request body
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email e ruolo richiesti' }, { status: 400 })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
    }

    // Validate role
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
    }

    const { teamId } = await context.params

    // Verify team exists and get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team non trovato' }, { status: 404 })
    }

    // Authorization check - verify user is member of the team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ 
        error: 'Non hai i permessi per invitare membri a questo team' 
      }, { status: 403 })
    }

    // Optional: Check if user has admin/owner role to invite
    if (!['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Solo amministratori possono invitare membri' 
      }, { status: 403 })
    }

    const teamService = new TeamService()
    
    try {
      // Create invitation
      const invitation = await teamService.inviteTeamMember(teamId, email, role, user.id)
      
      // Send invitation email (wrapped in try-catch to handle email failures gracefully)
      try {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/teams/accept/${invitation.id}`
        await emailService.sendTeamInvitation(
          email,
          team.name,
          user.email || 'Un collega',
          inviteLink
        )
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Log the error but don't fail the request
        // The invitation still exists and can be resent later
      }

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

  } catch (error: any) {
    console.error('Team invite API error:', error)
    
    // Return specific error message if available
    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Errore nell\'invio dell\'invito' 
    }, { status: 500 })
  }
}