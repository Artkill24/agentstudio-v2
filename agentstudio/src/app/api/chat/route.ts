import { NextRequest, NextResponse } from 'next/server'
import { ClientAgent } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { message, userEmail } = await request.json()
    
    const agent = new ClientAgent()
    const response = await agent.respond(message, userEmail)
    
    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Errore nel servizio' }, { status: 500 })
  }
}