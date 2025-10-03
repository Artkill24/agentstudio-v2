'use client'

import { useState } from 'react'
import { CreditCard, TrendingUp, Calendar, AlertCircle, Sparkles } from 'lucide-react'

interface SubscriptionCardProps {
  subscription: {
    plan: string
    status: string
    limits: {
      documents: number
      research: number
      chat: number
    }
    resetAt?: number
  }
  usage: {
    usage: {
      documents: number
      research: number
    }
    limits: {
      documents: number
      research: number
      chat: number
    }
  }
}

export default function SubscriptionCard({ subscription, usage }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 100
    const remaining = limit - used
    return Math.max(0, Math.min(100, (remaining / limit) * 100))
  }

  const getUsageColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500'
    if (percentage > 20) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    setError('')

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Sessione non valida')
      }

      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Errore nella creazione della sessione')
      }

      window.location.href = result.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const isPro = subscription.plan === 'professional' || subscription.plan === 'enterprise'
  const isActive = subscription.status === 'active'

  const planNames: Record<string, string> = {
    free: 'Piano Gratuito',
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Il Tuo Piano</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-purple-400">
              {planNames[subscription.plan] || subscription.plan}
            </span>
            {isActive && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
                Attivo
              </span>
            )}
            {isPro && <Sparkles className="h-5 w-5 text-yellow-400" />}
          </div>
        </div>
        <CreditCard className="h-10 w-10 text-purple-400" />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Documenti Mensili</span>
            <span className="text-white font-semibold">
              {subscription.limits.documents === -1 
                ? 'Illimitati' 
                : `${usage.usage.documents}/${subscription.limits.documents}`}
            </span>
          </div>
          {subscription.limits.documents !== -1 && (
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.usage.documents, subscription.limits.documents))}`}
                style={{ width: `${getUsagePercentage(usage.usage.documents, subscription.limits.documents)}%` }}
              />
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Ricerche Mensili</span>
            <span className="text-white font-semibold">
              {subscription.limits.research === -1 
                ? 'Illimitate' 
                : `${usage.usage.research}/${subscription.limits.research}`}
            </span>
          </div>
          {subscription.limits.research !== -1 && (
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.usage.research, subscription.limits.research))}`}
                style={{ width: `${getUsagePercentage(usage.usage.research, subscription.limits.research)}%` }}
              />
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Messaggi Chat</span>
            <span className="text-white font-semibold">
              {subscription.limits.chat === -1 ? 'Illimitati' : `${subscription.limits.chat}/mese`}
            </span>
          </div>
        </div>
      </div>

      {subscription.resetAt && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-700">
          <Calendar className="h-4 w-4" />
          <span>Reset utilizzo: {formatDate(subscription.resetAt)}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {!isPro && (
          <button
            onClick={() => window.location.href = '/pricing'}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Upgrade Piano</span>
          </button>
        )}
        
        <button
          onClick={handleManageSubscription}
          disabled={loading}
          className="w-full bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CreditCard className="h-4 w-4" />
          <span>{loading ? 'Caricamento...' : 'Gestisci Abbonamento'}</span>
        </button>
      </div>
    </div>
  )
}