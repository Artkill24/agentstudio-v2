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

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const loadHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/research', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      const data = await response.json()
      if (data.history) {
        setHistory(data.history)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const performResearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setResults(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          query,
          category,
          jurisdiction
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
      } else {
        console.error('Research failed:', data.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFromHistory = (item: any) => {
    setQuery(item.query)
    setCategory(item.category)
    setResults({ results: item.results, query: item.query, category: item.category })
    setActiveTab('search')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Research Agent
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'search' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4 inline mr-2" />
            Ricerca
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'history' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            Cronologia
          </button>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {activeTab === 'search' ? (
            <>
              {/* Search Form */}
              <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
                <div className="space-y-6">
                  {/* Query */}
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

                  {/* Category */}
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

                  {/* Jurisdiction */}
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

                  <button
                    onClick={performResearch}
                    disabled={loading || !query.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Ricerca in corso...' : 'Avvia Ricerca'}
                  </button>

                  {/* Suggestions */}
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

              {/* Results */}
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
            </>
          ) : (
            /* History Tab */
            <div className="w-full p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Cronologia Ricerche</h3>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{item.query}</h4>
                          <div className="text-sm text-gray-400">
                            {item.category} | {new Date(item.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                        <Clock className="h-4 w-4 text-gray-400 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nessuna ricerca salvata</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}