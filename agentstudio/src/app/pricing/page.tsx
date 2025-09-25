'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Crown, Zap, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { stripePromise, PRICING_PLANS } from '@/lib/stripe'
import { User } from '@supabase/supabase-js'

export default function PricingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const initPage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get current subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        setCurrentSubscription(subscription)
      }
    }
    initPage()
  }, [])

  const handleSubscribe = async (planKey: string) => {
  console.log('🚀 handleSubscribe called with:', planKey)
  
  if (!user) {
    console.log('❌ No user, redirecting to auth')
    router.push('/auth')
    return
  }

  const plan = PRICING_PLANS[planKey as keyof typeof PRICING_PLANS]
  console.log('📋 Plan selected:', plan)
  
  setLoading(plan.priceId)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔐 Session token exists:', !!session?.access_token)
    
    console.log('🌐 Making request to /api/stripe/checkout')
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ 
        priceId: plan.priceId,
        planName: planKey
      })
    })

    console.log('📨 Response status:', response.status)
    
    const data = await response.json()
    console.log('📨 Response data:', data)
    
    if (data.sessionId) {
      console.log('✅ Got sessionId, redirecting to Stripe')
      const stripe = await stripePromise
      const { error } = await stripe!.redirectToCheckout({ sessionId: data.sessionId })
      if (error) {
        console.error('❌ Stripe redirect error:', error)
        alert('Errore nel reindirizzamento al pagamento')
      }
    } else {
      console.error('❌ No sessionId received:', data.error)
      throw new Error(data.error || 'Errore nel pagamento')
    }
  } catch (error) {
    console.error('❌ Payment error:', error)
    alert('Errore nel processo di pagamento: ' + error.message)
  } finally {
    setLoading(null)
  }
}
  const planIcons = {
    starter: Sparkles,
    professional: Crown,
    enterprise: Zap
  }

  const isCurrentPlan = (planKey: string) => {
    return currentSubscription?.plan_name === planKey
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <nav className="px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">AgentStudio</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-sm font-semibold text-white hover:text-purple-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </button>
            ) : (
              <a href="/auth" className="text-sm font-semibold text-white hover:text-purple-300">
                Accedi
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white mb-4">
              Scegli il piano perfetto per il tuo studio
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Inizia con 14 giorni gratuiti. Cambia o cancella quando vuoi.
            </p>
            <div className="inline-flex items-center bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
              <Check className="h-4 w-4 text-green-400 mr-2" />
              <span className="text-green-100 text-sm font-medium">
                Prova gratuita di 14 giorni • Nessun impegno
              </span>
            </div>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(PRICING_PLANS).map(([key, plan]) => {
              const Icon = planIcons[key as keyof typeof planIcons]
              const isPopular = key === 'professional'
              const isCurrent = isCurrentPlan(key)
              
              return (
                <div
                  key={key}
                  className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border transition-all ${
                    isPopular ? 'border-purple-500 scale-105' : 'border-gray-700'
                  } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Più Popolare
                      </div>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-4 right-4">
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Attuale
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <Icon className={`h-12 w-12 mx-auto mb-4 ${
                      isPopular ? 'text-purple-400' : 'text-gray-400'
                    }`} />
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white">€{plan.price}</span>
                      <span className="text-gray-400 ml-1">/mese</span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {key === 'starter' ? 'Perfetto per iniziare' : 
                       key === 'professional' ? 'Il più scelto dai professionisti' :
                       'Soluzione enterprise completa'}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={loading === plan.priceId || isCurrent}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isCurrent
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : isPopular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {isCurrent ? 'Piano Attuale' :
                     loading === plan.priceId ? 'Caricamento...' : 
                     currentSubscription ? 'Cambia Piano' : 'Inizia Prova Gratuita'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}