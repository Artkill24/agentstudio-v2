'use client'

import { X, Settings, FileText, Search, Clock, TrendingUp } from 'lucide-react'
import SubscriptionCard from './SubscriptionCard'

interface SettingsModalProps {
  onClose: () => void
  subscriptionData: any
  dashboardData: any
}

export default function SettingsModal({ onClose, subscriptionData, dashboardData }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10">
      <div className="w-full max-w-2xl mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-400" />
            <h2 className="text-white font-semibold">Impostazioni</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-800 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats rapide */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Statistiche</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <FileText className="h-4 w-4 text-blue-400 mb-1" />
                <p className="text-xl font-bold text-white">{dashboardData?.stats?.documentsGenerated || 0}</p>
                <p className="text-xs text-gray-500">Documenti</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <Search className="h-4 w-4 text-green-400 mb-1" />
                <p className="text-xl font-bold text-white">{dashboardData?.stats?.researchQueries || 0}</p>
                <p className="text-xs text-gray-500">Ricerche</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <Clock className="h-4 w-4 text-purple-400 mb-1" />
                <p className="text-xl font-bold text-white">{dashboardData?.stats?.timeSavedHours || 0}h</p>
                <p className="text-xs text-gray-500">Risparmiate</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <TrendingUp className="h-4 w-4 text-orange-400 mb-1" />
                <p className="text-xl font-bold text-white">{dashboardData?.stats?.totalSessions || 0}</p>
                <p className="text-xs text-gray-500">Sessioni</p>
              </div>
            </div>
          </div>

          {/* Piano e abbonamento */}
          {subscriptionData && dashboardData && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Piano</h3>
              <SubscriptionCard
                subscription={{
                  plan: subscriptionData.plan || 'free',
                  status: subscriptionData.status || 'active',
                  limits: subscriptionData.limits || { documents: 5, research: 3, chat: 50 },
                  resetAt: subscriptionData.resetAt,
                }}
                usage={{
                  usage: {
                    documents: dashboardData.stats?.documentsGenerated || 0,
                    research: dashboardData.stats?.researchQueries || 0,
                  },
                  limits: subscriptionData.limits || { documents: 5, research: 3, chat: 50 },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
