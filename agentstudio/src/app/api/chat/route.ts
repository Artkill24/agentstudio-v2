import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
    "X-Title": "AgentStudio"
  }
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const { message, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Messaggio mancante' }, { status: 400 })
    }

    const messages = [
      {
        role: "system",
        content: "Sei un assistente AI per studi professionali italiani. Rispondi in italiano professionale."
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ]

    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: messages
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Errore risposta'

    return NextResponse.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ 
      error: 'Errore nella chat' 
    }, { status: 500 })
  }
}