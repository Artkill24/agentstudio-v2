'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Send, FileText, Search, Copy, Check, ChevronDown, ChevronUp,
  Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AssistantSource {
  title?: string
  url: string
}

interface AssistantDocument {
  title: string
  content: string
  type: string
}

interface AssistantAction {
  tool: string
  summary: string
  document?: AssistantDocument
  sources?: AssistantSource[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: AssistantAction[]
}

interface ConversationSummary {
  id: string
  title: string
  updated_at: string
}

function DocumentCard({ doc }: { doc: AssistantDocument }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(doc.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-3 bg-gray-900/70 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-white truncate">{doc.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={copy} className="p-1.5 rounded hover:bg-gray-700 text-gray-300" title="Copia documento">
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded hover:bg-gray-700 text-gray-300" title={expanded ? 'Comprimi' : 'Espandi'}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="px-4 pb-4 text-xs text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
          {doc.content}
        </pre>
      )}
    </div>
  )
}

function SourcesList({ sources }: { sources: AssistantSource[] }) {
  if (!sources.length) return null
  return (
    <div className="mt-3 bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Search className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium text-white">Fonti</span>
      </div>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={i} className="text-xs truncate">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {s.title || s.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepView({ m }: { m: Message }) {
  return (
    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
          m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-900/70 border border-gray-700 text-gray-200'
        }`}
      >
        {m.content}
        {m.actions?.map((a, j) => (
          <div key={j}>
            {a.document && <DocumentCard doc={a.document} />}
            {a.sources && a.sources.length > 0 && <SourcesList sources={a.sources} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AssistantAgent() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }, [])

  const loadConversations = useCallback(async () => {
    const headers = await authHeader()
    const res = await fetch('/api/conversations', { headers })
    if (res.ok) {
      const data = await res.json()
      setConversations(data.conversations || [])
    }
  }, [authHeader])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const openConversation = async (id: string) => {
    setActiveId(id)
    setLoadingHistory(true)
    const headers = await authHeader()
    const res = await fetch(`/api/conversations/${id}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setMessages(
        (data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          actions: m.actions || [],
        }))
      )
    }
    setLoadingHistory(false)
  }

  const newConversation = () => {
    setActiveId(null)
    setMessages([])
    setInput('')
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const headers = await authHeader()
    await fetch(`/api/conversations/${id}`, { method: 'DELETE', headers })
    if (activeId === id) newConversation()
    loadConversations()
  }

  const ensureConversation = async (): Promise<string> => {
    if (activeId) return activeId
    const headers = await authHeader()
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    const id = data.conversation.id as string
    setActiveId(id)
    return id
  }

  const suggestions = [
    'Genera un contratto di consulenza per Mario Rossi, 1.500€',
    'Quali sono le novità sulla fatturazione elettronica?',
    'Ricordami la scadenza IVA del cliente Bianchi per il 30 settembre',
    'Cosa scade nei prossimi 30 giorni?',
  ]

  const send = async (text?: string) => {
    const userMessage = (text ?? input).trim()
    if (!userMessage || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const convId = await ensureConversation()
      const headers = await authHeader()
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history, conversationId: convId }),
      })

      const data = await response.json()

      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, actions: data.actions || [] }])
        loadConversations()
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Errore: ${data.error || 'Servizio non disponibile'}` }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Errore di connessione. Riprova.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-180px)] max-w-5xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 border-r border-gray-700 bg-gray-900/50 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <button
              onClick={newConversation}
              className="w-full flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg px-3 py-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuova conversazione
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs group transition-colors ${
                  activeId === c.id ? 'bg-gray-700/70 text-white' : 'text-gray-400 hover:bg-gray-800/70'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{c.title}</span>
                <span
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-gray-600 px-3 py-2">Nessuna conversazione salvata</p>
            )}
          </div>
        </div>
      )}

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-700 bg-gray-900/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <Sparkles className="h-5 w-5 text-purple-400" />
          <div>
            <h2 className="text-white font-semibold leading-tight">Assistente Studio</h2>
            <p className="text-xs text-gray-400">
              Ricerca con fonti reali · Documenti · Fatture · Scadenzario
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loadingHistory && (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Caricamento...</div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <p className="text-gray-400 text-sm">Cosa posso fare per il tuo studio oggi?</p>
              <div className="grid gap-2 w-full max-w-md">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-left text-sm text-gray-300 bg-gray-900/60 hover:bg-gray-700/60 border border-gray-700 rounded-lg px-4 py-3 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingHistory && messages.map((m, i) => <StepView key={i} m={m} />)}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900/70 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Scrivi qui: un contratto, una ricerca, una scadenza..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg px-4 py-3 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
