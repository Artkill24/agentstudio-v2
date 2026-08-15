'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Trash2, Check, PenLine } from 'lucide-react'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onClose: () => void
}

const PEN_COLORS = [
  { label: 'Nero', value: '#1a1a1a' },
  { label: 'Blu', value: '#1e3a8a' },
  { label: 'Blu inchiostro', value: '#1e40af' },
]

const PEN_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Media', value: 3.5 },
  { label: 'Spessa', value: 5 },
]

export default function SignaturePad({ onSave, onClose }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [color, setColor] = useState(PEN_COLORS[0].value)
  const [width, setWidth] = useState(PEN_WIDTHS[1].value)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  const getPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const point = getPoint(e)
    if (!point) return
    drawing.current = true
    lastPoint.current = point
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const point = getPoint(e)
    if (!canvas || !point || !lastPoint.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    lastPoint.current = point
  }

  const endDraw = () => {
    drawing.current = false
    lastPoint.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Firma il documento</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-800 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stili penna */}
        <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Colore</span>
            {PEN_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  color === c.value ? 'border-purple-400 scale-110' : 'border-gray-600'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Tratto</span>
            {PEN_WIDTHS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWidth(w.value)}
                title={w.label}
                className={`h-7 w-7 rounded flex items-center justify-center border transition-colors ${
                  width === w.value ? 'border-purple-400 bg-gray-800' : 'border-gray-700'
                }`}
              >
                <span
                  className="rounded-full bg-gray-300"
                  style={{ width: w.value + 2, height: w.value + 2 }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-5">
          <div className="h-full bg-white rounded-lg relative overflow-hidden">
            {!hasSignature && (
              <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">
                Firma qui con mouse o dito
              </p>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 flex gap-2">
          <button
            onClick={clear}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Cancella
          </button>
          <button
            onClick={save}
            disabled={!hasSignature}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-colors"
          >
            <Check className="h-4 w-4" />
            Conferma firma
          </button>
        </div>
      </div>
    </div>
  )
}
