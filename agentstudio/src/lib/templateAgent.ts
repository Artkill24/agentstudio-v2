import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DocumentTemplate {
  id: string
  name: string
  document_type: string
  content: string
}

export class TemplateAgent {
  async save(
    userId: string,
    input: { name: string; content: string; documentType?: string }
  ): Promise<DocumentTemplate> {
    // Se esiste già un template con lo stesso nome, lo aggiorna invece di duplicarlo
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', input.name.trim())
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('document_templates')
        .update({ content: input.content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(`Impossibile aggiornare il template: ${error.message}`)
      return data as DocumentTemplate
    }

    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        content: input.content,
        document_type: input.documentType ?? 'custom',
      })
      .select()
      .single()

    if (error) throw new Error(`Impossibile salvare il template: ${error.message}`)
    return data as DocumentTemplate
  }

  async list(userId: string): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) throw new Error(`Impossibile recuperare i template: ${error.message}`)
    return data as DocumentTemplate[]
  }

  async findByName(userId: string, name: string): Promise<DocumentTemplate | null> {
    const { data } = await supabase
      .from('document_templates')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', name.trim())
      .maybeSingle()
    return (data as DocumentTemplate) ?? null
  }

  /**
   * Sostituisce i segnaposto {{chiave}} nel template con i valori forniti.
   * Segnaposto senza valore corrispondente restano visibili (es. {{importo}})
   * così lo studio nota subito cosa manca, invece di sparire silenziosamente.
   */
  fill(template: DocumentTemplate, variables: Record<string, string>): string {
    return template.content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match
    })
  }

  formatListForModel(templates: DocumentTemplate[]): string {
    if (templates.length === 0) return 'Nessun template salvato.'
    return templates
      .map((t) => {
        const placeholders = [...t.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
        const uniquePlaceholders = [...new Set(placeholders)]
        return `- ${t.name} (${t.document_type})${uniquePlaceholders.length ? ` — segnaposto: ${uniquePlaceholders.join(', ')}` : ''}`
      })
      .join('\n')
  }
}
