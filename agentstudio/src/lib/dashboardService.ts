import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class DashboardService {
  async getUserStats(userId: string) {
    // Conta documenti generati
    const { count: docsCount } = await supabase
      .from('generated_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Conta fatture generate
    const { count: invoicesCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Conta ricerche
    const { count: researchCount } = await supabase
      .from('research_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Attività recenti (ultimi 10)
    const { data: recentDocs } = await supabase
      .from('generated_documents')
      .select('document_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentInvoices } = await supabase
      .from('invoices')
      .select('invoice_number, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentResearch } = await supabase
      .from('research_history')
      .select('query, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Combina e ordina attività
    const activities = [
      ...(recentDocs || []).map(doc => ({
        type: 'document',
        title: `Documento: ${doc.document_type}`,
        subtitle: 'Generato con Document Agent',
        timestamp: doc.created_at
      })),
      ...(recentInvoices || []).map(inv => ({
        type: 'invoice',
        title: `Fattura ${inv.invoice_number}`,
        subtitle: 'Generata con Invoice Generator',
        timestamp: inv.created_at
      })),
      ...(recentResearch || []).map(res => ({
        type: 'research',
        title: `Ricerca: ${res.query.substring(0, 50)}...`,
        subtitle: 'Ricerca con Research Agent',
        timestamp: res.created_at
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    const totalDocs = (docsCount || 0) + (invoicesCount || 0)

    return {
      stats: {
        documentsGenerated: totalDocs,
        researchQueries: researchCount || 0,
        timeSavedHours: Math.round(totalDocs * 2 + (researchCount || 0) * 1.5),
        totalSessions: totalDocs + (researchCount || 0)
      },
      recentActivity: activities
    }
  }

  async getAgentStatus(userId: string) {
    // Conta documenti ultimi 7 giorni
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentDocs } = await supabase
      .from('generated_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: recentInvoices } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: recentResearch } = await supabase
      .from('research_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())

    const totalRecent = (recentDocs || 0) + (recentInvoices || 0)

    return {
      documentAgent: {
        status: totalRecent > 0 ? 'active' : 'idle',
        usage: totalRecent > 0 ? `${totalRecent} documenti questa settimana` : '0 documenti generati'
      },
      researchAgent: {
        status: (recentResearch || 0) > 0 ? 'active' : 'idle',
        usage: (recentResearch || 0) > 0 ? `${recentResearch} ricerche questa settimana` : '0 ricerche effettuate'
      }
    }
  }
}