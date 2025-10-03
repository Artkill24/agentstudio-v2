'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, 
  MessageCircle, 
  FileText, 
  Search, 
  Clock,
  TrendingUp,
  Users,
  Activity,
  LogOut
} from 'lucide-react'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import ChatAgent from '@/components/ChatAgent'
import DocumentGenerator from '@/components/DocumentGenerator'
import ResearchAgent from '@/components/ResearchAgent'
import SubscriptionCard from '@/components/SubscriptionCard'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const router = useRouter()

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

      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        router.push('/auth')
        return
      }

      try {
        // Get dashboard stats
        const dashResponse = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (dashResponse.ok) {
          const data = await dashResponse.json()
          setDashboardData(data)
        }

        // Get subscription info
        const subResponse = await fetch('/api/subscription', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (subResponse.ok) {
          const subData = await subResponse.json()
          setSubscriptionData(subData)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Caricamento dashboard...</p>
        </div>
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
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-xl font-bold text-white">AgentStudio</h1>
                <p className="text-sm text-gray-400">{profile?.studio_name || 'Il tuo studio'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
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
                <p className="text-gray-400 text-sm mb-1">Documenti Generati</p>
                <p className="text-3xl font-bold text-white">
                  {dashboardData?.stats?.documentsGenerated || 0}
                </p>
              </div>
              <FileText className="h-10 w-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Ricerche Effettuate</p>
                <p className="text-3xl font-bold text-white">
                  {dashboardData?.stats?.researchQueries || 0}
                </p>
              </div>
              <Search className="h-10 w-10 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Tempo Risparmiato</p>
                <p className="text-3xl font-bold text-white">
                  {dashboardData?.stats?.timeSavedHours || 0}h
                </p>
              </div>
              <Clock className="h-10 w-10 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Sessioni Totali</p>
                <p className="text-3xl font-bold text-white">
                  {dashboardData?.stats?.totalSessions || 0}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        {subscriptionData && dashboardData && (
          <div className="mb-8">
            <SubscriptionCard 
              subscription={{
                plan: subscriptionData.plan || 'free',
                status: subscriptionData.status || 'active',
                limits: subscriptionData.limits || { documents: 5, research: 3, chat: 50 },
                resetAt: subscriptionData.resetAt
              }}
              usage={{
                usage: {
                  documents: dashboardData.stats?.documentsGenerated || 0,
                  research: dashboardData.stats?.researchQueries || 0
                },
                limits: subscriptionData.limits || { documents: 5, research: 3, chat: 50 }
              }}
            />
          </div>
        )}

        {/* Agent Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">I Tuoi Agenti AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Client Agent */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <MessageCircle className="h-8 w-8 text-purple-400" />
                <span className="px-3 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/20">
                  Attivo
                </span>
              </div>
              <h3 className="text-white font-semibold mb-2">Client Agent</h3>
              <p className="text-gray-400 text-sm mb-4">
                Chat intelligente per assistenza clienti 24/7
              </p>
              <button
                onClick={() => setActiveModal('chat')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Apri Chat
              </button>
            </div>

            {/* Document Generator */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 text-blue-400" />
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor('idle')}`}>
                  Pronto
                </span>
              </div>
              <h3 className="text-white font-semibold mb-2">Document Generator</h3>
              <p className="text-gray-400 text-sm mb-4">
                Contratti, lettere, privacy policy
              </p>
              <button
                onClick={() => setActiveModal('document')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Genera Documento
              </button>
            </div>

            {/* Invoice Generator */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-cyan-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 text-cyan-400" />
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor('idle')}`}>
                  Pronto
                </span>
              </div>
              <h3 className="text-white font-semibold mb-2">Invoice Generator</h3>
              <p className="text-gray-400 text-sm mb-4">
                Fatture professionali con IVA/ritenuta
              </p>
              <button
                onClick={() => setActiveModal('invoice')}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Genera Fattura
              </button>
            </div>

            {/* Research Agent */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <Search className="h-8 w-8 text-green-400" />
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor('idle')}`}>
                  Pronto
                </span>
              </div>
              <h3 className="text-white font-semibold mb-2">Research Agent</h3>
              <p className="text-gray-400 text-sm mb-4">
                Ricerca giurisprudenza italiana
              </p>
              <button
                onClick={() => setActiveModal('research')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Avvia Ricerca
              </button>
            </div>

            {/* Team Management */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-orange-400" />
                <span className="px-3 py-1 rounded-full text-xs font-medium text-orange-400 bg-orange-400/20">
                  Pro+
                </span>
              </div>
              <h3 className="text-white font-semibold mb-2">Team Management</h3>
              <p className="text-gray-400 text-sm mb-4">
                Gestisci membri del team
              </p>
              <button
                onClick={() => router.push('/teams')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Gestisci Team
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">Attività Recente</h2>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            {dashboardData?.recentActivity?.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {dashboardData.recentActivity.map((activity: any, index: number) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={index} className="p-4 hover:bg-gray-700/30 transition-colors flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${activity.type === 'document' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                        <Icon className={`h-5 w-5 ${activity.type === 'document' ? 'text-blue-400' : 'text-green-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{activity.title}</p>
                        <p className="text-gray-400 text-xs mt-1">{activity.subtitle}</p>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(activity.timestamp).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <Activity className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">Nessuna attività recente</p>
                <p className="text-sm">Inizia usando i tuoi agenti AI per vedere l'attività qui</p>
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

      {activeModal === 'invoice' && (
        <InvoiceGenerator onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}