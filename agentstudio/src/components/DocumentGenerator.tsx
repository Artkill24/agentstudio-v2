'use client'

import { useState } from 'react'
import { FileText, X, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DocumentGeneratorProps {
  onClose: () => void
}

export default function DocumentGenerator({ onClose }: DocumentGeneratorProps) {
  const [formData, setFormData] = useState({
    type: '',
    clientName: '',
    clientEmail: '',
    amount: '',
    description: '',
    subject: ''
  })
  const [loading, setLoading] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const documentTypes = [
    { value: 'contract', label: 'Contratto di Prestazione' },
    { value: 'invoice', label: 'Fattura' },
    { value: 'letter', label: 'Lettera Professionale' },
    { value: 'privacy', label: 'Privacy Policy' }
  ]

  const generateDocument = async () => {
    if (!formData.type || !formData.clientName) return

    setLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          documentType: formData.type === 'contract' ? 'contratto' : 
                       formData.type === 'invoice' ? 'fattura' :
                       formData.type === 'letter' ? 'lettera' :
                       formData.type === 'privacy' ? 'privacy' : 'default',
          details: {
            parties: formData.clientName,
            subject: formData.subject || formData.description,
            duration: '12 mesi',
            payment: formData.amount ? `€${formData.amount}` : 'Da concordare',
            recipient: formData.clientName,
            content: formData.description,
            topic: formData.subject,
            context: formData.description
          }
        })
      })

      const data = await response.json()
      
      if (response.ok && data.document) {
        setGeneratedDoc({
          title: `${formData.type}_${formData.clientName}`,
          content: data.document
        })
      } else {
        setError(data.error || 'Errore nella generazione del documento')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const downloadDocument = () => {
    if (!generatedDoc) return

    const blob = new Blob([generatedDoc.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generatedDoc.title}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Document Generator
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-88px)]">
          <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo Documento
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">Seleziona tipo</option>
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Cliente
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  placeholder="Mario Rossi SRL"
                />
              </div>

              {(formData.type === 'contract' || formData.type === 'invoice') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Importo (€)
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="2500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descrizione Servizio
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      rows={3}
                      placeholder="Consulenza fiscale..."
                    />
                  </div>
                </>
              )}

              {formData.type === 'letter' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Oggetto
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="Richiesta informazioni"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contenuto
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      rows={4}
                      placeholder="Corpo della lettera..."
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={generateDocument}
                disabled={loading || !formData.type || !formData.clientName}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Generazione...' : 'Genera Documento'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {generatedDoc ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{generatedDoc.title}</h3>
                  <button
                    onClick={downloadDocument}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
                <div className="bg-white text-black p-6 rounded text-sm leading-relaxed">
                  <pre className="whitespace-pre-wrap font-sans">{generatedDoc.content}</pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Il documento generato apparirà qui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}