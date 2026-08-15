import { freeGenerate } from './free-llm-client'

// pdf-parse è CommonJS senza types ufficiali affidabili — import dinamico
// evita problemi di bundling lato server Next.js.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  return data.text
}

export interface ContractAnalysis {
  summary: string
  risks: string[]
  missingClauses: string[]
  fileName: string
}

export class ContractAnalyzer {
  async analyze(fileBuffer: Buffer, fileName: string): Promise<ContractAnalysis> {
    const text = await extractPdfText(fileBuffer)

    if (!text || text.trim().length < 50) {
      throw new Error('Impossibile estrarre testo dal PDF (potrebbe essere una scansione senza OCR)')
    }

    // Limite prudente per non sforare i token dei modelli free
    const truncated = text.slice(0, 12000)

    const prompt = `Sei un assistente legale che analizza contratti per uno studio professionale italiano.

Analizza il seguente contratto e rispondi SOLO in formato JSON valido, senza testo prima o dopo, con questa struttura esatta:
{
  "summary": "sintesi in 2-3 frasi di cosa regola il contratto",
  "risks": ["rischio 1 specifico e concreto", "rischio 2", ...],
  "missingClauses": ["clausola mancante 1", "clausola mancante 2", ...]
}

Regole:
- "risks": individua clausole squilibrate, ambigue, o potenzialmente sfavorevoli per una delle parti. Sii specifico (cita la clausola), non generico.
- "missingClauses": elenca le clausole standard che ti aspetteresti in un contratto di questo tipo secondo il diritto italiano e che non sono presenti (es. foro competente, recesso, privacy GDPR, penali).
- Se non trovi rischi o clausole mancanti rilevanti, restituisci array vuoti — non inventare per riempire.
- Massimo 6 elementi per array.

Testo del contratto:
"""
${truncated}
"""`

    const result = await freeGenerate(prompt, { temperature: 0.2, maxTokens: 1500 })

    let parsed: { summary: string; risks: string[]; missingClauses: string[] }
    try {
      // Rimuove eventuali fence markdown ```json che alcuni modelli aggiungono
      const cleaned = result.text.replace(/```json\s*|\s*```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback: se il modello non ha rispettato il JSON, restituiamo il testo grezzo come summary
      parsed = { summary: result.text, risks: [], missingClauses: [] }
    }

    return {
      summary: parsed.summary || 'Analisi non disponibile',
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      missingClauses: Array.isArray(parsed.missingClauses) ? parsed.missingClauses : [],
      fileName,
    }
  }
}
