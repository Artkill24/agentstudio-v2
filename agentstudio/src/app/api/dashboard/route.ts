import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DashboardService } from '@/lib/dashboardService'

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

    const dashboardService = new DashboardService()
    const [stats, agentStatus] = await Promise.all([
      dashboardService.getUserStats(user.id),
      dashboardService.getAgentStatus(user.id)
    ])

    return NextResponse.json({ 
      stats: stats.stats,
      recentActivity: stats.recentActivity,
      agentStatus
    })
    
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}