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

// Helper function to safely convert timestamps
function safeTimestampToISOString(timestamp: number | null | undefined): string | null {
  if (!timestamp || timestamp <= 0) return null
  try {
    return new Date(timestamp * 1000).toISOString()
  } catch (error) {
    console.error('Invalid timestamp:', timestamp, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  // Skip signature verification in development for now
  if (process.env.NODE_ENV === 'development' && !process.env.STRIPE_WEBHOOK_SECRET) {
    event = JSON.parse(body)
  } else {
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  console.log('Processing webhook:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout completed:', session.id)
  
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  
  if (!subscriptionId) return

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_price_id: subscription.items.data[0]?.price.id || null,
        status: subscription.status,
        current_period_start: safeTimestampToISOString(subscription.current_period_start),
        current_period_end: safeTimestampToISOString(subscription.current_period_end),
        trial_ends_at: safeTimestampToISOString(subscription.trial_end),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error updating subscription after checkout:', error)
    } else {
      console.log('Successfully updated subscription after checkout')
    }
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id)
  
  const customerId = subscription.customer as string
  
  try {
    // Get price ID safely
    const priceId = subscription.items?.data?.[0]?.price?.id || null
    
    // Map price ID to plan name (update with your real price IDs)
    let planName = 'professional'
    if (priceId) {
      // Add your actual price mappings here
      const priceToPlan: Record<string, string> = {
        'price_1SB0VsGgnEtxiTsGuvwWImJo': 'starter',
        'price_1SB0ZOGgnEtxiTsGj5dzNsp1': 'professional', 
        'price_ENTERPRISE_ID': 'enterprise'
      }
      planName = priceToPlan[priceId] || 'professional'
    }

    const updateData = {
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      plan_name: planName,
      current_period_start: safeTimestampToISOString(subscription.current_period_start),
      current_period_end: safeTimestampToISOString(subscription.current_period_end),
      trial_ends_at: safeTimestampToISOString(subscription.trial_end),
      updated_at: new Date().toISOString()
    }

    // Update subscription
    const { data: updatedSub, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('stripe_customer_id', customerId)
      .select('*, team_id, user_id')
      .single()

    if (error) {
      console.error('Error updating subscription:', error)
      return
    }

    // Create team if Professional+ and no team exists
    if ((planName === 'professional' || planName === 'enterprise') && !updatedSub.team_id) {
      console.log('Creating team for Professional+ subscription')
      
      const teamService = new TeamService()
      try {
        await teamService.createTeamForUser(
          updatedSub.user_id,
          updatedSub.id,
          `Team ${planName.charAt(0).toUpperCase() + planName.slice(1)}`
        )
        console.log('Team created successfully')
      } catch (teamError) {
        console.error('Error creating team:', teamError)
      }
    }

    console.log('Successfully updated subscription')
  } catch (error) {
    console.error('Error in handleSubscriptionUpdate:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id)
  
  const customerId = subscription.customer as string
  
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error updating canceled subscription:', error)
    } else {
      console.log('Successfully updated canceled subscription')
    }
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing payment success:', invoice.id)
  
  const customerId = invoice.customer as string
  
  try {
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: safeTimestampToISOString(subscription.current_period_start),
          current_period_end: safeTimestampToISOString(subscription.current_period_end),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('Error updating subscription after payment:', error)
      } else {
        console.log('Successfully updated subscription after payment')
      }
    }
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing payment failure:', invoice.id)
  
  const customerId = invoice.customer as string
  
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error updating subscription after payment failure:', error)
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Processing trial will end:', subscription.id)
  // Future: implement trial ending notifications
}