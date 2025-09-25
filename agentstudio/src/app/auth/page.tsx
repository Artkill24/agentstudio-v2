'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Mail, Lock, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AuthMode = 'login' | 'signup' | 'reset' | 'verify'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email richiesta'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida'
    }

    // Password validation (only for login/signup)
    if (mode !== 'reset' && !formData.password) {
      newErrors.password = 'Password richiesta'
    } else if (mode === 'signup' && formData.password.length < 8) {
      newErrors.password = 'Password deve essere almeno 8 caratteri'
    }

    // Confirm password (signup only)
    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Conferma password richiesta'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Le password non corrispondono'
      }

      if (!formData.firstName) {
        newErrors.firstName = 'Nome richiesto'
      }
      if (!formData.lastName) {
        newErrors.lastName = 'Cognome richiesto'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setMessage(null)

    try {
      switch (mode) {
        case 'login':
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          })
          
          if (loginError) throw loginError

          // Check if profile exists
          const { data: profile } = await supabase
            .from('studio_profiles')
            .select('id')
            .eq('user_id', loginData.user?.id)
            .single()
          
          if (profile) {
            router.push('/dashboard')
          } else {
            router.push('/setup')
          }
          break

        case 'signup':
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                full_name: `${formData.firstName} ${formData.lastName}`
              }
            }
          })
          
          if (signupError) throw signupError

          setMessage({
            type: 'success',
            text: 'Account creato! Controlla la tua email per confermare l\'account.'
          })
          setMode('verify')
          break

        case 'reset':
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            formData.email,
            {
              redirectTo: `${window.location.origin}/auth/reset-password`
            }
          )
          
          if (resetError) throw resetError

          setMessage({
            type: 'success',
            text: 'Email di reset inviata! Controlla la tua casella.'
          })
          break
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Si è verificato un errore'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Accedi al tuo Studio'
      case 'signup': return 'Crea il tuo Studio'
      case 'reset': return 'Recupera Password'
      case 'verify': return 'Verifica Email'
    }
  }

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Benvenuto, iniziamo!'
      case 'signup': return 'Inizia la tua prova gratuita di 14 giorni'
      case 'reset': return 'Ti invieremo un link per recuperare la password'
      case 'verify': return 'Conferma il tuo account per continuare'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">AgentStudio</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {getTitle()}
          </h2>
          <p className="text-gray-300">
            {getSubtitle()}
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
              message.type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              )}
              <p className={`text-sm ${message.type === 'success' ? 'text-green-100' : 'text-red-100'}`}>
                {message.text}
              </p>
            </div>
          )}

          {mode !== 'verify' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name fields (signup only) */}
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="Mario"
                    />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Cognome</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="Rossi"
                    />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="il-tuo-studio@email.com"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password (not for reset) */}
              {mode !== 'reset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={`w-full pl-10 pr-10 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
              )}

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Conferma Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className={`w-full pl-10 pr-4 py-2 bg-gray-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  'Caricamento...'
                ) : (
                  mode === 'login' ? 'Accedi' : 
                  mode === 'signup' ? 'Crea Account' :
                  'Invia Link Reset'
                )}
              </button>
            </form>
          )}

          {/* Mode switching */}
          <div className="mt-6 space-y-3 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('signup')}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Non hai un account? Registrati gratis
                </button>
                <br />
                <button
                  onClick={() => setMode('reset')}
                  className="text-gray-400 hover:text-white"
                >
                  Password dimenticata?
                </button>
              </>
            )}
            
            {mode === 'signup' && (
              <button
                onClick={() => setMode('login')}
                className="text-purple-400 hover:text-purple-300"
              >
                Hai già un account? Accedi
              </button>
            )}

            {(mode === 'reset' || mode === 'verify') && (
              <button
                onClick={() => setMode('login')}
                className="text-purple-400 hover:text-purple-300"
              >
                Torna al login
              </button>
            )}
          </div>
        </div>

        {/* Back to homepage */}
        <div className="mt-6 text-center">
          <a href="/" className="flex items-center justify-center text-gray-400 hover:text-white text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla homepage
          </a>
        </div>
      </div>
    </div>
  )
}