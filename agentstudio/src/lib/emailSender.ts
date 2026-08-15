interface SendEmailInput {
  to: string
  subject: string
  bodyText: string
  senderName: string // nome dello studio, mostrato come mittente
  replyTo: string // email vera del professionista, dove arrivano le risposte
}

interface SendEmailResult {
  sent: boolean
  error?: string
}

/**
 * Invia un'email tramite Resend. Il mittente tecnico è un indirizzo verificato
 * di AgentStudio (obbligatorio: i provider bloccano mittenti non verificati per
 * anti-spoofing), ma il nome visualizzato è quello dello studio e le risposte
 * del cliente arrivano direttamente alla vera email del professionista (Reply-To).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, error: 'Servizio email non configurato (RESEND_API_KEY mancante)' }
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${input.senderName} <${fromAddress}>`,
        to: [input.to],
        reply_to: input.replyTo,
        subject: input.subject,
        text: input.bodyText,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return { sent: false, error: `Invio fallito: ${errorBody}` }
    }

    return { sent: true }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Errore di connessione al servizio email',
    }
  }
}
