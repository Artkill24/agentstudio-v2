import { Sparkles, Users, FileText, Search, Receipt, UsersRound } from 'lucide-react'
import LiveDemo from '@/components/LiveDemo'

export default function Home() {
  const features = [
    {
      name: 'Client Agent',
      description: 'Chat intelligente per assistenza clienti 24/7 con risposte personalizzate',
      icon: Users,
    },
    {
      name: 'Document Generator',
      description: 'Genera contratti, lettere formali, privacy policy e termini di servizio',
      icon: FileText,
    },
    {
      name: 'Invoice Generator',
      description: 'Crea fatture professionali con calcolo automatico IVA, ritenuta e bollo',
      icon: Receipt,
    },
    {
      name: 'Research Agent',
      description: 'Ricerca giurisprudenza italiana, normative e precedenti in tempo reale',
      icon: Search,
    },
    {
      name: 'Team Management',
      description: 'Gestisci team e collaborazioni con permessi e ruoli personalizzati',
      icon: UsersRound,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <nav className="px-6 py-4 border-b border-gray-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">AgentStudio</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Prezzi
            </a>
            <a href="/auth" className="text-sm font-semibold text-white hover:text-purple-300 transition-colors">
              Accedi
            </a>
          </div>
        </div>
      </nav>

      <div className="px-6 pt-20 pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold text-white sm:text-6xl lg:text-7xl mb-8">
            Agenti AI per il tuo Studio Professionale
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Trasforma il tuo studio con agenti AI che lavorano 24/7
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/auth" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all">
              <Sparkles className="mr-2 h-5 w-5" />
              Prova Gratis 14 Giorni
            </a>
            <a href="/pricing" className="inline-flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 px-8 py-4 text-lg font-semibold text-white hover:bg-gray-700 transition-all">
              Vedi Prezzi
            </a>
          </div>
        </div>

        <div className="mt-20">
          <LiveDemo />
        </div>
      </div>

      <div className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            5 Agenti AI per il tuo studio
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-16">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.name} className="rounded-xl bg-gray-800/50 backdrop-blur-sm p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
                  <div className="mb-4">
                    <div className="inline-flex rounded-lg bg-purple-500/20 p-3">
                      <Icon className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{feature.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Inizia oggi gratuitamente
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Nessuna carta richiesta
          </p>
          <a href="/auth" className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg">
            Inizia Gratis
          </a>
        </div>
      </div>

      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="mx-auto max-w-7xl text-center text-sm text-gray-400">
          <p>2025 AgentStudio</p>
        </div>
      </footer>
    </div>
  )
}
