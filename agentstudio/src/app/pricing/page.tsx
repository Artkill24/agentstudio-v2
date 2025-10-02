'use client'

import { Check, Sparkles } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: 99,
    description: 'Perfetto per piccoli studi professionali',
    paymentLink: 'https://buy.stripe.com/6oU8wQd6d8MU4xFgoBasg01',
    popular: false,
    features: [
      '50 documenti generati al mese',
      '20 ricerche approfondite',
      '500 messaggi chat AI',
      'Tutti gli agenti AI',
      'Supporto email',
      'Dashboard analytics'
    ]
  },
  {
    name: 'Professional',
    price: 199,
    description: 'Per studi in crescita con team',
    paymentLink: 'https://buy.stripe.com/6oUcN6c290goc074FTasg02',
    popular: true,
    features: [
      'Documenti illimitati',
      'Ricerche illimitate',
      'Chat illimitata',
      'Gestione team (fino 10 membri)',
      'Supporto prioritario',
      'API access',
      'Export dati',
      'Branding personalizzato'
    ]
  },
  {
    name: 'Enterprise',
    price: 399,
    description: 'Soluzioni su misura per grandi studi',
    paymentLink: 'https://buy.stripe.com/4gM28s3vD6EMd4bgoBasg00',
    popular: false,
    features: [
      'Tutto di Professional',
      'Team illimitati (999 membri)',
      'Dedicated account manager',
      'SLA garantito 99.9%',
      'Onboarding personalizzato',
      'Custom integrations',
      'Compliance audit support',
      'Priority feature requests'
    ]
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Prezzi Semplici e Trasparenti
          </h1>
          <p className="text-xl text-gray-300">
            Prova gratuita 14 giorni. Cancella quando vuoi.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const cardClass = plan.popular
              ? 'relative rounded-2xl p-8 bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-400'
              : 'relative rounded-2xl p-8 bg-gray-800 border border-gray-700';
            
            const buttonClass = plan.popular
              ? 'block w-full py-3 px-6 rounded-lg font-semibold text-center transition-all mb-6 bg-white text-purple-700 hover:bg-gray-100'
              : 'block w-full py-3 px-6 rounded-lg font-semibold text-center transition-all mb-6 bg-purple-600 text-white hover:bg-purple-700';

            return (
              <div key={plan.name} className={cardClass}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Più Popolare
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-white">€{plan.price}</span>
                    <span className="text-lg text-gray-400">/mese</span>
                  </div>
                </div>

                <a href={plan.paymentLink} className={buttonClass}>
                  Inizia Prova Gratuita
                </a>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Domande Frequenti
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">
                Come funziona la prova gratuita?
              </h3>
              <p className="text-sm">
                14 giorni completi di accesso. Nessuna carta richiesta.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                Posso cambiare piano?
              </h3>
              <p className="text-sm">
                Sì, upgrade o downgrade in qualsiasi momento.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                Metodi di pagamento?
              </h3>
              <p className="text-sm">
                Carte, bonifico SEPA tramite Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                I dati sono sicuri?
              </h3>
              <p className="text-sm">
                Conformi GDPR, server EU, backup giornalieri.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-12 py-8 border-t border-gray-800">
          <div className="text-center text-gray-400 text-sm space-y-2">
            <div className="space-x-4">
              <a href="/privacy" className="hover:text-purple-400">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-purple-400">Termini di Servizio</a>
            </div>
            <div>© 2025 AgentStudio - Saad Kaicar</div>
          </div>
        </footer>
      </div>
    </div>
  )
}