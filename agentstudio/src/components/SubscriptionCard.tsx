'use client'

import { useState } from 'react'
import { Crown, Calendar, TrendingUp, Settings, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SubscriptionCardProps {
  subscription: any
  usage: any
}

export default function SubscriptionCard({ subscription, usage }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)

  const manageSubscription = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Errore apertura portale')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'professional': return Crown
      case 'enterprise': return TrendingUp
      default: return Settings
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'professional': return 'text-purple-400 border-purple-500/50 bg-purple-500/10'
      case 'enterprise': return 'text-orange-400 border-orange-500/50 bg-orange-500/10'
      case 'starter': return 'text-blue-400 border-blue-500/50 bg-blue-500/10'
      default: return 'text-gray-400 border-gray-500/50 bg-gray-500/10'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const PlanIcon = getPlanIcon(subscription.plan)
  const planColorClass = getPlanColor(subscription.plan)

  return (
    <div className={`rounded-2xl border p-6 ${planColorClass}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <PlanIcon className="h-6 w-6" />
          <div>
            <h3 className="font-semibold text-white capitalize">
              Piano {subscription.plan}
            </h3>
            <p className={`text-sm ${subscription.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
              {subscription.status === 'trialing' ? 'Prova gratuita' : 
               subscription.status === 'active' ? 'Attivo' :
               subscription.status === 'past_due' ? 'Pagamento scaduto' : 
               subscription.status}
            </p>
          </div>
        </div>
        
        <button
          onClick={manageSubscription}
          disabled={loading}
          className="flex items-center space-x-2 text-xs px-3 py-1 rounded-full border border-current hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span>Caricamento...</span>
          ) : (
            <>
              <span>Gestisci</span>
              <ExternalLink className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {/* Trial info */}
      {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
          <div className="flex items-center text-blue-400 text-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Prova gratuita fino al {formatDate(subscription.trialEnd)}
          </div>
        </div>
      )}

      {/* Usage stats */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-300">Documenti questo mese</span>
            <span className="text-sm text-white">
              {usage.usage.documents}
              {usage.limits.documents > 0 ? ` / ${usage.limits.documents}` : ' / illimitati'}
            </span>
          </div>
          {usage.limits.documents > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getUsagePercentage(usage.usage.documents, usage.limits.documents)}%` }}
              />
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-300">Ricerche questo mese</span>
            <span className="text-sm text-white">
              {usage.usage.research}
              {usage.limits.research > 0 ? ` / ${usage.limits.research}` : ' / illimitate'}
            </span>
          </div>
          {usage.limits.research > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getUsagePercentage(usage.usage.research, usage.limits.research)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Next billing */}
      {subscription.currentPeriodEnd && subscription.status === 'active' && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <p className="text-xs text-gray-400">
            Prossimo rinnovo: {formatDate(subscription.currentPeriodEnd)}
          </p>
        </div>
      )}
    </div>
  )
}