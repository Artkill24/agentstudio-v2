import { tavilySearch } from './researchAgent'
import { freeGenerate } from './free-llm-client'
import { DeadlineAgent } from './deadlineAgent'

interface FiscalDeadlineDraft {
  title: string
  dueDate: string // YYYY-MM-DD
}

export interface FiscalCalendarResult {
  added: number
  skipped: number
  deadlines: string[]
  sources: Array<{ title?: string; url: string }>
}

export class FiscalCalendarAgent {
  async populate(userId: string, year?: number): Promise<FiscalCalendarResult> {
    const targetYear = year ?? new Date().getFullYear()

    const searchResults = await tavilySearch(
      `calendario scadenze fiscali ${targetYear} Agenzia delle Entrate F24 IVA`
    )

    if (!searchResults.results || searchResults.results.length === 0) {
      return { added: 0, skipped: 0, deadlines: [], sources: [] }
    }

    const sourcesText = searchResults.results
      .slice(0, 5)
      .map((r, i) => `Fonte ${i + 1} — ${r.title} (${r.url}):\n${r.content}`)
      .join('\n\n')

    const prompt = `Sei un assistente che estrae scadenze fiscali italiane da testo di ricerca web reale.

Anno di riferimento: ${targetYear}

Analizza SOLO il testo sottostante ed estrai le scadenze fiscali con una data ESATTA (giorno, mese, anno) esplicitamente indicata nel testo. 

REGOLE FERREE:
- NON inventare o dedurre date che non sono scritte esplicitamente nel testo
- NON includere scadenze con date vaghe ("entro il mese", "generalmente a giugno")
- Se non trovi date esatte, restituisci un array vuoto
- Massimo 12 scadenze
- Rispondi SOLO con un array JSON valido, nessun testo prima o dopo, formato:
[{"title": "Descrizione breve della scadenza", "dueDate": "YYYY-MM-DD"}]

Testo:
"""
${sourcesText}
"""`

    const result = await freeGenerate(prompt, { temperature: 0.1, maxTokens: 1500 })

    let drafts: FiscalDeadlineDraft[] = []
    try {
      const cleaned = result.text.replace(/```json\s*|\s*```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) {
        drafts = parsed.filter(
          (d) => d && typeof d.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)
        )
      }
    } catch {
      drafts = []
    }

    const deadlineAgent = new DeadlineAgent()
    const addedTitles: string[] = []
    let skipped = 0

    for (const draft of drafts) {
      try {
        await deadlineAgent.create(userId, {
          title: draft.title,
          dueDate: draft.dueDate,
          category: 'fiscal',
          notes: `Importato automaticamente dal calendario fiscale ${targetYear}. Verifica sempre con il calendario ufficiale Agenzia delle Entrate o il tuo commercialista, le scadenze possono variare.`,
        })
        addedTitles.push(`${draft.title} (${draft.dueDate})`)
      } catch {
        skipped++
      }
    }

    return {
      added: addedTitles.length,
      skipped,
      deadlines: addedTitles,
      sources: searchResults.results.slice(0, 5).map((r) => ({ title: r.title, url: r.url })),
    }
  }
}
