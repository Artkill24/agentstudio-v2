'use client'

import { useEffect, useState } from 'react'
import { X, Settings, FileText, Search, Clock, TrendingUp, Users, Plus } from 'lucide-react'
import SubscriptionCard from './SubscriptionCard'
import { supabase } from '@/lib/supabase'

interface ClientItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
}

interface SettingsModalProps {
  onClose: () => void
  subscriptionData: any
  dashboardData: any
}

export default function SettingsModal({ onClose, subscriptionData, dashboardData }: SettingsModalProps) {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [showAddClient, setShowAddClient] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const loadClients = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/clients', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setClients(data.clients || [])
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const saveNotes = async (client: ClientItem) => {
    setSavingNotes(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: client.name, notes: editNotes }),
      })
      if (res.ok) {
        setExpandedClientId(null)
        loadClients()
      }
    } finally {
      setSavingNotes(false)
    }
  }

  const addClient = async () => {
    if (!newName.trim() || savingClient) return
    setSavingClient(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone, notes: newNotes }),
      })
      if (res.ok) {
        setNewName('')
        setNewEmail('')
        setNewPhone('')
        setNewNotes('')
        setShowAddClient(false)
        loadClients()
      }
    } finally {
      setSavingClient(false)
    }
  }

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

          {/* Rubrica clienti */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Clienti
              </h3>
              <button
                onClick={() => setShowAddClient(!showAddClient)}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Aggiungi
              </button>
            </div>

            {showAddClient && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-3 space-y-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome cliente *"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (opzionale)"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Telefono (opzionale)"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Note: condizioni speciali, tariffa dedicata, ecc. (opzionale)"
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
                <button
                  onClick={addClient}
                  disabled={!newName.trim() || savingClient}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm rounded py-2 transition-colors"
                >
                  {savingClient ? 'Salvataggio...' : 'Salva cliente'}
                </button>
              </div>
            )}

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-48 overflow-y-auto">
              {clients.length === 0 ? (
                <p className="text-xs text-gray-500 px-3 py-3">Nessun cliente in rubrica.</p>
              ) : (
                clients.map((c) => (
                  <div key={c.id} className="px-3 py-2.5 text-sm">
                    <button
                      onClick={() => {
                        if (expandedClientId === c.id) {
                          setExpandedClientId(null)
                        } else {
                          setExpandedClientId(c.id)
                          setEditNotes(c.notes || '')
                        }
                      }}
                      className="w-full text-left"
                    >
                      <p className="text-white">{c.name}</p>
                      {(c.email || c.phone) && (
                        <p className="text-xs text-gray-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                      )}
                      {c.notes && expandedClientId !== c.id && (
                        <p className="text-xs text-amber-400/80 mt-1 truncate">📝 {c.notes}</p>
                      )}
                    </button>

                    {expandedClientId === c.id && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Condizioni speciali, tariffa dedicata, note..."
                          rows={2}
                          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                        />
                        <button
                          onClick={() => saveNotes(c)}
                          disabled={savingNotes}
                          className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded px-3 py-1.5 transition-colors"
                        >
                          {savingNotes ? 'Salvataggio...' : 'Salva nota'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
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
