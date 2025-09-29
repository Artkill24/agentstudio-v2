'use client'

import SubscriptionCard from '@/components/SubscriptionCard'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, 
  MessageCircle, 
  FileText, 
  Search, 
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Settings,
  Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import ChatAgent from '@/components/ChatAgent'
import DocumentGenerator from '@/components/DocumentGenerator'
import ResearchAgent from '@/components/ResearchAgent'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const router = useRouter()
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [usageStats, setUsageStats] = useState<any>(null)

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)

      // Get profile
      const { data: profileData } = await supabase
        .from('studio_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!profileData) {
        router.push('/setup')
        return
      }

      setProfile(profileData)

      // Get session ONCE
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get dashboard stats
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      setDashboardData(data)

      // Get subscription info using the SAME session
      const subscriptionResponse = await fetch('/api/subscription', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const subData = await subscriptionResponse.json()
      setSubscriptionData(subData)

      setLoading(false)
    }

    initDashboard()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Caricamento dashboard...</div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20'
      case 'idle': return 'text-yellow-400 bg-yellow-400/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document': return FileText
      case 'research': return Search
      default: return Activity
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-xl font-bold text-white">AgentStudio</h1>
                <p className="text-sm text-gray-400">{profile?.studio_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm">Benvenuto, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Documenti Generati</p>
                <p className="text-2xl font-bold text-white">{dashboardData?.stats?.documentsGenerated || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Ricerche Effettuate</p>
                <p className="text-2xl font-bold text-white">{dashboardData?.stats?.researchQueries || 0}</p>
              </div>
              <Search className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Tempo Risparmiato</p>
                <p className="text-2xl font-bold text-white">{dashboardData?.stats?.timeSavedHours || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Sessioni Totali</p>
                <p className="text-2xl font-bold text-white">{dashboardData?.stats?.totalSessions || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        {subscriptionData && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Il Tuo Abbonamento</h2>
            <SubscriptionCard 
              subscription={subscriptionData} 
              usage={{
                usage: { 
                  documents: dashboardData?.stats?.documentsGenerated || 0,
                  research: dashboardData?.stats?.researchQueries || 0 
                },
                limits: subscriptionData.limits
              }}
            />
          </div>
        )}

        {/* Agent Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">I Tuoi Agenti AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Client Agent */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-6 w-6 text-purple-400" />
                  <h3 className="text-white font-medium">Client Agent</h3>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/20">
                  Attivo
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Chat intelligente per assistenza clienti 24/7
              </p>
              <button
                onClick={() => setActiveModal('chat')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Apri Chat
              </button>
            </div>

            {/* Document Agent */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-blue-400" />
                  <h3 className="text-white font-medium">Document Agent</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dashboardData?.agentStatus?.documentAgent?.status || 'idle')}`}>
                  {dashboardData?.agentStatus?.documentAgent?.status === 'active' ? 'Attivo' : 'Inattivo'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {dashboardData?.agentStatus?.documentAgent?.usage || 'Genera documenti AI'}
              </p>
              <button
                onClick={() => setActiveModal('document')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Genera Documento
              </button>
            </div>

            {/* Research Agent */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Search className="h-6 w-6 text-green-400" />
                  <h3 className="text-white font-medium">Research Agent</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dashboardData?.agentStatus?.researchAgent?.status || 'idle')}`}>
                  {dashboardData?.agentStatus?.researchAgent?.status === 'active' ? 'Attivo' : 'Inattivo'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {dashboardData?.agentStatus?.researchAgent?.usage || 'Ricerca giurisprudenza'}
              </p>
              <button
                onClick={() => setActiveModal('research')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Avvia Ricerca
              </button>
            </div>

            {/* Team Management */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6 text-orange-400" />
                  <h3 className="text-white font-medium">Team Management</h3>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium text-orange-400 bg-orange-400/20">
                  Professional+
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Gestisci membri del team e collaborazione
              </p>
              <button
                onClick={() => router.push('/teams')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Gestisci Team
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Attività Recente</h2>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            {dashboardData?.recentActivity?.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {dashboardData.recentActivity.map((activity: any, index: number) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={index} className="p-4 flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${activity.type === 'document' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                        <Icon className={`h-4 w-4 ${activity.type === 'document' ? 'text-blue-400' : 'text-green-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{activity.title}</p>
                        <p className="text-gray-400 text-xs">{activity.subtitle}</p>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(activity.timestamp).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna attività recente</p>
                <p className="text-sm">Inizia usando i tuoi agenti AI</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {activeModal === 'chat' && user && (
        <ChatAgent 
          userEmail={user.email!} 
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'document' && (
        <DocumentGenerator onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'research' && (
        <ResearchAgent onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}