import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
}

interface UpsertClientInput {
  name: string
  email?: string
  phone?: string
  notes?: string
}

export class ClientAgent {
  async upsert(userId: string, input: UpsertClientInput): Promise<{ client: Client; created: boolean }> {
    // Cerca un match esistente per nome (case-insensitive)
    const { data: existing } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', input.name.trim())
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('clients')
        .update({
          email: input.email ?? existing.email,
          phone: input.phone ?? existing.phone,
          notes: input.notes ?? existing.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw new Error(`Impossibile aggiornare il cliente: ${error.message}`)
      return { client: data as Client, created: false }
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(`Impossibile creare il cliente: ${error.message}`)
    return { client: data as Client, created: true }
  }

  async list(userId: string, search?: string): Promise<Client[]> {
    let query = supabase.from('clients').select('*').eq('user_id', userId).order('name', { ascending: true })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(`Impossibile recuperare i clienti: ${error.message}`)
    return data as Client[]
  }

  async findByName(userId: string, name: string): Promise<Client | null> {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', name.trim())
      .maybeSingle()
    return (data as Client) ?? null
  }

  formatForModel(clients: Client[]): string {
    if (clients.length === 0) return 'Nessun cliente in rubrica.'
    return clients
      .map((c) => {
        const contact = [c.email, c.phone].filter(Boolean).join(' · ')
        return `- ${c.name}${contact ? ` (${contact})` : ''}`
      })
      .join('\n')
  }
}
