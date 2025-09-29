import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TeamService } from '@/lib/teamService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
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

    const teamService = new TeamService()
    const teams = await teamService.getUserTeams(user.id)

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Teams API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

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

    const { teamName, subscriptionId } = await request.json()

    if (!teamName || !subscriptionId) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    const teamService = new TeamService()
    const team = await teamService.createTeamForUser(user.id, subscriptionId, teamName)

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json({ error: 'Errore nella creazione del team' }, { status: 500 })
  }
}