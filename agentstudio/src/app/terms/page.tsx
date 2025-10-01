export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-white mb-8">Termini di Servizio</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-4">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Accettazione dei Termini</h2>
            <p className="text-gray-300">
              Utilizzando AgentStudio, accetti questi Termini di Servizio. 
              Se non accetti, non utilizzare il servizio.
              Il fornitore del servizio è <strong>Saad Kaicar</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Descrizione del Servizio</h2>
            <p className="text-gray-300 mb-4">
              AgentStudio fornisce una piattaforma SaaS per studi professionali che include:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Generazione automatica di documenti legali tramite AI</li>
              <li>Assistente chat AI per supporto clienti</li>
              <li>Agente di ricerca con sintesi AI</li>
              <li>Gestione team e collaborazione</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Registrazione e Account</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Devi avere almeno 18 anni per creare un account</li>
              <li>Fornisci informazioni accurate e aggiornate</li>
              <li>Mantieni la sicurezza delle tue credenziali</li>
              <li>Sei responsabile di tutte le attività sul tuo account</li>
              <li>Un account per persona o organizzazione</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Piani e Pagamenti</h2>
            <p className="text-gray-300 mb-4">
              <strong>4.1 Piani Disponibili:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li>Piano Free: accesso limitato gratuito</li>
              <li>Piano Starter: €99/mese</li>
              <li>Piano Professional: €199/mese</li>
              <li>Piano Enterprise: €399/mese</li>
            </ul>
            <p className="text-gray-300 mb-4">
              <strong>4.2 Fatturazione:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Fatturazione mensile automatica tramite Stripe</li>
              <li>Prezzi in Euro (€), IVA esclusa dove applicabile</li>
              <li>Prova gratuita: 14 giorni (no carta richiesta per Free)</li>
              <li>Disdetta: cancellazione entro fine mese in corso</li>
              <li>Nessun rimborso per periodi già pagati</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Utilizzo Accettabile</h2>
            <p className="text-gray-300 mb-4"><strong>NON puoi:</strong></p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Utilizzare il servizio per attività illegali</li>
              <li>Violare diritti di proprietà intellettuale</li>
              <li>Caricare contenuti offensivi, diffamatori o illeciti</li>
              <li>Tentare di accedere ad aree non autorizzate</li>
              <li>Effettuare reverse engineering del software</li>
              <li>Rivendere o subappaltare il servizio senza autorizzazione</li>
              <li>Utilizzare bot o automazioni per abusare del servizio</li>
              <li>Condividere account tra più utenti (tranne team autorizzati)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Limiti del Servizio</h2>
            <p className="text-gray-300 mb-4">
              Ogni piano ha limiti mensili su:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Numero di documenti generati</li>
              <li>Numero di ricerche effettuate</li>
              <li>Numero di messaggi chat</li>
              <li>Numero di membri del team (Professional+)</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Il superamento dei limiti richiede upgrade del piano.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Contenuti Generati da AI</h2>
            <p className="text-gray-300 mb-4">
              <strong>IMPORTANTE:</strong> I contenuti generati dagli agenti AI sono forniti "così come sono".
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Non sostituiscono consulenza legale professionale</li>
              <li>Devono essere sempre revisionati da professionisti qualificati</li>
              <li>AgentStudio non garantisce accuratezza o conformità legale</li>
              <li>L'utente è responsabile dell'uso dei contenuti generati</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Proprietà Intellettuale</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Nostra proprietà:</strong> software, design, logo, brand AgentStudio</li>
              <li><strong>Tua proprietà:</strong> contenuti che carichi e documenti generati</li>
              <li>Ci concedi licenza limitata per processare i tuoi contenuti per fornire il servizio</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Garanzie e Limitazioni</h2>
            <p className="text-gray-300 mb-4">
              <strong>9.1 Disclaimer:</strong> Il servizio è fornito "AS IS" senza garanzie di alcun tipo.
            </p>
            <p className="text-gray-300 mb-4">
              <strong>9.2 Limitazione responsabilità:</strong> AgentStudio non è responsabile per:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Danni diretti, indiretti, incidentali o consequenziali</li>
              <li>Perdita di profitti, dati o opportunità commerciali</li>
              <li>Interruzioni del servizio o errori nei contenuti generati</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Responsabilità massima limitata a importo pagato negli ultimi 12 mesi.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Sospensione e Terminazione</h2>
            <p className="text-gray-300 mb-4">
              Possiamo sospendere o terminare il tuo account se:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Violi questi Termini</li>
              <li>Manchino pagamenti dovuti</li>
              <li>Richiesto dalla legge</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Puoi cancellare il tuo account in qualsiasi momento dalle impostazioni.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Modifiche ai Termini</h2>
            <p className="text-gray-300">
              Ci riserviamo il diritto di modificare questi termini. 
              Modifiche sostanziali saranno comunicate con 30 giorni di preavviso via email.
              Uso continuato = accettazione modifiche.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">12. Legge Applicabile</h2>
            <p className="text-gray-300">
              Questi termini sono regolati dalla legge italiana. 
              Foro competente: Tribunale di [Città sede], Italia.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">13. Contatti</h2>
            <p className="text-gray-300">
              Per domande sui Termini:<br/>
              Email: legal@agentstudio.com<br/>
              Fornitore: Saad Kaicar
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}