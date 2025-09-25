import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
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

    // Get subscription from database
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({
        plan: 'free',
        status: 'inactive',
        limits: {
          documents: 5,
          research: 3,
          users: 1
        }
      })
    }

    // Get live subscription data from Stripe
    let stripeSubscription = null
    if (subscription.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error)
      }
    }

    // Determine plan limits
    const planLimits = {
      starter: { documents: 50, research: 20, users: 1 },
      professional: { documents: -1, research: -1, users: 5 },
      enterprise: { documents: -1, research: -1, users: -1 },
      free: { documents: 5, research: 3, users: 1 }
    }

    const currentPlan = subscription.plan_name || 'free'
    const limits = planLimits[currentPlan as keyof typeof planLimits] || planLimits.free

    return NextResponse.json({
      plan: currentPlan,
      status: stripeSubscription?.status || subscription.status,
      trialEnd: subscription.trial_ends_at,
      currentPeriodEnd: subscription.current_period_end,
      limits: limits,
      stripeCustomerId: subscription.stripe_customer_id
    })

  } catch (error) {
    console.error('Subscription API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}