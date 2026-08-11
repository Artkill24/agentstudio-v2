import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! })

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

export class ResearchAgent {
  async research(query: ResearchQuery, profile: StudioProfile) {
    const prompt = this.buildResearchPrompt(query, profile)

    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    })

    const content = result.text ?? ''

    const sources: ResearchSource[] =
      result.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk) => ({
          title: chunk.web?.title,
          url: chunk.web?.uri ?? '',
        }))
        .filter((s) => s.url !== '') ?? []

    return {
      query: query.query,
      category: query.category,
      results: content,
      sources,
      timestamp: new Date().toISOString(),
      studio: profile.studio_name,
    }
  }

  private buildResearchPrompt(query: ResearchQuery, profile: StudioProfile): string {
    const baseContext = `Sei un assistente specializzato nella ricerca giuridica per ${profile.studio_name}, 
uno ${profile.studio_type} con sede a ${profile.location}.
Aree di competenza: ${profile.practice_areas.join(', ')}.

Ricerca richiesta: "${query.query}"
Categoria: ${query.category}
${query.jurisdiction ? `Giurisdizione: ${query.jurisdiction}` : 'Giurisdizione: Italia'}

ISTRUZIONI:
1. Usa la ricerca web per trovare informazioni aggiornate e verificate per il contesto italiano
2. Cita SOLO fonti reali trovate tramite la ricerca (codici, leggi, sentenze) — non inventare mai riferimenti
3. Organizza la risposta in sezioni chiare
4. Includi riferimenti normativi rilevanti con estremi verificabili
5. Evidenzia aspetti pratici per l'applicazione professionale
6. Se non trovi fonti affidabili su un punto, dichiaralo esplicitamente invece di improvvisare`

    switch (query.category) {
      case 'jurisprudence':
        return `${baseContext}

Concentrati su:
- Giurisprudenza consolidata
- Sentenze recenti rilevanti
- Orientamenti giurisprudenziali
- Principi di diritto consolidati
- Massime e precedenti vincolanti

Struttura la risposta con:
- Principio generale
- Giurisprudenza consolidata
- Orientamenti recenti
- Implicazioni pratiche
- Riferimenti normativi`

      case 'regulations':
        return `${baseContext}

Concentrati su:
- Normativa nazionale e comunitaria applicabile
- Decreti attuativi e circolari
- Regolamenti settoriali
- Modifiche legislative recenti
- Adempimenti e scadenze

Struttura la risposta con:
- Quadro normativo di riferimento
- Disposizioni specifiche applicabili
- Obblighi e adempimenti
- Sanzioni previste
- Aspetti procedurali`

      case 'precedents':
        return `${baseContext}

Concentrati su:
- Precedenti giurisprudenziali similari
- Casistica pratica
- Strategie processuali utilizzate
- Esiti delle controversie
- Criteri interpretativi applicati

Struttura la risposta con:
- Casi similari identificati
- Strategie processuali efficaci
- Elementi distintivi del caso
- Possibili sviluppi
- Raccomandazioni operative`

      default:
        return `${baseContext}

Fornisci una ricerca completa che includa:
- Aspetti normativi
- Giurisprudenza rilevante
- Precedenti applicabili
- Considerazioni pratiche
- Bibliografia e fonti di approfondimento`
    }
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
