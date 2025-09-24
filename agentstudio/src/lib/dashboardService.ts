import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class DashboardService {
  async getUserStats(userId: string) {
    // Get documents count
    const { data: documents, count: documentsCount } = await supabase
      .from('generated_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Get research count
    const { data: research, count: researchCount } = await supabase
      .from('research_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Get recent activity
    const { data: recentDocs } = await supabase
      .from('generated_documents')
      .select('title, document_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentResearch } = await supabase
      .from('research_history')
      .select('query, category, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Calculate time saved (rough estimate)
    const timeSaved = (documentsCount || 0) * 2 + (researchCount || 0) * 1.5 // hours

    return {
      stats: {
        documentsGenerated: documentsCount || 0,
        researchQueries: researchCount || 0,
        timeSavedHours: Math.round(timeSaved),
        totalSessions: (documentsCount || 0) + (researchCount || 0)
      },
      recentActivity: [
        ...(recentDocs?.map(doc => ({
          type: 'document' as const,
          title: doc.title,
          subtitle: doc.document_type,
          timestamp: doc.created_at
        })) || []),
        ...(recentResearch?.map(research => ({
          type: 'research' as const,
          title: research.query,
          subtitle: research.category,
          timestamp: research.created_at
        })) || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8)
    }
  }

  async getAgentStatus(userId: string) {
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Check recent usage to determine "active" status
    const { count: recentDocs } = await supabase
      .from('generated_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', lastWeek.toISOString())

    const { count: recentResearch } = await supabase
      .from('research_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', lastWeek.toISOString())

    return {
      clientAgent: {
        status: 'active' as const,
        lastUsed: 'Sempre attivo',
        usage: 'Chat disponibile 24/7'
      },
      documentAgent: {
        status: (recentDocs || 0) > 0 ? 'active' : 'idle' as const,
        lastUsed: (recentDocs || 0) > 0 ? 'Questa settimana' : 'Mai utilizzato',
        usage: `${recentDocs || 0} documenti generati`
      },
      researchAgent: {
        status: (recentResearch || 0) > 0 ? 'active' : 'idle' as const,
        lastUsed: (recentResearch || 0) > 0 ? 'Questa settimana' : 'Mai utilizzato', 
        usage: `${recentResearch || 0} ricerche effettuate`
      }
    }
  }
}