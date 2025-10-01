import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: 0.1, // 10% delle transazioni
  
  debug: false,
  
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  environment: process.env.NODE_ENV,

  beforeSend(event, hint) {
    // Filtra errori non importanti
    if (event.exception) {
      const error = hint.originalException
      
      // Ignora errori di rete comuni
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string
        if (message.includes('Network request failed') || 
            message.includes('Failed to fetch')) {
          return null
        }
      }
    }
    return event
  }
})