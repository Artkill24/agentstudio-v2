import OpenAI from 'openai'
import { FREE_MODELS } from './ai-models'

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "AgentStudio"
  }
})

export async function generateWithFallback(
  prompt: string,
  systemPrompt?: string
) {
  const errors: string[] = []
  
  for (const model of FREE_MODELS) {
    try {
      console.log(`Trying model: ${model}`)
      
      const messages: Array<{role: string, content: string}> = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })
      
      const completion = await openrouter.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000
      })
      
      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in response')
      }
      
      console.log(`✓ Success with model: ${model}`)
      return content
      
    } catch (error: any) {
      const errorMsg = `${model}: ${error.message || error.toString()}`
      console.log(`✗ Failed: ${errorMsg}`)
      errors.push(errorMsg)
      continue
    }
  }
  
  throw new Error(`Tutti i modelli hanno fallito:\n${errors.join('\n')}`)
}

export async function chatWithFallback(
  messages: Array<{ role: string; content: string }>
) {
  const errors: string[] = []
  
  // Assicurati che i messaggi siano nel formato corretto
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: String(m.content)
  }))
  
  for (const model of FREE_MODELS) {
    try {
      console.log(`Trying model: ${model}`)
      
      const completion = await openrouter.chat.completions.create({
        model: model,
        messages: cleanMessages,
        temperature: 0.7,
        max_tokens: 2000
      })
      
      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in response')
      }
      
      console.log(`✓ Success with model: ${model}`)
      return content
      
    } catch (error: any) {
      const errorMsg = `${model}: ${error.message || error.toString()}`
      console.log(`✗ Failed: ${errorMsg}`)
      errors.push(errorMsg)
      continue
    }
  }
  
  throw new Error(`Tutti i modelli hanno fallito:\n${errors.join('\n')}`)
}