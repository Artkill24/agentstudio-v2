import { freeGenerate } from './free-llm-client'

interface StudioProfile {
  studio_name: string
  studio_type: string
  location: string
  practice_areas: string[]
}

interface DocumentRequest {
  type: 'contract' | 'invoice' | 'letter' | 'privacy'
  clientName: string
  clientEmail?: string
  amount?: string
  description?: string
  subject?: string
}

export class DocumentAgent {
  async generateDocument(request: DocumentRequest, profile: StudioProfile) {
    const prompt = this.buildPrompt(request, profile)

    const result = await freeGenerate(prompt, { temperature: 0.3, maxTokens: 4000 })

    return {
      title: this.generateTitle(request),
      content: result.text,
      type: request.type,
    }
  }

  private buildPrompt(request: DocumentRequest, profile: StudioProfile): string {
    const baseContext = `Sei un assistente specializzato nella generazione di documenti legali per ${profile.studio_name}, 
uno ${profile.studio_type} con sede a ${profile.location}.
Specializzazioni: ${profile.practice_areas.join(', ')}.`

    switch (request.type) {
      case 'contract':
        return `${baseContext}

Genera un contratto di prestazione professionale per:
Cliente: ${request.clientName}
Servizio: ${request.description}
Importo: €${request.amount}

Il contratto deve essere formale, completo e conforme al diritto italiano. Include:
- Oggetto del contratto
- Obblighi delle parti
- Corrispettivo e modalità di pagamento
- Clausole privacy GDPR
- Foro competente

Usa un linguaggio professionale ma comprensibile.`

      case 'invoice':
        return `${baseContext}

Genera una fattura professionale per:
Cliente: ${request.clientName}
Descrizione: ${request.description}
Importo: €${request.amount}

Include tutti gli elementi richiesti per la fatturazione italiana:
- Numero fattura progressivo
- Data emissione
- Dati prestatore e cliente
- Descrizione prestazione
- Imponibile, IVA, totale
- Modalità di pagamento`

      case 'letter':
        return `${baseContext}

Genera una lettera professionale per:
Destinatario: ${request.clientName}
Oggetto: ${request.subject}
Contenuto: ${request.description}

La lettera deve essere formale, cortese e professionale secondo lo stile italiano.`

      case 'privacy':
        return `${baseContext}

Genera una informativa privacy conforme GDPR per il nostro studio.
Deve includere:
- Finalità del trattamento
- Base giuridica
- Categorie di dati
- Diritti dell'interessato
- Modalità di contatto`

      default:
        return `${baseContext}\n\nGenera un documento professionale per ${request.clientName}.`
    }
  }

  private generateTitle(request: DocumentRequest): string {
    switch (request.type) {
      case 'contract':
        return `Contratto di Prestazione - ${request.clientName}`
      case 'invoice':
        return `Fattura - ${request.clientName}`
      case 'letter':
        return `Lettera - ${request.subject || request.clientName}`
      case 'privacy':
        return 'Informativa Privacy GDPR'
      default:
        return `Documento - ${request.clientName}`
    }
  }
}
