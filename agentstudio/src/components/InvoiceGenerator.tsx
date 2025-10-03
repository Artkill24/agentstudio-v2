'use client'

import { useState } from 'react'
import { X, Plus, Trash2, FileText, Download } from 'lucide-react'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  vat: number
}

interface InvoiceGeneratorProps {
  onClose: () => void
}

export default function InvoiceGenerator({ onClose }: InvoiceGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    clientName: '',
    clientVat: '',
    clientAddress: '',
    notes: '',
    applyWithholding: false,
    applyStamp: false
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, vat: 22 }
  ])

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, vat: 22 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotals = () => {
    let subtotal = 0
    let totalVat = 0

    items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice
      subtotal += lineTotal
      totalVat += lineTotal * (item.vat / 100)
    })

    const withholding = formData.applyWithholding ? subtotal * 0.20 : 0
    const stamp = formData.applyStamp && subtotal > 77.47 ? 2 : 0
    const total = subtotal + totalVat - withholding + stamp

    return { subtotal, totalVat, withholding, stamp, total }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      const totals = calculateTotals()

      const response = await fetch('/api/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          items,
          ...totals
        })
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('Errore del server')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella generazione')
      }

      setGeneratedInvoice(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  if (generatedInvoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Fattura Generata</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="bg-white text-black p-8 rounded" dangerouslySetInnerHTML={{ __html: generatedInvoice.html }} />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([generatedInvoice.html], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `fattura-${formData.invoiceNumber}.html`
                  a.click()
                }}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
              >
                <Download className="h-5 w-5" />
                Scarica HTML
              </button>
              <button
                onClick={() => setGeneratedInvoice(null)}
                className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
              >
                Genera Nuova
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Genera Fattura</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Numero Fattura *
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="2025/001"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Cliente</h3>
            
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Nome/Ragione Sociale *"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                value={formData.clientVat}
                onChange={(e) => setFormData({ ...formData, clientVat: e.target.value })}
                placeholder="P.IVA / CF"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
              />
              
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                placeholder="Indirizzo"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Voci di Fattura</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                Aggiungi Voce
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Descrizione servizio/prodotto"
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="ml-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Quantità</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min="1"
                      step="1"
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prezzo (€)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">IVA (%)</label>
                    <select
                      value={item.vat}
                      onChange={(e) => updateItem(index, 'vat', parseInt(e.target.value))}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
                    >
                      <option value="0">0% (Esente)</option>
                      <option value="4">4%</option>
                      <option value="10">10%</option>
                      <option value="22">22%</option>
                    </select>
                  </div>
                </div>

                <div className="text-right text-gray-300">
                  Totale: €{(item.quantity * item.unitPrice * (1 + item.vat / 100)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={formData.applyWithholding}
                onChange={(e) => setFormData({ ...formData, applyWithholding: e.target.checked })}
                className="rounded"
              />
              Applica ritenuta d'acconto 20%
            </label>

            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={formData.applyStamp}
                onChange={(e) => setFormData({ ...formData, applyStamp: e.target.checked })}
                className="rounded"
              />
              Applica marca da bollo €2 (se maggiore di €77.47)
            </label>
          </div>

          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Note aggiuntive..."
            rows={3}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
          />

          <div className="bg-gray-700 p-6 rounded-lg space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Imponibile:</span>
              <span>€{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>IVA:</span>
              <span>€{totals.totalVat.toFixed(2)}</span>
            </div>
            {totals.withholding > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Ritenuta d'acconto:</span>
                <span>-€{totals.withholding.toFixed(2)}</span>
              </div>
            )}
            {totals.stamp > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Bollo:</span>
                <span>€{totals.stamp.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white text-xl font-bold pt-3 border-t border-gray-600">
              <span>TOTALE:</span>
              <span>€{totals.total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !formData.invoiceNumber || !formData.clientName || items.some(i => !i.description)}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generazione...' : 'Genera Fattura'}
          </button>
        </div>
      </div>
    </div>
  )
}