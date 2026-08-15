import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface TimeEntry {
  id: string
  client_name: string
  description: string
  hours: number
  hourly_rate: number | null
  billed: boolean
  entry_date: string
}

interface LogTimeInput {
  clientName: string
  description: string
  hours: number
  hourlyRate?: number
}

export interface BillingSummary {
  clientName: string
  entries: TimeEntry[]
  totalHours: number
  totalAmount: number | null
}

export class TimeTrackingAgent {
  async logTime(userId: string, input: LogTimeInput): Promise<TimeEntry> {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        client_name: input.clientName.trim(),
        description: input.description,
        hours: input.hours,
        hourly_rate: input.hourlyRate ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(`Impossibile registrare le ore: ${error.message}`)
    return data as TimeEntry
  }

  async getUnbilledSummary(userId: string, clientName: string): Promise<BillingSummary> {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .ilike('client_name', clientName.trim())
      .eq('billed', false)
      .order('entry_date', { ascending: true })

    if (error) throw new Error(`Impossibile recuperare le ore: ${error.message}`)

    const entries = (data as TimeEntry[]) ?? []
    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0)
    const hasRates = entries.every((e) => e.hourly_rate !== null)
    const totalAmount = hasRates
      ? entries.reduce((sum, e) => sum + Number(e.hours) * Number(e.hourly_rate), 0)
      : null

    return {
      clientName,
      entries,
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: totalAmount !== null ? Math.round(totalAmount * 100) / 100 : null,
    }
  }

  async markBilled(userId: string, clientName: string): Promise<number> {
    const { data, error } = await supabase
      .from('time_entries')
      .update({ billed: true })
      .eq('user_id', userId)
      .ilike('client_name', clientName.trim())
      .eq('billed', false)
      .select('id')

    if (error) throw new Error(`Impossibile aggiornare le voci: ${error.message}`)
    return data?.length ?? 0
  }

  formatSummaryForModel(summary: BillingSummary): string {
    if (summary.entries.length === 0) {
      return `Nessuna ora non fatturata registrata per ${summary.clientName}.`
    }
    const lines = summary.entries.map(
      (e) => `- ${e.entry_date}: ${e.description} (${e.hours}h${e.hourly_rate ? ` × €${e.hourly_rate}/h` : ''})`
    )
    const totalLine = summary.totalAmount !== null
      ? `Totale: ${summary.totalHours}h — €${summary.totalAmount.toFixed(2)}`
      : `Totale: ${summary.totalHours}h (tariffa oraria non impostata su tutte le voci)`
    return [...lines, '', totalLine].join('\n')
  }
}
