'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, LogOut, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import AssistantAgent from '@/components/AssistantAgent'
import SettingsModal from '@/components/SettingsModal'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)

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

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        router.push('/auth')
        return
      }

      try {
        const dashResponse = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (dashResponse.ok) {
          setDashboardData(await dashResponse.json())
        }

        const subResponse = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (subResponse.ok) {
          setSubscriptionData(await subResponse.json())
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
            <div className="flex items-center space-x-3">
              <span className="text-gray-300 text-sm hidden sm:block">{user?.email}</span>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                title="Impostazioni"
              >
                <Settings className="h-4 w-4" />
              </button>
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

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Assistente: il centro della pagina */}
        <AssistantAgent />

        {/* Strumenti diretti — collassati, per chi preferisce l'accesso singolo */}
        <div className="mt-6">
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showTools ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Strumenti diretti e attività recente
          </button>

          {showTools && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Documenti Generati</p>
                  <p className="text-2xl font-bold text-white">{dashboardData?.stats?.documentsGenerated || 0}</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Ricerche Effettuate</p>
                  <p className="text-2xl font-bold text-white">{dashboardData?.stats?.researchQueries || 0}</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Tempo Risparmiato</p>
                  <p className="text-2xl font-bold text-white">{dashboardData?.stats?.timeSavedHours || 0}h</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Sessioni Totali</p>
                  <p className="text-2xl font-bold text-white">{dashboardData?.stats?.totalSessions || 0}</p>
                </div>
              </div>

              {dashboardData?.recentActivity?.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                  <div className="divide-y divide-gray-700">
                    {dashboardData.recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{activity.title}</p>
                          <p className="text-gray-400 text-xs mt-1">{activity.subtitle}</p>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(activity.timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          subscriptionData={subscriptionData}
          dashboardData={dashboardData}
        />
      )}
    </div>
  )
}
