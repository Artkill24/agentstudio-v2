'use client'

import { useEffect, useState, useRef } from 'react'
import { Sparkles, FileText, Search, Check } from 'lucide-react'

type Step =
  | { kind: 'user'; text: string }
  | { kind: 'thinking'; label: string }
  | { kind: 'tool'; label: string; icon: 'document' | 'search' }
  | { kind: 'assistant'; text: string }
  | { kind: 'card'; title: string; lines: string[] }

const SCRIPT: Step[] = [
  { kind: 'user', text: 'Genera un contratto di consulenza per Mario Rossi, 1.500€' },
  { kind: 'thinking', label: 'Sto preparando il documento...' },
  { kind: 'tool', label: 'Document Generator', icon: 'document' },
  {
    kind: 'assistant',
    text: 'Il contratto di consulenza professionale per il Sig. Mario Rossi è stato generato con successo.',
  },
  {
    kind: 'card',
    title: 'Contratto di Prestazione — Mario Rossi',
    lines: ['Oggetto dell\'incarico', 'Compenso: 1.500,00 €', 'Clausole GDPR incluse'],
  },
  { kind: 'user', text: 'Cerca le novità sull\'IVA per i forfettari' },
  { kind: 'thinking', label: 'Sto cercando fonti aggiornate...' },
  { kind: 'tool', label: 'Research Agent · Google Search', icon: 'search' },
  {
    kind: 'assistant',
    text: 'Ecco un riepilogo aggiornato con fonti verificabili, non inventate.',
  },
]

const STEP_DELAY = 1600

export default function LiveDemo() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [typingIndex, setTypingIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visibleCount >= SCRIPT.length) {
      const resetTimer = setTimeout(() => setVisibleCount(0), 3000)
      return () => clearTimeout(resetTimer)
    }

    const current = SCRIPT[visibleCount]
    const delay = current.kind === 'user' ? 900 : STEP_DELAY

    if (current.kind === 'user') {
      setTypingIndex(visibleCount)
    }

    const timer = setTimeout(() => {
      setTypingIndex(null)
      setVisibleCount((v) => v + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [visibleCount])

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [visibleCount])

  const visibleSteps = SCRIPT.slice(0, visibleCount)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-700 bg-gray-900/70 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Fake browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950/50">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <div className="ml-3 flex items-center gap-2 text-xs text-gray-400">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Assistente Studio — demo live
          </div>
        </div>

        {/* Conversation */}
        <div ref={containerRef} className="h-96 overflow-y-auto px-5 py-5 space-y-3 scroll-smooth">
          {visibleSteps.map((step, i) => (
            <StepView key={i} step={step} />
          ))}
          {typingIndex !== null && (
            <div className="flex justify-end">
              <div className="bg-purple-600/40 rounded-xl px-4 py-2.5 text-sm text-purple-100">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">
        Demo animata — la conversazione reale gira nella dashboard con dati veri
      </p>
    </div>
  )
}

function StepView({ step }: { step: Step }) {
  switch (step.kind) {
    case 'user':
      return (
        <div className="flex justify-end animate-fade-in">
          <div className="max-w-[80%] bg-purple-600 text-white rounded-xl px-4 py-2.5 text-sm">
            {step.text}
          </div>
        </div>
      )
    case 'thinking':
      return (
        <div className="flex justify-start animate-fade-in">
          <div className="text-xs text-gray-500 italic px-1">{step.label}</div>
        </div>
      )
    case 'tool':
      return (
        <div className="flex justify-start animate-fade-in">
          <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300">
            {step.icon === 'document' ? (
              <FileText className="h-3.5 w-3.5 text-blue-400" />
            ) : (
              <Search className="h-3.5 w-3.5 text-green-400" />
            )}
            <span>{step.label}</span>
            <Check className="h-3.5 w-3.5 text-green-400 ml-1" />
          </div>
        </div>
      )
    case 'assistant':
      return (
        <div className="flex justify-start animate-fade-in">
          <div className="max-w-[85%] bg-gray-800/70 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm">
            {step.text}
          </div>
        </div>
      )
    case 'card':
      return (
        <div className="flex justify-start animate-fade-in">
          <div className="max-w-[85%] bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white mb-2">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              {step.title}
            </div>
            <ul className="space-y-1">
              {step.lines.map((line, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-gray-600" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
  }
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-purple-200 animate-bounce" />
      <span className="h-1.5 w-1.5 rounded-full bg-purple-200 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-purple-200 animate-bounce [animation-delay:300ms]" />
    </span>
  )
}
