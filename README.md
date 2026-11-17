# Utterly – AI Invoice & Payment Recovery Platform

Utterly is a modern, production-ready SaaS platform that helps US small businesses, freelancers, agencies, and service providers get paid faster. It combines invoice management with an AI-powered payment recovery engine that automatically detects overdue invoices, generates personalized reminder emails, and recommends recovery strategies.

Built with **Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL, Stripe, Resend/SendGrid, Recharts, and react-pdf**.

---

## Features

| Area | Highlights |
| --- | --- |
| **Landing & auth** | Marketing page, signup/login/logout, forgot/reset password, onboarding wizard |
| **Dashboard** | Invoices created, revenue collected, outstanding, overdue, recovered, recovery rate, monthly charts, recent transactions, upcoming deadlines, overdue alerts |
| **Invoices** | CRUD, duplicate, PDF download, shared pay link, statuses (draft/sent/paid/partial/overdue/cancelled), search/filter/sort, payment history |
| **AI recovery** | Auto-detect overdue, age bucketing (1–7/8–30/31–60/60+), tone-aware emails, follow-up scheduling, strategies, reminder history, and an assistant panel |
| **Email automation** | Configurable schedule (pre-due, due date, +3/+7/+15/+30 escalation), templates, tone, preview before send, simulated fallback |
| **Clients (CRM)** | Business/contact details, totals, payment behavior, notes, tags, activity timeline |
| **Payments** | Stripe Checkout pay links, webhook-verified updates, payment history |
| **Reports** | Revenue, outstanding trends, recovery trends, client balances, avg collection time, recovery rate, CSV export |
| **Subscriptions** | Starter/Professional/Business plans, plan limits, billing history |
| **Admin** | Separate admin area: users, subscriptions, platform revenue, usage, plans, logs, suspend/activate |

> **Data isolation** — every query is scoped to the authenticated user's ID. Admin routes are role-guarded (`ADMIN`) separately from normal users.

---

## Tech Stack

- **Frontend:** React 19 + Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts, lucide-react
- **Backend:** Next.js Route Handlers (server-side API), Zod validation
- **Database:** PostgreSQL + Prisma ORM (SQLite for local dev)
- **Auth:** Session-based (signed JWT via `jose`, httpOnly cookie)
- **Payments:** Stripe (Checkout, Subscriptions, webhooks)
- **Email:** Resend or SendGrid (with an honest simulated fallback when unconfigured)
- **PDF:** `@react-pdf/renderer`
- **AI:** OpenAI-compatible LLM API (optional; functional demo mode when unconfigured)

---

## Getting Started

### Prerequisites
- Node.js 20+ (Node 24 recommended)
- npm 10+
- (Optional) PostgreSQL for production — `file:./prisma/dev.db` SQLite is used locally by default

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root and fill in the values from the [Environment Variables](#environment-variables) table below. For local development, only `DATABASE_URL` (and optionally `AUTH_SECRET`) are required — every integration has an honest demo/fallback mode. **Never commit `.env`.**

### 3. Create the database schema

```bash
npm run db:migrate   # applies the migration (and seeds if configured)
```

Or push the schema without a migration file:

```bash
npm run db:push
```

### 4. Seed demo data

```bash
npm run db:seed
```

This creates a **demo workspace** with realistic invoices, clients, payments, reminders, and a subscription. Sign in with:

- **Email:** `demo@utterly.app`
- **Password:** `demonstration123`

The demo user is flagged `isDemoUser`, and demo data is clearly labeled in the UI (the dashboard shows a "demo data" banner). Data is visually separated from real activity. If `ADMIN_EMAIL` is set in `.env`, a first admin account is also created.

### 5. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## Environment Variables

### Required for local run

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Default `file:./prisma/dev.db` (SQLite). For production use e.g. `postgresql://user:pass@host:5432/utterly` |
| `AUTH_SECRET` | Signing secret for session JWTs. `openssl rand -base64 32`. Change the dev default in production |

### Optional integrations (functional demo mode when absent)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL, e.g. `https://app.utterly.com`. Defaults to `http://localhost:3000` |
| `OPENAI_API_KEY` | Enables **real** AI recovery/assistant responses (OpenAI-compatible). Without it, the assistant runs in a clearly-labeled demo mode that queries your real DB |
| `OPENAI_BASE_URL` | Optional. Default `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Optional. Default `gpt-4o-mini` |
| `RESEND_API_KEY` | Enables real email delivery via Resend |
| `SENDGRID_API_KEY` | Enables real email delivery via SendGrid (alternative to Resend) |
| `EMAIL_FROM` | Sender address, e.g. `Utterly <no-reply@utterly.app>` |

### Stripe (payments & subscriptions)

| Variable | Description |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side only, never exposed to the frontend) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for the frontend |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) for `/api/webhooks/stripe` |
| `STRIPE_PRICE_STARTER` | Price ID for the Starter plan ($19) |
| `STRIPE_PRICE_PROFESSIONAL` | Price ID for the Professional plan ($49) |
| `STRIPE_PRICE_BUSINESS` | Price ID for the Business plan ($99) |

> **Payment safety** — invoices are **never** marked paid by a frontend action. Payments are only confirmed server-side via the Stripe webhook and stored as `Payment` records with transaction references.

### Admin

| Variable | Description |
| --- | --- |
| `ADMIN_EMAIL` | Email to create a first ADMIN account at seed time |

---

## Scripts

```bash
npm run dev            # start dev server
npm run build          # production build
npm run start          # run production build
npm run lint           # ESLint
npm run typecheck      # TypeScript type-check (tsc --noEmit)
npm run db:migrate     # apply Prisma migration
npm run db:push        # push schema to DB (no migration file)
npm run db:seed        # seed demo data
npm run db:studio      # open Prisma Studio
```

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma        # full data model (users, clients, invoices, items,
│   │                        #   payments, reminders, emailLogs, automationSettings,
│   │                        #   subscriptions, auditLogs)
│   ├── migrations/          # SQL migrations
│   └── seed.ts              # demo workspace seed
├── src/
│   ├── app/
│   │   ├── layout.tsx       # root layout, font, design tokens
│   │   ├── globals.css      # Tailwind design system + theme
│   │   ├── page.tsx         # landing page
│   │   ├── login/ signup/ forgot-password/ reset-password/
│   │   ├── onboarding/      # onboarding wizard
│   │   ├── dashboard/       # dashboard shell + pages
│   │   ├── pay/[token]/     # public Stripe Checkout pay page
│   │   ├── i/[token]/       # public shared invoice view
│   │   └── api/             # server-side Route Handlers
│   │       ├── auth/  onboarding/  dashboard/
│   │       ├── invoices/  clients/  ai/  reminders/  automation/  emails/
│   │       ├── payments/  reports/  subscription/  admin/
│   │       └── webhooks/stripe/  pdf/  export/
│   ├── components/          # reusable UI primitives + feature components
│   ├── lib/
│   │   ├── db.ts            # Prisma client
│   │   ├── auth.ts          # session management (jose)
│   │   ├── validation.ts    # Zod schemas
│   │   ├── ai.ts            # AI recovery engine (bucketing, tone, assistant)
│   │   ├── email.ts         # Resend/SendGrid + simulated fallback
│   │   ├── stripe.ts        # Stripe server-side (checkout, subscription, webhook)
│   │   ├── pdf.ts           # invoice PDF generation
│   │   ├── audit.ts         # audit logging
│   │   └── rateLimit.ts     # simple rate limiting
│   └── context/auth.tsx     # client auth context
└── README.md
```

---

## How the AI Recovery Engine Works

1. **Auto-detection** — invoices past due are flagged live from the database.
2. **Age bucketing** — overdue is categorized: 1–7d, 8–30d, 31–60d, 60+d.
3. **Tone adjustment** — reminder tone (polite → professional → friendly → firm) is chosen from overdue duration and the client's relationship/payment behavior.
4. **Templates** — personalized email copy with the correct amounts, dates, and pay links.
5. **Follow-up sequencing** — recommends the next best follow-up date and builds a timeline.
6. **Strategies** — suggests recovery actions per invoice.
7. **Assistant panel** — answers questions like *"Which clients have the highest outstanding balances?"*, *"Write a reminder for a client who is 15 days late."*, etc. When `OPENAI_API_KEY` is set it uses the real LLM; otherwise it runs a clearly-labeled in-app demo mode that still reads real data.

---

## Deployment Notes

- **Database** — use PostgreSQL in production. If `DATABASE_URL` points to a Unix socket (e.g. `?host=/var/run/postgresql`), Prisma doesn't support it; use a TCP host instead.
- **Build** — `npm run build` runs `next build` with `tsc --noEmit`; keep the `typecheck` script clean.
- **Webhooks** — expose `/api/webhooks/stripe` to Stripe. Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local testing.
- **Session cookies** — set `AUTH_SECRET` to a strong random value and use HTTPS in production.
- **Email** — add your sending domain to Resend/SendGrid and verify the `EMAIL_FROM` address.

---

## Security & Compliance

- Secrets live only in server-side env vars; never in frontend code.
- Zod input validation on every API route.
- Authorization checks on every data-scoped query; admin routes require role `ADMIN`.
- Rate limiting on auth-heavy endpoints.
- Audit logging via `AuditLog` records.
- Payments verified only server-side via Stripe webhooks.
