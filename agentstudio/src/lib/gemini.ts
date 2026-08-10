import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! })

export class ClientAgent {
  async respond(message: string, userEmail: string) {
    const prompt = `Sei l'assistente AI di uno studio professionale italiano. 
    
Il cliente scrive: "${message}"
Email cliente: ${userEmail}

Rispondi in modo professionale, cortese e utile. Usa il "Lei" formale.
Puoi aiutare con:
- Informazioni sui servizi dello studio
- Prenotazione appuntamenti
- Domande generali
- Orientamento

Non fornire consigli legali specifici. Mantieni un tono professionale italiano.`

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    return result.text ?? ''
  }
}
