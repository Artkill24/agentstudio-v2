import { Sparkles, Users, FileText, Search, BarChart3 } from 'lucide-react'

export default function Home() {
  const features = [
    {
      name: 'AI Client Agent',
      description: 'Gestisce email, appuntamenti e richieste clienti 24/7',
      icon: Users,
    },
    {
      name: 'Document Generator', 
      description: 'Crea contratti, fatture e documenti legali automaticamente',
      icon: FileText,
    },
    {
      name: 'Research Agent',
      description: 'Ricerca giurisprudenza, normative e precedenti in tempo reale',
      icon: Search,
    },
    {
      name: 'Business Analytics',
      description: 'Dashboard intelligente per performance e insights',
      icon: BarChart3,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">AgentStudio</span>
          </div>
          <a href="/auth" className="text-sm font-semibold text-white hover:text-purple-300">
            Accedi →
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="px-6 pt-14 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-6xl mb-6">
            Agenti AI per il tuo{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Studio Professionale
            </span>
          </h1>
          
          <p className="text-lg text-gray-300 mb-10">
            Trasforma il tuo studio con agenti AI che lavorano 24/7. Gestione clienti, 
            documenti e ricerche automatizzate. Progettato per professionisti italiani.
          </p>
          
          <a 
            href="/auth" 
            className="inline-flex items-center rounded-lg bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-purple-700"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Prova Gratis 14 Giorni
          </a>
        </div>
      </div>

      {/* Features */}
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            4 Agenti AI per il tuo studio
          </h2>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.name} className="rounded-2xl bg-gray-800/40 p-6 border border-gray-700/50">
                  <div className="mb-4">
                    <div className="inline-flex rounded-lg bg-purple-500/20 p-3">
                      <Icon className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.name}</h3>
                  <p className="text-gray-300 text-sm">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}