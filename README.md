# AgentStudio

AI platform for Italian professional studios (engineering, legal, accounting) — chat agents, legal research, document generation, and team management with subscription billing.

**Live:** [agentstudio-v2.vercel.app](https://agentstudio-v2.vercel.app)

## Features

- **Chat Agent** — multi-model AI assistant via OpenRouter (Gemini, Llama 3.3, Claude Haiku, Qwen) with automatic fallback across free-tier models
- **Research Agent** — structured legal/technical research with saved history
- **Document Generator** — contracts and professional documents rendered to PDF (`@react-pdf/renderer`)
- **Invoice Generator** — PDF invoices with itemized tables (jsPDF)
- **Teams** — invitations, roles, and per-member permissions
- **Billing** — Stripe subscriptions with checkout, customer portal, and webhook lifecycle
- **Rate limiting & plan enforcement** — per-plan usage limits enforced server-side

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) · React 19 · TypeScript |
| Auth & DB | Supabase (SSR auth helpers, Postgres) |
| Payments | Stripe (subscriptions, webhooks, customer portal) |
| AI | OpenRouter multi-model fallback · Google Gemini |
| PDF | @react-pdf/renderer · jsPDF |
| Monitoring | Sentry |
| Validation | Zod |
| Styling | Tailwind CSS · lucide-react |
| Deploy | Vercel · GitHub Actions (daily DB backup to artifacts) |

## Getting started

```bash
git clone https://github.com/Artkill24/agentstudio-v2.git
cd agentstudio-v2/agentstudio
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev
```

### Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
SENTRY_DSN=
```

## Architecture

```
src/
├── app/
│   ├── api/          # chat, research, document, invoice, teams, stripe, dashboard
│   ├── dashboard/    # main app UI
│   ├── teams/        # team management
│   └── pricing/      # plans + checkout
├── components/       # feature components + PDF templates
└── lib/              # supabase, stripe, openrouter client, rate limiter,
                      # plan limits enforcer, validation (zod), agents
```

API routes are thin handlers; business logic lives in `src/lib` (rate limiting, plan enforcement, model fallback, document/research agents).

## Database backup

Daily GitHub Actions workflow dumps all Supabase tables to workflow artifacts (30-day retention). Restore with `npm run restore`.

## License

MIT — [@Artkill24](https://github.com/Artkill24)
