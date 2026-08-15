import { freeGenerate } from './free-llm-client'

interface ResearchQuery {
  query: string
  category: 'jurisprudence' | 'regulations' | 'precedents' | 'general'
  jurisdiction?: string
}

interface StudioProfile {
  studio_name: string
  studio_type: string
  practice_areas: string[]
  location: string
}

export interface ResearchSource {
  title?: string
  url: string
}

interface TavilyResult {
  title: string
  url: string
  content: string
}

interface TavilyResponse {
  results: TavilyResult[]
  answer?: string
}

async function tavilySearch(query: string): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY non configurata')
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: 6,
      include_answer: false,
      country: 'italy',
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily error: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

export class ResearchAgent {
  async research(query: ResearchQuery, profile: StudioProfile) {
    // 1. Ricerca web reale con Tavily — fonti verificabili, non inventate
    const searchResults = await tavilySearch(
      `${query.query} normativa italiana ${query.jurisdiction ?? ''}`.trim()
    )

    if (!searchResults.results || searchResults.results.length === 0) {
      return {
        query: query.query,
        category: query.category,
        results: 'Nessuna fonte trovata per questa ricerca. Prova a riformulare la domanda.',
        sources: [] as ResearchSource[],
        timestamp: new Date().toISOString(),
        studio: profile.studio_name,
      }
    }

    const sources: ResearchSource[] = searchResults.results.map((r) => ({
      title: r.title,
      url: r.url,
    }))

    // 2. Sintesi in italiano via Groq, usando SOLO il contenuto trovato da Tavily
    const sourcesText = searchResults.results
      .map((r, i) => `Fonte ${i + 1} — ${r.title} (${r.url}):\n${r.content}`)
      .join('\n\n')

    const synthesisPrompt = this.buildSynthesisPrompt(query, profile, sourcesText)
    const synthesis = await freeGenerate(synthesisPrompt, { temperature: 0.2, maxTokens: 1500 })

    return {
      query: query.query,
      category: query.category,
      results: synthesis.text,
      sources,
      timestamp: new Date().toISOString(),
      studio: profile.studio_name,
    }
  }

  private buildSynthesisPrompt(
    query: ResearchQuery,
    profile: StudioProfile,
    sourcesText: string
  ): string {
    const categoryLabel: Record<ResearchQuery['category'], string> = {
      jurisprudence: 'giurisprudenza e sentenze',
      regulations: 'normativa e adempimenti',
      precedents: 'precedenti e casistica pratica',
      general: 'panoramica generale',
    }

    return `Sei un assistente di ricerca giuridica per ${profile.studio_name}, uno ${profile.studio_type} con sede a ${profile.location}.

Domanda: "${query.query}"
Focus richiesto: ${categoryLabel[query.category]}

Di seguito il contenuto REALE trovato tramite ricerca web. Usa SOLO queste informazioni per rispondere.
Non aggiungere riferimenti normativi, sentenze o dati che non compaiono nelle fonti sottostanti.
Se le fonti non coprono un aspetto della domanda, dillo esplicitamente invece di inventare.

${sourcesText}

Scrivi una sintesi in italiano, professionale e organizzata in sezioni brevi, che risponda alla domanda basandoti esclusivamente su queste fonti. Non citare i numeri delle fonti nel testo (es. "Fonte 1"), scrivi in prosa naturale.`
  }

  async getResearchSuggestions(profile: StudioProfile): Promise<string[]> {
    const suggestions: Record<string, string[]> = {
      'Studio Legale': [
        "Novità Codice della Crisi d'Impresa",
        'Riforma del processo civile',
        'GDPR e responsabilità privacy',
        'Contratti internazionali post-Brexit',
        'Nuove norme antiriciclaggio',
      ],
      'Studio Commercialista': [
        'Aggiornamenti fiscali 2026',
        'Decreto crescita e agevolazioni',
        'ISA e controlli automatizzati',
        'Fatturazione elettronica B2B',
        'Bonus investimenti industria 4.0',
      ],
      'Studio Notarile': [
        'Semplificazioni atti notarili',
        'Digitale per il notariato',
        'Successioni e trust',
        'Compravendite immobiliari 2026',
        'APE convenzionale nuove regole',
      ],
    }

    return suggestions[profile.studio_type] || suggestions['Studio Legale']
  }
}
