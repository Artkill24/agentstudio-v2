import OpenAI from 'openai'

// Tre provider free-tier, nessuno richiede carta di credito.
// Se il primo esaurisce la quota giornaliera, si passa al successivo.
// Tutti espongono un endpoint OpenAI-compatible.

interface ProviderConfig {
  name: string
  baseURL: string
  apiKeyEnv: string
  models: string[]
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'groq',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'],
  },
  {
    name: 'cerebras',
    baseURL: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
  },
  {
    name: 'cloudflare',
    // account ID va inserito nella env CLOUDFLARE_ACCOUNT_ID
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID || ''}/ai/v1`,
    apiKeyEnv: 'CLOUDFLARE_API_TOKEN',
    models: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
  },
]

const clients = new Map<string, OpenAI>()

function getClient(provider: ProviderConfig): OpenAI | null {
  const apiKey = process.env[provider.apiKeyEnv]
  if (!apiKey) return null

  if (!clients.has(provider.name)) {
    clients.set(provider.name, new OpenAI({ baseURL: provider.baseURL, apiKey }))
  }
  return clients.get(provider.name)!
}

interface FreeLLMResult {
  text: string
  model: string
  provider: string
  modelsAttempted: string[]
}

async function tryAllProviders(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<FreeLLMResult> {
  const errors: string[] = []
  const attempted: string[] = []

  for (const provider of PROVIDERS) {
    const client = getClient(provider)
    if (!client) {
      errors.push(`${provider.name}: chiave non configurata (${provider.apiKeyEnv})`)
      continue
    }

    for (const model of provider.models) {
      try {
        attempted.push(`${provider.name}/${model}`)
        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4000,
        })
        const content = completion.choices[0]?.message?.content
        if (!content) throw new Error('Risposta vuota')
        return { text: content, model, provider: provider.name, modelsAttempted: attempted }
      } catch (error: any) {
        errors.push(`${provider.name}/${model}: ${error.message || error.toString()}`)
        continue
      }
    }
  }

  throw new Error(`Tutti i provider free hanno fallito:\n${errors.join('\n')}`)
}

export async function freeGenerate(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<FreeLLMResult> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })
  return tryAllProviders(messages, options)
}

export async function freeChat(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const cleanMessages = messages.map((m) => ({
    role: m.role,
    content: String(m.content),
  })) as OpenAI.Chat.ChatCompletionMessageParam[]
  const result = await tryAllProviders(cleanMessages, {
    temperature: options?.temperature,
    maxTokens: options?.max_tokens,
  })
  return result.text
}
