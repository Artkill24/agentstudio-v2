'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Settings, Crown, Shield, User, Mail, MoreHorizontal, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface TeamMember {
  id: string
  role: string
  permissions: any
  joined_at: string
  users: {
    email: string
    raw_user_meta_data: any
  }
}

interface Team {
  id: string
  name: string
  owner_id: string
  max_members: number
  team_members: { role: string }[]
  subscriptions: { plan_name: string, status: string }
}

export default function TeamsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const router = useRouter()

  useEffect(() => {
    const initTeams = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)
      await loadTeams(user.id)
    }

    initTeams()
  }, [router])

  const loadTeams = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      const data = await response.json()
      setTeams(data.teams || [])
      
      if (data.teams?.length > 0) {
        await selectTeam(data.teams[0])
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectTeam = async (team: Team) => {
    setSelectedTeam(team)
    await loadTeamMembers(team.id)
  }

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      const data = await response.json()
      setTeamMembers(data.members || [])
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleInvite = async () => {
    if (!selectedTeam || !inviteEmail.trim()) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/teams/${selectedTeam.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      })

      if (response.ok) {
        setShowInviteModal(false)
        setInviteEmail('')
        setInviteRole('member')
        // Refresh members
        await loadTeamMembers(selectedTeam.id)
      } else {
        const error = await response.json()
        alert('Errore nell\'invito: ' + error.error)
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      alert('Errore nell\'invio dell\'invito')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Shield
      default: return User
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-yellow-400'
      case 'admin': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const canInvite = (userRole: string) => {
    return userRole === 'owner' || userRole === 'admin'
  }

  const currentUserRole = teamMembers.find(m => m.users.email === user?.email)?.role

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Caricamento team...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                ← Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-purple-400" />
                <h1 className="text-xl font-bold text-white">Team Management</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Team List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">I Tuoi Team</h2>
              
              {teams.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nessun team trovato</p>
                  <p className="text-xs mt-2">I team vengono creati automaticamente con l'abbonamento Professional+</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => selectTeam(team)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedTeam?.id === team.id
                          ? 'bg-purple-500/20 border border-purple-500/50'
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="font-medium text-white">{team.name}</div>
                      <div className="text-xs text-gray-400">
                        {team.team_members?.length || 0}/{team.max_members} membri
                      </div>
                      <div className="text-xs text-purple-400 capitalize">
                        {team.subscriptions?.plan_name || 'professional'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-3">
            {selectedTeam ? (
              <div className="space-y-6">
                {/* Team Header */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedTeam.name}</h2>
                      <p className="text-gray-400">
                        {teamMembers.length}/{selectedTeam.max_members} membri • 
                        Piano {selectedTeam.subscriptions?.plan_name || 'Professional'}
                      </p>
                    </div>
                    
                    {canInvite(currentUserRole || '') && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Invita Membro</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Membri del Team</h3>
                  
                  <div className="space-y-3">
                    {teamMembers.map(member => {
                      const RoleIcon = getRoleIcon(member.role)
                      const roleColor = getRoleColor(member.role)
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full bg-gray-600/50`}>
                              <RoleIcon className={`h-4 w-4 ${roleColor}`} />
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {member.users?.email || 'Email non disponibile'}
                              </div>
                              <div className={`text-sm capitalize ${roleColor}`}>
                                {member.role === 'owner' ? 'Proprietario' :
                                 member.role === 'admin' ? 'Amministratore' : 'Membro'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              Dal {new Date(member.joined_at).toLocaleDateString('it-IT')}
                            </span>
                            
                            {canInvite(currentUserRole || '') && member.role !== 'owner' && (
                              <button className="text-gray-400 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                <h3 className="text-lg font-semibold text-white mb-2">Seleziona un Team</h3>
                <p className="text-gray-400">Scegli un team dalla lista per gestire i membri e le impostazioni.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Invita Membro</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="colleghi@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ruolo
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
                >
                  Invia Invito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}