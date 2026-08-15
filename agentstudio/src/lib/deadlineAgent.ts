import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type DeadlineCategory = 'fiscal' | 'legal' | 'invoice' | 'general'
export type DeadlineStatus = 'pending' | 'done' | 'overdue'

export interface Deadline {
  id: string
  title: string
  client_name: string | null
  due_date: string
  category: DeadlineCategory
  status: DeadlineStatus
  notes: string | null
}

interface CreateDeadlineInput {
  title: string
  dueDate: string // ISO yyyy-mm-dd
  clientName?: string
  category?: DeadlineCategory
  notes?: string
}

export class DeadlineAgent {
  async create(userId: string, input: CreateDeadlineInput): Promise<Deadline> {
    const { data, error } = await supabase
      .from('deadlines')
      .insert({
        user_id: userId,
        title: input.title,
        client_name: input.clientName ?? null,
        due_date: input.dueDate,
        category: input.category ?? 'general',
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(`Impossibile creare la scadenza: ${error.message}`)
    return data as Deadline
  }

  async list(
    userId: string,
    options?: { onlyPending?: boolean; withinDays?: number }
  ): Promise<Deadline[]> {
    let query = supabase
      .from('deadlines')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })

    if (options?.onlyPending) {
      query = query.neq('status', 'done')
    }

    if (options?.withinDays !== undefined) {
      const limit = new Date()
      limit.setDate(limit.getDate() + options.withinDays)
      query = query.lte('due_date', limit.toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) throw new Error(`Impossibile recuperare le scadenze: ${error.message}`)

    // Marca come overdue quelle passate ancora pending (calcolo, non persistito qui)
    const today = new Date().toISOString().slice(0, 10)
    return (data as Deadline[]).map((d) => ({
      ...d,
      status: d.status === 'pending' && d.due_date < today ? 'overdue' : d.status,
    }))
  }

  async markDone(userId: string, deadlineId: string): Promise<void> {
    const { error } = await supabase
      .from('deadlines')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', deadlineId)
      .eq('user_id', userId)

    if (error) throw new Error(`Impossibile aggiornare la scadenza: ${error.message}`)
  }

  formatForModel(deadlines: Deadline[]): string {
    if (deadlines.length === 0) return 'Nessuna scadenza trovata.'
    return deadlines
      .map((d) => {
        const statusLabel = d.status === 'overdue' ? 'SCADUTA' : d.status === 'done' ? 'Completata' : 'In corso'
        const client = d.client_name ? ` — cliente: ${d.client_name}` : ''
        return `- [${statusLabel}] ${d.title}${client} — scadenza: ${d.due_date} (${d.category})`
      })
      .join('\n')
  }
}
