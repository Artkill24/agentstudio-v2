'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Building, MapPin, Users, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function SetupPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    studio_name: '',
    studio_type: '',
    location: '',
    team_size: '',
    practice_areas: [] as string[],
    current_challenges: '',
    monthly_revenue: '',
    phone: '',
    website: ''
  })
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
    }
    getUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!user) return
  
  setLoading(true)
  try {
    // Test solo con campi required
    const minimalData = {
      user_id: user.id,
      studio_name: formData.studio_name || 'Test Studio',
      studio_type: formData.studio_type || 'Studio Legale',
      location: formData.location || 'Italia',
      team_size: formData.team_size || 'Solo',
      practice_areas: formData.practice_areas.length > 0 ? formData.practice_areas : ['Diritto Civile'],
      current_challenges: formData.current_challenges || null,
      phone: formData.phone || null,
      website: formData.website || null
    }

    console.log('Minimal data:', minimalData)

    const { data, error } = await supabase
      .from('studio_profiles')
      .insert(minimalData)

    if (error) {
      console.error('Specific Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    router.push('/dashboard')
  } catch (error) {
    console.error('Error saving profile:', error)
  } finally {
    setLoading(false)
  }
}

  const studioTypes = [
    'Studio Legale',
    'Studio Commercialista',
    'Studio Notarile', 
    'Studio Architettura',
    'Studio Ingegneria',
    'Consulenza Aziendale',
    'Altro'
  ]

  const practiceOptions = [
    'Diritto Civile',
    'Diritto Penale', 
    'Diritto Commerciale',
    'Diritto del Lavoro',
    'Fiscale e Tributario',
    'Immobiliare',
    'Famiglia e Successioni',
    'Progettazione',
    'Consulenza Strategica'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">AgentStudio</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Configura il tuo Studio</h1>
          <p className="text-gray-300">Personalizza gli agenti AI per il tuo studio professionale</p>
        </div>

        {/* Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Studio Name */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Building className="h-4 w-4 mr-2" />
                Nome Studio
              </label>
              <input
                type="text"
                required
                value={formData.studio_name}
                onChange={(e) => setFormData({...formData, studio_name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Studio Legale Rossi & Associati"
              />
            </div>

            {/* Studio Type */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Briefcase className="h-4 w-4 mr-2" />
                Tipo di Studio
              </label>
              <select
                required
                value={formData.studio_type}
                onChange={(e) => setFormData({...formData, studio_type: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleziona tipo</option>
                {studioTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <MapPin className="h-4 w-4 mr-2" />
                Ubicazione
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Milano, Italia"
              />
            </div>

            {/* Team Size */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Users className="h-4 w-4 mr-2" />
                Dimensione Team
              </label>
              <select
                required
                value={formData.team_size}
                onChange={(e) => setFormData({...formData, team_size: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleziona dimensione</option>
                <option value="Solo">Solo</option>
                <option value="2-5">2-5 persone</option>
                <option value="6-15">6-15 persone</option>
                <option value="16-50">16-50 persone</option>
                <option value="50+">50+ persone</option>
              </select>
            </div>

            {/* Practice Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Aree di Specializzazione
              </label>
              <div className="grid grid-cols-2 gap-3">
                {practiceOptions.map(area => (
                  <label key={area} className="flex items-center text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.practice_areas.includes(area)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, practice_areas: [...formData.practice_areas, area]})
                        } else {
                          setFormData({...formData, practice_areas: formData.practice_areas.filter(a => a !== area)})
                        }
                      }}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                    />
                    {area}
                  </label>
                ))}
              </div>
            </div>

            {/* Current Challenges */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Principale Sfida Attuale (opzionale)
              </label>
              <textarea
                value={formData.current_challenges}
                onChange={(e) => setFormData({...formData, current_challenges: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Es. Troppo tempo per documenti amministrativi"
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telefono (opzionale)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+39 02 1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website (opzionale)
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://www.studiolegal..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio...' : 'Completa Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}