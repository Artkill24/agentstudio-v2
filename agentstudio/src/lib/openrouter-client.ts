import OpenAI from 'openai'
import { FREE_MODELS } from './ai-models'

let _openrouter: OpenAI | null = null

function getClient(): OpenAI {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AgentStudio"
      }
    })
  }
  return _openrouter
}

export async function generateWithFallback(
  prompt: string,
  optionsOrSystemPrompt?: string | { temperature?: number; maxTokens?: number; systemPrompt?: string }
) {
  const opts = typeof optionsOrSystemPrompt === 'object' ? optionsOrSystemPrompt : {}
  const systemPrompt = typeof optionsOrSystemPrompt === 'string' ? optionsOrSystemPrompt : opts.systemPrompt

  const errors: string[] = []
  const attempted: string[] = []

  for (const model of FREE_MODELS) {
    try {
      attempted.push(model)
      console.log(`Trying model: ${model}`)

      const messages: Array<{ role: string; content: string }> = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const completion = await getClient().chat.completions.create({
        model: model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4000
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in response')
      }

      console.log(`✓ Success with model: ${model}`)
      return {
        text: content,
        model,
        modelsAttempted: attempted,
        tokensUsed: completion.usage?.total_tokens ?? null
      }

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
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
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

      const completion = await getClient().chat.completions.create({
        model: model,
        messages: cleanMessages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000
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
