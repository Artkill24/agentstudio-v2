import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    priceId: 'price_1SB0VsGgnEtxiTsGuvwWImJo', // Sostituire con vero price_id da Stripe
    features: [
      'Client Agent illimitato',
      '50 documenti/mese',
      '20 ricerche/mese',
      'Supporto email',
      '1 utente'
    ],
    limits: {
      documents: 50,
      research: 20,
      users: 1
    }
  },
  professional: {
    name: 'Professional', 
    price: 199,
    priceId: 'price_1SB0ZOGgnEtxiTsGj5dzNsp1', // Sostituire con vero price_id da Stripe
    features: [
      'Tutti gli agenti illimitati',
      'Documenti illimitati',
      'Ricerche illimitate',
      'Supporto prioritario',
      '5 utenti',
      'API access'
    ],
    limits: {
      documents: -1, // illimitati
      research: -1,
      users: 5
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 399,
    priceId: 'price_1SB0a5GgnEtxiTsGFJvAk5Dr', // Sostituire con vero price_id da Stripe
    features: [
      'Tutto del Professional',
      'Customizzazioni avanzate',
      'Utenti illimitati',
      'Supporto dedicato',
      'White-label',
      'SLA 99.9%'
    ],
    limits: {
      documents: -1,
      research: -1,
      users: -1
    }
  }
}