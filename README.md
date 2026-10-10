# 🪝 BaitBreaker

**See the hook. Break the bait.**

**Live demo:** https://baitbreaker.vercel.app

An AI-powered scam detection and inoculation platform, built for **ForgeHacks 2026** (AI + Cybersecurity track).

Scams cost people over a trillion dollars a year, and generative AI has made them fluent, personalized, and multilingual. BaitBreaker fights back with the same technology in two layers:

1. **Analyst-grade detection** — paste any message or upload a screenshot. Every manipulation tactic gets highlighted inline with plain-English explanations, a calibrated risk score, what-the-sender-wants analysis, a safe response, and a ready-to-send incident report.
2. **Inoculation training** — the **Scam Gym** generates adaptive scam scenarios (SMS, email, phone calls, DMs, marketplace, job offers) at five difficulty levels, then scores your ability to spot the tells. Training beats tooling: one good detector won't save you from the thousandth message, but recalibrated instincts will.

## How it works

```
Message text / screenshot
        │
        ▼
┌─────────────────────┐     instant, zero-cost
│  Heuristic scanner  │ ──► 12-tactic regex engine (urgency, OTP theft,
└─────────────────────┘     lookalike domains, payment pressure, …)
        │
        ▼
┌─────────────────────┐     hedged multi-model racing
│   Gemini analysis   │ ──► structured JSON: verdict, 0–100 score,
└─────────────────────┘     verbatim tactic quotes, asks, safe reply,
        │                   report summary
        ▼
┌─────────────────────┐
│  Inline highlighter │ ──► every tactic marked inside the original text
└─────────────────────┘
```

- **Structured outputs** — Gemini returns schema-validated JSON (verdict, tactics with verbatim quotes, asks, safe reply, report), not prose.
- **Multimodal** — screenshots are transcribed and analyzed as conversations.
- **Multilingual** — scams in any language; output in English.
- **Resilient by design** — hedged racing across models with hard timeouts, heuristic fallback if the API is unreachable, and deterministic client-free scoring in the Gym. The demo cannot die.

## The 12 tactics detected

urgency · authority impersonation · fear & threats · greed & rewards · secrecy & isolation · unusual payment demands · credential phishing (OTP theft) · suspicious links · too-good-to-be-true offers · fake context/pretexting · remote access requests · emotional manipulation

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS 4**
- **Google Gemini** via the Interactions API with structured JSON output
- Zero database — privacy-preserving by design; nothing is stored server-side

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev
```

Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

Optional env vars:

```bash
GEMINI_MODEL=            # force a single model (default: hedged 3.5-flash → 3.1-flash-lite → 3.5-flash-lite → 3-flash-preview → 3.8-flash)
GEMINI_API_KEY_2=        # extra keys FROM SEPARATE PROJECTS multiply free capacity (quota is per project)
GEMINI_API_KEY_3=
GEMINI_API_KEY_4=
```

### Maximizing free capacity

Free-tier quotas are enforced **per model** and **per project**, so BaitBreaker stretches them three ways at zero cost:

1. **Multi-model hedging** — each of the five models in the chain is a separate daily quota bucket.
2. **Multi-key rotation** — each extra key from a *separate* Google Cloud project is another quota bucket; keys rotate automatically, and a rate-limited (429) request is retried on the next key before falling back to another model.
3. **Response cache** — identical inputs (e.g. the demo sample buttons) are served from memory with zero API calls.

## Testing

```bash
node scripts/test-corpus.mjs   # 10-message verdict consistency check (needs dev server running)
node scripts/bench-models.mjs  # latency benchmark across models
```

## Project structure

```
src/
  app/
    page.tsx              # landing
    analyze/              # Message Analyzer UI
    gym/                  # Scam Gym UI
    api/analyze/          # text + image analysis endpoint
    api/gym/              # scenario generation + scoring endpoint
  components/
    HighlightedText.tsx   # inline tactic highlighter
    RiskGauge.tsx         # animated 0-100 risk gauge
    Nav.tsx
  lib/
    gemini.ts             # hedged model racing + structured calls
    heuristics.ts         # offline pattern engine + fallback scorer
    prompts.ts            # system prompts + JSON schemas
    tactics.ts            # tactic taxonomy (colors, descriptions)
    types.ts              # shared types
```

## Team

Built for ForgeHacks 2026 — AI + Cybersecurity track.

## Sources

- Global Anti-Scam Alliance & Feedzai, *Global State of Scams 2024* — over US$1 trillion lost to scams globally in 12 months. https://gasa.org/knowledge-base/blog/global-state-of-scams-report-2024-1-trillion-stolen-in-12-months-gasa-feedzai
- SlashNext, *State of Phishing 2023* — 1,265% increase in malicious phishing emails since Q4 2022. https://www.cnbc.com/2023/11/28/ai-like-chatgpt-is-creating-huge-increase-in-malicious-phishing-email.html
- Global Anti-Scam Alliance & Feedzai, *Global State of Scams 2025* — 57% of surveyed adults encountered a scam last year; 23% lost money. https://gasa.org/knowledge-base/blog/global-scams-on-the-rise-over-half-of-adults-worldwide-report-scam-encounters
- US FTC, Consumer Sentinel Network Data Book 2024 — $12.5 billion reported lost to fraud in the US in 2024 (+25% YoY). https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024

---

*BaitBreaker is an awareness tool, not legal or financial advice. When in doubt, verify through official channels — never through numbers or links in a message.*
