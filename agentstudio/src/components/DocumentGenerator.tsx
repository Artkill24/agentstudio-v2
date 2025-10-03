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
    // Campi comuni
    clientName: '',
    clientEmail: '',
    amount: '',
    description: '',
    subject: '',
    // Campi contratto
    parties: '',
    payment: '',
    duration: '',
    additionalClauses: '',
    // Campi lettera
    recipient: '',
    content: '',
    tone: 'formale' as 'formale' | 'informale' | 'legale',
    // Campi privacy
    companyName: '',
    vatNumber: '',
    address: '',
    dataController: '',
    websiteUrl: '',
    // Campi termini
    service: ''
  })
  const [loading, setLoading] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const documentTypes = [
    { value: 'contratto', label: 'Contratto di Prestazione' },
    { value: 'lettera', label: 'Lettera Formale' },
    { value: 'privacy', label: 'Privacy Policy' },
    { value: 'termini', label: 'Termini e Condizioni' }
  ]

  const generateDocument = async () => {
    if (!formData.type) return

    setLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Prepara i dettagli in base al tipo
      let details: any = {}
      
      switch (formData.type) {
        case 'contratto':
          details = {
            parties: formData.parties || formData.clientName,
            subject: formData.subject || formData.description,
            payment: formData.payment || (formData.amount ? `€${formData.amount}` : ''),
            duration: formData.duration,
            additionalClauses: formData.additionalClauses
          }
          break
        case 'lettera':
          details = {
            recipient: formData.recipient || formData.clientName,
            subject: formData.subject,
            content: formData.content || formData.description,
            tone: formData.tone
          }
          break
        case 'privacy':
          details = {
            companyName: formData.companyName,
            vatNumber: formData.vatNumber,
            address: formData.address,
            dataController: formData.dataController,
            websiteUrl: formData.websiteUrl
          }
          break
        case 'termini':
          details = {
            companyName: formData.companyName,
            service: formData.service
          }
          break
      }

      const response = await fetch('/api/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          documentType: formData.type,
          details
        })
      })

      let data
      try {
        data = await response.json()
      } catch (e) {
        throw new Error('Errore del server. Riprova.')
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Errore nella generazione')
      }
      
      if (data.document) {
        setGeneratedDoc({
          title: `${formData.type}_${Date.now()}`,
          content: data.document
        })
      } else {
        setError('Documento non ricevuto')
      }
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Errore di connessione')
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

  const renderFormFields = () => {
    switch (formData.type) {
      case 'contratto':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Parti Contraenti *
              </label>
              <input
                type="text"
                value={formData.parties}
                onChange={(e) => setFormData({...formData, parties: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="Studio Legale XYZ e Cliente ABC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Oggetto Contratto *
              </label>
              <textarea
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                rows={2}
                placeholder="Consulenza legale in materia fiscale..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Corrispettivo *
              </label>
              <input
                type="text"
                value={formData.payment}
                onChange={(e) => setFormData({...formData, payment: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="€2.500 + IVA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Durata
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="12 mesi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Clausole Aggiuntive
              </label>
              <textarea
                value={formData.additionalClauses}
                onChange={(e) => setFormData({...formData, additionalClauses: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                rows={3}
                placeholder="Eventuali clausole personalizzate..."
              />
            </div>
          </>
        )

      case 'lettera':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destinatario *
              </label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="Spett.le Azienda XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Oggetto *
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
                Contenuto *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                rows={4}
                placeholder="Corpo della lettera..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tono
              </label>
              <select
                value={formData.tone}
                onChange={(e) => setFormData({...formData, tone: e.target.value as any})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="formale">Formale</option>
                <option value="informale">Informale</option>
                <option value="legale">Legale</option>
              </select>
            </div>
          </>
        )

      case 'privacy':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome Azienda *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="Studio Legale XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                P.IVA
              </label>
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => setFormData({...formData, vatNumber: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="IT12345678901"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Indirizzo Sede Legale *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="Via Roma 1, 20100 Milano"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Titolare del Trattamento *
              </label>
              <input
                type="text"
                value={formData.dataController}
                onChange={(e) => setFormData({...formData, dataController: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="Avv. Mario Rossi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sito Web
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="https://www.studiolegale.it"
              />
            </div>
          </>
        )

      case 'termini':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome Azienda *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="Studio Legale XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descrizione Servizio *
              </label>
              <textarea
                value={formData.service}
                onChange={(e) => setFormData({...formData, service: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                rows={4}
                placeholder="Piattaforma online per consulenza legale..."
              />
            </div>
          </>
        )

      default:
        return (
          <div className="text-gray-400 text-sm text-center py-8">
            Seleziona un tipo di documento per iniziare
          </div>
        )
    }
  }

  const isFormValid = () => {
    if (!formData.type) return false
    
    switch (formData.type) {
      case 'contratto':
        return formData.parties && formData.subject && formData.payment
      case 'lettera':
        return formData.recipient && formData.subject && formData.content
      case 'privacy':
        return formData.companyName && formData.address && formData.dataController
      case 'termini':
        return formData.companyName && formData.service
      default:
        return false
    }
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

              {renderFormFields()}

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={generateDocument}
                disabled={loading || !isFormValid()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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