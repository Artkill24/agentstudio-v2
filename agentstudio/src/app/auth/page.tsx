'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles, Mail, Github, Facebook } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleOAuthSignIn = async (provider: 'github' | 'facebook') => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        if (error) throw error
        alert('Controlla la tua email per confermare la registrazione')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">
            {isSignUp ? 'Crea Account' : 'Accedi al tuo Studio'}
          </h1>
          <p className="text-gray-400">
            {isSignUp ? 'Inizia gratis, nessuna carta richiesta' : 'Benvenuto, iniziamo!'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Caricamento...' : isSignUp ? 'Registrati' : 'Accedi'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Oppure continua con</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50"
            >
              <Github className="h-5 w-5" />
              GitHub
            </button>
            <button
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Facebook className="h-5 w-5" />
              Facebook
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              {isSignUp ? 'Hai un account? Accedi' : 'Non hai un account? Registrati gratis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}