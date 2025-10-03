import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Nessun abbonamento attivo. Vai su /pricing per sottoscriverne uno.' },
        { status: 404 }
      )
    }

    // Verifica che il customer esista in Stripe
    try {
      await stripe.customers.retrieve(profile.stripe_customer_id)
    } catch (err: any) {
      if (err.code === 'resource_missing') {
        // Customer non esiste, pulisci il DB
        await supabase
          .from('studio_profiles')
          .update({ stripe_customer_id: null })
          .eq('user_id', user.id)
        
        return NextResponse.json(
          { error: 'Abbonamento non trovato. Ricarica la pagina.' },
          { status: 404 }
        )
      }
      throw err
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della sessione' },
      { status: 500 }
    )
  }
}