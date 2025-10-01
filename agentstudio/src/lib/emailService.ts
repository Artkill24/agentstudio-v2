export class EmailService {
  private apiKey = process.env.RESEND_API_KEY
  private from = 'AgentStudio <onboarding@resend.dev>'

  private async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      console.error('RESEND_API_KEY not configured')
      return false
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: this.from, to, subject, html })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Email send failed:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Email send error:', error)
      return false
    }
  }

  async sendTeamInvitation(email: string, teamName: string, inviterName: string, inviteLink: string) {
    return this.send(
      email,
      `Invito a collaborare in ${teamName}`,
      `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invito a collaborare</h1>
            </div>
            <div class="content">
              <p>Ciao,</p>
              <p><strong>${inviterName}</strong> ti ha invitato nel team <strong>${teamName}</strong> su AgentStudio.</p>
              <p>AgentStudio è la piattaforma AI per studi professionali.</p>
              <center>
                <a href="${inviteLink}" class="button">Accetta Invito</a>
              </center>
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Questo invito scade tra 7 giorni.
              </p>
            </div>
            <div class="footer">
              <p>AgentStudio - Piattaforma AI per Studi Professionali</p>
            </div>
          </body>
        </html>
      `
    )
  }

  async sendTrialExpiring(email: string, daysRemaining: number) {
    return this.send(
      email,
      `Prova gratuita in scadenza (${daysRemaining} giorni)`,
      `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2>La tua prova gratuita sta per scadere</h2>
            <p>La tua prova gratuita scadrà tra <strong>${daysRemaining} giorni</strong>.</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Gestisci Abbonamento
              </a>
            </p>
          </body>
        </html>
      `
    )
  }

  async sendPaymentFailed(email: string, amount: number) {
    return this.send(
      email,
      'Problema con il pagamento',
      `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #dc2626;">Pagamento non riuscito</h2>
            <p>Non siamo riusciti a processare €${amount} per il tuo abbonamento.</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Aggiorna Metodo di Pagamento
              </a>
            </p>
          </body>
        </html>
      `
    )
  }

  async sendWelcome(email: string, name: string) {
    return this.send(
      email,
      'Benvenuto in AgentStudio!',
      `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Benvenuto ${name}!</h2>
            <p>Grazie per esserti registrato. Hai 14 giorni di prova gratuita.</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Vai alla Dashboard
              </a>
            </p>
          </body>
        </html>
      `
    )
  }
}

export const emailService = new EmailService()