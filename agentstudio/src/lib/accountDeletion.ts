import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tutte le tabelle che contengono dati legati a un utente. Cancelliamo esplicitamente
// riga per riga invece di affidarci solo a ON DELETE CASCADE sulle foreign key: alcune
// tabelle più vecchie del progetto potrebbero non avere quel vincolo configurato, e un
// diritto all'oblio non può dipendere da un'assunzione sullo schema.
const USER_DATA_TABLES = [
  'assistant_messages', // va cancellata prima di assistant_conversations (FK)
  'assistant_conversations',
  'deadlines',
  'document_templates',
  'time_entries',
  'clients',
  'generated_documents',
  'research_history',
  'studio_profiles',
  'subscriptions',
  'invoices',
  'team_members',
  'team_invitations',
] as const

export interface DeletionReport {
  success: boolean
  tablesCleared: string[]
  tablesFailed: string[]
  authDeleted: boolean
  error?: string
}

export async function deleteUserAccount(userId: string): Promise<DeletionReport> {
  const tablesCleared: string[] = []
  const tablesFailed: string[] = []

  for (const table of USER_DATA_TABLES) {
    try {
      const column = table === 'assistant_messages' ? null : 'user_id'

      if (table === 'assistant_messages') {
        // assistant_messages non ha user_id diretto, va filtrata tramite le conversazioni
        const { data: convs } = await supabase
          .from('assistant_conversations')
          .select('id')
          .eq('user_id', userId)
        const convIds = (convs ?? []).map((c) => c.id)
        if (convIds.length > 0) {
          await supabase.from('assistant_messages').delete().in('conversation_id', convIds)
        }
        tablesCleared.push(table)
        continue
      }

      const { error } = await supabase.from(table).delete().eq(column!, userId)
      if (error) {
        // Tabella potrebbe non esistere o non avere quella colonna — non blocchiamo il resto
        tablesFailed.push(`${table}: ${error.message}`)
      } else {
        tablesCleared.push(table)
      }
    } catch (err) {
      tablesFailed.push(`${table}: ${err instanceof Error ? err.message : 'errore sconosciuto'}`)
    }
  }

  // Infine, elimina l'account di autenticazione stesso
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)

  if (authError) {
    return {
      success: false,
      tablesCleared,
      tablesFailed,
      authDeleted: false,
      error: authError.message,
    }
  }

  return {
    success: true,
    tablesCleared,
    tablesFailed,
    authDeleted: true,
  }
}
