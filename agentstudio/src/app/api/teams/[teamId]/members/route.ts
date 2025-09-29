import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TeamService } from '@/lib/teamService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
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

    const { teamId } = await context.params // FIX: await params

    const teamService = new TeamService()
    const members = await teamService.getTeamMembers(teamId)

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Team members API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}