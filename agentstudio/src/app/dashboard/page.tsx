'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import ChatAgent from '@/components/ChatAgent'
import DocumentGenerator from '@/components/DocumentGenerator'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        router.push('/auth')
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">AgentStudio</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Benvenuto, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard AgentStudio</h1>
        
        <div className="grid gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <p className="text-gray-300 mb-6">
              Benvenuto in AgentStudio! Qui gestirai presto i tuoi agenti AI.
            </p>
            
            {/* Document Generator Button */}
            <button
              onClick={() => setShowDocumentGenerator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors"
            >
              <FileText className="h-6 w-6" />
              <div>Genera Documento</div>
            </button>
          </div>
        </div>
      </main>
      
      {user && <ChatAgent userEmail={user.email!} />}
      
      {/* Document Generator Modal */}
      {showDocumentGenerator && (
        <DocumentGenerator onClose={() => setShowDocumentGenerator(false)} />
      )}
    </div>
  )
}