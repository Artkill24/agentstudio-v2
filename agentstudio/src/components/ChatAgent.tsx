'use client'

import { useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'

interface ChatAgentProps {
  userEmail: string
  onClose?: () => void
}

export default function ChatAgent({ userEmail, onClose }: ChatAgentProps) {
  // Se c'è onClose (modalità dashboard), apri subito. Se non c'è (floating), inizia chiuso
  const [isOpen, setIsOpen] = useState(!!onClose)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{role: 'user' | 'agent', content: string}>>([])
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    if (onClose) {
      // Modalità dashboard - chiama onClose della dashboard
      onClose()
    } else {
      // Modalità floating - chiudi solo il modal
      setIsOpen(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || loading) return

    const userMessage = message
    setMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, userEmail })
      })

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'agent', content: data.response }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', content: 'Errore di connessione. Riprova.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat Button - solo se non c'è onClose (modalità floating) */}
      {!onClose && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-lg sm:rounded-lg w-full sm:w-96 h-96 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Client Agent</h3>
              <button onClick={handleClose}>
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-gray-400 text-sm">
                  Ciao! Sono l'assistente del vostro studio. Come posso aiutarla?
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-3 rounded-lg max-w-xs ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-left">
                  <div className="inline-block p-3 rounded-lg bg-gray-700 text-gray-400">
                    Digitando...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}