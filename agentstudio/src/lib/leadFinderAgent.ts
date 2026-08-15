import { tavilySearch } from './researchAgent'
import { freeGenerate } from './free-llm-client'

interface StudioProfile {
  studio_name: string
  studio_type: string
  practice_areas: string[]
  location: string
}

export interface Lead {
  name: string
  reason: string
  source: string
}

export interface LeadSearchResult {
  leads: Lead[]
  sources: Array<{ title?: string; url: string }>
  disclaimer: string
}

export class LeadFinderAgent {
  async findPotentialClients(
    profile: StudioProfile,
    options?: { sector?: string; location?: string }
  ): Promise<LeadSearchResult> {
    const location = options?.location ?? profile.location
    const sector = options?.sector

    const query = sector
      ? `aziende ${sector} a ${location} settore in crescita nuove imprese`
      : `nuove aziende imprese startup a ${location} ${profile.practice_areas[0] ?? ''}`

    const searchResults = await tavilySearch(query)

    if (!searchResults.results || searchResults.results.length === 0) {
      return {
        leads: [],
        sources: [],
        disclaimer: 'Nessun risultato trovato per questa ricerca. Prova con un settore o una città diversi.',
      }
    }

    const sourcesText = searchResults.results
      .slice(0, 6)
      .map((r, i) => `Fonte ${i + 1} — ${r.title} (${r.url}):\n${r.content}`)
      .join('\n\n')

    const prompt = `Sei un assistente di business development per ${profile.studio_name}, uno ${profile.studio_type} con sede a ${location}, specializzato in: ${profile.practice_areas.join(', ')}.

Analizza SOLO il testo di ricerca sottostante ed estrai nomi di aziende, imprese o organizzazioni REALMENTE MENZIONATE nel testo che potrebbero avere bisogno dei servizi di questo tipo di studio professionale (es. nuove attività che necessitano consulenza legale/fiscale, aziende in espansione, ecc.).

REGOLE FERREE:
- NON inventare nomi di aziende che non sono esplicitamente citati nel testo
- Se il testo non menziona aziende specifiche per nome, restituisci un array vuoto
- Per ogni azienda, spiega in una frase perché potrebbe essere un potenziale cliente per questo studio
- Massimo 8 risultati
- Rispondi SOLO con un array JSON valido: [{"name": "Nome Azienda", "reason": "motivo breve"}]

Testo:
"""
${sourcesText}
"""`

    const result = await freeGenerate(prompt, { temperature: 0.2, maxTokens: 1200 })

    let leads: Lead[] = []
    try {
      const cleaned = result.text.replace(/```json\s*|\s*```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) {
        leads = parsed
          .filter((l) => l && typeof l.name === 'string' && typeof l.reason === 'string')
          .map((l) => ({ name: l.name, reason: l.reason, source: searchResults.results[0]?.url ?? '' }))
      }
    } catch {
      leads = []
    }

    return {
      leads,
      sources: searchResults.results.slice(0, 6).map((r) => ({ title: r.title, url: r.url })),
      disclaimer:
        'Risultati da ricerca web pubblica. Vanno sempre verificati e qualificati manualmente prima di qualsiasi contatto commerciale — non è una lista di contatti pronta all\'uso.',
    }
  }
}
