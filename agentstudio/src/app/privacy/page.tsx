export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-4">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Titolare del Trattamento</h2>
            <p className="text-gray-300">
              AgentStudio è gestito da <strong>Saad Kaicar</strong>.<br/>
              Email: support@agentstudio.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Dati Raccolti</h2>
            <p className="text-gray-300 mb-4">Raccogliamo le seguenti categorie di dati personali:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Dati di registrazione:</strong> nome, cognome, email, password (criptata)</li>
              <li><strong>Dati di utilizzo:</strong> documenti generati, ricerche effettuate, interazioni con agenti AI</li>
              <li><strong>Dati di pagamento:</strong> processati tramite Stripe (non memorizziamo carte di credito)</li>
              <li><strong>Dati tecnici:</strong> indirizzo IP, browser, device, log di accesso</li>
              <li><strong>Cookie:</strong> cookie essenziali per autenticazione e funzionalità del servizio</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Base Giuridica del Trattamento</h2>
            <p className="text-gray-300 mb-4">Trattiamo i tuoi dati sulla base di:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Esecuzione del contratto:</strong> per fornirti i servizi richiesti</li>
              <li><strong>Consenso:</strong> per comunicazioni marketing (opzionale)</li>
              <li><strong>Legittimo interesse:</strong> per migliorare il servizio e prevenire frodi</li>
              <li><strong>Obbligo legale:</strong> per fatturazione e adempimenti fiscali</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Finalità del Trattamento</h2>
            <p className="text-gray-300 mb-4">I tuoi dati sono utilizzati per:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Fornire e gestire il servizio AgentStudio</li>
              <li>Processare pagamenti e gestire abbonamenti</li>
              <li>Generare documenti, ricerche e risposte AI personalizzate</li>
              <li>Fornire supporto clienti</li>
              <li>Inviare notifiche essenziali sul servizio</li>
              <li>Migliorare funzionalità e sicurezza della piattaforma</li>
              <li>Rispettare obblighi legali e fiscali</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Condivisione Dati con Terze Parti</h2>
            <p className="text-gray-300 mb-4">I tuoi dati possono essere condivisi con:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Supabase:</strong> hosting database (UE)</li>
              <li><strong>Stripe:</strong> processamento pagamenti (conforme PCI-DSS)</li>
              <li><strong>OpenRouter/DeepSeek:</strong> elaborazione AI (dati anonimizzati quando possibile)</li>
              <li><strong>Resend:</strong> invio email transazionali</li>
            </ul>
            <p className="text-gray-300 mt-4">
              <strong>Non vendiamo mai i tuoi dati personali a terze parti.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Trasferimenti Internazionali</h2>
            <p className="text-gray-300">
              Alcuni fornitori di servizi possono essere ubicati fuori dall'UE. 
              In tali casi, garantiamo protezioni adeguate tramite clausole contrattuali standard 
              approvate dalla Commissione Europea o altre garanzie conformi al GDPR.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Conservazione dei Dati</h2>
            <p className="text-gray-300 mb-4">Conserviamo i tuoi dati per:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Dati account:</strong> fino alla cancellazione dell'account</li>
              <li><strong>Documenti generati:</strong> fino a richiesta di cancellazione o 2 anni dall'ultimo accesso</li>
              <li><strong>Dati fatturazione:</strong> 10 anni (obbligo fiscale italiano)</li>
              <li><strong>Log tecnici:</strong> 6 mesi</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. I Tuoi Diritti (GDPR)</h2>
            <p className="text-gray-300 mb-4">Hai diritto a:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Accesso:</strong> ottenere copia dei tuoi dati</li>
              <li><strong>Rettifica:</strong> correggere dati inesatti</li>
              <li><strong>Cancellazione:</strong> richiedere eliminazione dati ("diritto all'oblio")</li>
              <li><strong>Limitazione:</strong> limitare il trattamento in determinate circostanze</li>
              <li><strong>Portabilità:</strong> ricevere dati in formato strutturato</li>
              <li><strong>Opposizione:</strong> opporti al trattamento per motivi legittimi</li>
              <li><strong>Revoca consenso:</strong> ritirare consenso in qualsiasi momento</li>
              <li><strong>Reclamo:</strong> presentare reclamo al Garante Privacy italiano</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Per esercitare i tuoi diritti, contattaci a: <strong>privacy@agentstudio.com</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Sicurezza</h2>
            <p className="text-gray-300">
              Implementiamo misure tecniche e organizzative per proteggere i tuoi dati: 
              crittografia SSL/TLS, password criptate con bcrypt, backup giornalieri, 
              controllo accessi, monitoraggio sicurezza.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Cookie</h2>
            <p className="text-gray-300">
              Utilizziamo cookie essenziali per autenticazione e funzionamento del servizio. 
              Non utilizziamo cookie di profilazione senza consenso esplicito.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Minori</h2>
            <p className="text-gray-300">
              AgentStudio non è destinato a minori di 18 anni. 
              Non raccogliamo consapevolmente dati di minori.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">12. Modifiche alla Privacy Policy</h2>
            <p className="text-gray-300">
              Ci riserviamo il diritto di aggiornare questa policy. 
              Modifiche sostanziali saranno comunicate via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">13. Contatti</h2>
            <p className="text-gray-300">
              Per domande sulla privacy:<br/>
              Email: privacy@agentstudio.com<br/>
              Titolare: Saad Kaicar
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}