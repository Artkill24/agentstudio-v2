'use client'

import { useState, useEffect } from 'react'
import { Search, X, Clock, BookOpen, Scale, FileText, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ResearchAgentProps {
  onClose: () => void
}

export default function ResearchAgent({ onClose }: ResearchAgentProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('general')
  const [jurisdiction, setJurisdiction] = useState('Italia')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const categories = [
    { value: 'general', label: 'Ricerca Generale', icon: Search },
    { value: 'jurisprudence', label: 'Giurisprudenza', icon: Scale },
    { value: 'regulations', label: 'Normativa', icon: BookOpen },
    { value: 'precedents', label: 'Precedenti', icon: FileText }
  ]

  const suggestions = [
    'Nuove norme privacy GDPR 2025',
    'Riforma processo civile telematico',
    'Agevolazioni fiscali startup innovative',
    'Responsabilità amministratori SRL',
    'Contratti di lavoro agile post-pandemia'
  ]

  const performResearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setResults(null)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          query: `${query} (Categoria: ${category}, Giurisdizione: ${jurisdiction})`
        })
      })

      const data = await response.json()
      
      if (response.ok && data.results) {
        setResults({
          results: data.results,
          query: query,
          category: category,
          sources: data.sources || []
        })
      } else {
        setError(data.error || 'Errore nella ricerca')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Research Agent
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-88px)]">
          <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Query di Ricerca
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  rows={3}
                  placeholder="Es. Responsabilità amministratori società fallite"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoria
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`p-3 rounded border text-left ${
                          category === cat.value
                            ? 'bg-purple-600 border-purple-500'
                            : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <div className="text-xs">{cat.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Giurisdizione
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="Italia">Italia</option>
                  <option value="UE">Unione Europea</option>
                  <option value="Internazionale">Internazionale</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={performResearch}
                disabled={loading || !query.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded font-semibold disabled:opacity-50"
              >
                {loading ? 'Ricerca in corso...' : 'Avvia Ricerca'}
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ricerche Suggerite
                </label>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(suggestion)}
                      className="w-full text-left text-xs text-gray-400 hover:text-purple-400 p-2 hover:bg-gray-700 rounded"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {results ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Risultati per: "{results.query}"
                  </h3>
                  <div className="text-sm text-gray-400">
                    Categoria: {results.category} | {new Date().toLocaleString('it-IT')}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-6 text-gray-100">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {results.results}
                  </pre>
                  {results.sources && results.sources.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <h4 className="font-semibold mb-2">Fonti:</h4>
                      <ul className="space-y-2">
                        {results.sources.map((source: any, index: number) => (
                          <li key={index} className="text-sm">
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>I risultati della ricerca appariranno qui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}