import Link from "next/link";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  LineChart,
  BellRing,
  FileText,
  Sparkles,
  CreditCard,
  Users,
  Check,
  Star,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

const features = [
  {
    icon: FileText,
    title: "Invoicing that looks professional",
    desc: "Create and send branded invoices in seconds with line items, taxes, discounts, and automatic PDF generation.",
  },
  {
    icon: Sparkles,
    title: "AI payment recovery engine",
    desc: "Utterly automatically detects overdue invoices, categorizes them by age, and drafts tone-aware reminder emails for each client.",
  },
  {
    icon: BellRing,
    title: "Automated follow-up cadence",
    desc: "Custom schedules before the due date, on the due date, and at 3, 7, 15 and 30 days — with escalation built in.",
  },
  {
    icon: LineChart,
    title: "Analytics that matter",
    desc: "Track revenue, outstanding balances, recovery rate and average collection time with clear, real-time charts.",
  },
  {
    icon: CreditCard,
    title: "Online payments",
    desc: "Let clients pay by card with secure Stripe Checkout links — with server-verified payment confirmation.",
  },
  {
    icon: Users,
    title: "Client CRM",
    desc: "Know every client's payment behavior, history and outstanding balance in one place.",
  },
];

const steps = [
  { n: "01", title: "Connect & client", desc: "Add clients, or import them right away. Utterly keeps their history and payment behavior." },
  { n: "02", title: "Send professional invoices", desc: "Create an invoice in minutes. Your client gets a beautiful PDF and a secure payment link." },
  { n: "03", title: "AI recovers the rest", desc: "When a payment runs late, Utterly nudges, follows up, escalates, and recovers your cash — automatically." },
];

const plans = [
  {
    name: "Starter",
    price: 19,
    tagline: "For freelancers getting organized",
    features: ["Up to 25 invoices/month", "Basic payment reminders", "Client management", "Basic dashboard", "PDF invoices"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Professional",
    price: 49,
    tagline: "For growing small businesses",
    features: ["Unlimited invoices", "AI-generated reminders", "Automated follow-ups", "Advanced analytics", "Payment integration", "Priority email support"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Business",
    price: 99,
    tagline: "For agencies & high volume",
    features: ["Everything in Professional", "Advanced AI recovery assistant", "Custom automation workflows", "Advanced reporting & CSV export", "Dedicated priority support"],
    cta: "Contact sales",
    highlight: false,
  },
];

const testimonials = [
  {
    quote: "Utterly's AI reminders recovered two invoices I'd written off. It politely chased clients I was too awkward to email.",
    name: "Maya R.",
    role: "Freelance designer · Austin, TX",
  },
  {
    quote: "We went from chasing every invoice to letting the system handle follow-ups. Our days-sales-outstanding dropped by 40%.",
    name: "Daniel K.",
    role: "Small marketing agency · Denver, CO",
  },
  {
    quote: "The client payment behavior view is gold. We now know exactly who pays late and adjust terms before we work with them.",
    name: "Priya S.",
    role: "Consultant · San Jose, CA",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-600 md:flex">
            <a href="#features" className="hover:text-ink-900">Features</a>
            <a href="#how" className="hover:text-ink-900">How it works</a>
            <a href="#pricing" className="hover:text-ink-900">Pricing</a>
            <a href="#faq" className="hover:text-ink-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-ink-600 hover:text-ink-900">Log in</Link>
            <Link href="/signup" className="btn-primary h-9 px-4">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Zap className="h-4 w-4" />
            AI-powered payment recovery
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink-950 sm:text-6xl">
            Get paid faster with an{" "}
            <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
              AI recovery assistant
            </span>{" "}
            for your invoices
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-500">
            Utterly turns overdue invoices into gentle, automatic reminders. It detects late payments, drafts the right
            message for every client, and follows up until you get paid — so you stay professional without the awkwardness.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary h-12 px-7 text-[15px]">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary h-12 px-7 text-[15px]">
              View live demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-400">No credit card required · Free 14-day trial</p>

          <div className="mx-auto mt-16 max-w-4xl rounded-3xl border border-ink-100 bg-white p-2 shadow-card-hover">
            <div className="rounded-2xl bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] p-6">
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span>Revenue recovered</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-600">
                  <BarChart3 className="h-3.5 w-3.5" /> +38% this quarter
                </span>
              </div>
              <div className="mt-3 flex items-end gap-1.5">
                {[32, 45, 40, 58, 52, 74, 68, 88, 80, 96, 92, 110].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-500 to-brand-300" style={{ height: `${h}%`, minHeight: 12 }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-ink-400">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-ink-100 bg-ink-50/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 text-center sm:grid-cols-4">
          {[["$48M+", "recovered for businesses"], ["18k+", "active companies"], ["92%", "average recovery rate"], ["4.9/5", "customer rating"]].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-bold text-ink-900">{v}</div>
              <div className="mt-1 text-sm text-ink-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Everything you need to get paid</h2>
          <p className="mt-4 text-lg text-ink-500">One platform for invoicing, follow-ups, and recovery — built for small business realities.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-ink-100 bg-ink-50/40">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">How Utterly works</h2>
            <p className="mt-4 text-lg text-ink-500">Three steps between you and getting paid.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card p-6">
                <div className="text-sm font-bold text-brand-500">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-ink-500">Start free. Upgrade when you're growing.</p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative card p-7 ${p.highlight ? "border-brand-300 ring-2 ring-brand-100" : ""}`}
            >
              {p.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-ink-900">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-400">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-ink-950">${p.price}</span>
                <span className="text-sm text-ink-400">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`${p.highlight ? "btn-primary" : "btn-secondary"} mt-8 w-full`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-ink-100 bg-ink-50/40">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Loved by small businesses</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="card p-6">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-700">“{t.quote}”</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{t.name}</div>
                    <div className="text-xs text-ink-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-violet-600 px-8 py-16 text-center text-white">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Stop chasing payments. Start growing.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Join thousands of US businesses recovering more of what they're owed.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-[15px] font-medium text-brand-700 shadow hover:bg-ink-50">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-ink-100">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink-950">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {[
              ["Is my payment data secure?", "Yes. Payments are processed by Stripe through server-verified webhooks. We never mark an invoice paid based on a frontend action."],
              ["Does Utterly send emails for me?", "You stay in control. You review and approve every reminder before it goes out — and you can configure the whole cadence."],
              ["Can I use it with my own email provider?", "Absolutely. Connect Resend or SendGrid to send real emails. Without one, Utterly runs in a clearly-labeled simulated mode."],
              ["How does the AI assistant work?", "It uses your real invoice data to answer questions, draft tone-aware reminders, and recommend recovery strategies. Connect an OpenAI key to unlock live LLM responses."],
            ].map(([q, a]) => (
              <details key={q} className="group card p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-medium text-ink-900">
                  {q}
                  <span className="text-ink-400 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-ink-50/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-12 sm:flex-row">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-400">AI invoice & payment recovery for US small businesses.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-ink-500">
            <a href="#features" className="hover:text-ink-900">Features</a>
            <a href="#pricing" className="hover:text-ink-900">Pricing</a>
            <Link href="/login" className="hover:text-ink-900">Log in</Link>
            <Link href="/signup" className="hover:text-ink-900">Sign up</Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> SOC 2 · PCI-DSS
          </div>
        </div>
      </footer>
    </div>
  );
}
