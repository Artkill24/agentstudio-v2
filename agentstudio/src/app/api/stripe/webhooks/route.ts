import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Versione semplificata per testing senza signature verification
export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received')
  
  try {
    const body = await request.json()
    console.log('📋 Event type:', body.type)
    console.log('📋 Event data:', JSON.stringify(body, null, 2))
    
    // Log del webhook - utile per debugging
    switch (body.type) {
      case 'checkout.session.completed':
        console.log('✅ Checkout completed:', body.data.object.id)
        break
        
      case 'customer.subscription.updated':
        console.log('🔄 Subscription updated:', body.data.object.id)
        break
        
      default:
        console.log('ℹ️  Other event:', body.type)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}