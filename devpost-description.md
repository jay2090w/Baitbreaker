> **Live demo:** https://baitbreaker.vercel.app
> **Source code:** https://github.com/jay2090w/Baitbreaker

# 🪝 BaitBreaker

**See the hook. Break the bait.**

An AI scam detector that doesn't just flag messages — it trains you to spot manipulation yourself.

## Inspiration

Scams cost people over a trillion dollars a year [1], and generative AI has made them fluent, personalized, and multilingual [2]. Most anti-scam tools are black boxes: they say "spam" and give you no reason. And even perfect detection fails when a scam arrives through a channel the filter can't see, written in your own language, referencing your own life. We built BaitBreaker because protection needs two layers: an analyst-grade detector for the message in front of you, and inoculation training so you're harder to fool forever.

## What it does

### Message Analyzer

Paste any SMS, email, DM, marketplace post, job offer, or call transcript — or upload a screenshot. BaitBreaker:

- Highlights every manipulation tactic **inline** in the original text, with a plain-English explanation of why it's dangerous
- Gives a calibrated 0–100 risk score and a verdict (scam / suspicious / likely safe)
- Shows **what the sender actually wants** (money via gift card, your OTP, a click…)
- Writes a safe response that leaks nothing — or tells you not to reply at all
- Generates a ready-to-paste incident report for your bank or platform

### Scam Gym

Training beats tooling. The Gym generates fresh scam scenarios across six channels (SMS, email, phone call, social DM, marketplace, job offer) at five difficulty levels, from obvious to expert-subtle. You tap the sentences you believe are manipulation tells, submit, and get scored on recall, precision, and over-flagging — because ~40% of rounds are genuinely safe messages, teaching you not to live in fear. Every round ends with a debrief explaining what you caught, what you missed, and why.

## How we built it

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS 4**
- **Google Gemini via the Interactions API** with **structured JSON output** — the model returns schema-validated analysis objects (verdict, verbatim tactic quotes, asks, safe reply, incident report), not prose we have to parse
- **Multimodal input**: screenshots are transcribed and analyzed as conversations
- **Hybrid pipeline**: an instant 12-tactic heuristic regex scanner runs first (zero cost, zero latency), then Gemini refines the analysis; if the API is unreachable, the heuristic result stands — the tool never goes dark
- **Hedged multi-model racing**: requests race across Gemini models with staggered starts and hard timeouts, so a rate-limited or overloaded model can't stall a user; we cut worst-case latency from 39s to ~5s this way
- **Deterministic scoring** in the Gym (no LLM in the loop) so feedback is instant, explainable, and offline-safe

## Challenges we ran into

- **Free-tier rate limits are per-model and per-day** — we discovered `gemini-3.6-flash` allows only 20 requests/day, which killed our first design. We rebuilt with hedged racing across models and a fail-fast path that instantly tries the next model when one is throttled.
- **Structured output discipline**: getting verbatim quotes for highlighting requires strict schema design. We verify each quote against the source text before rendering so the UI can't highlight text that doesn't exist.
- **Over-flagging is a failure mode too**: early prompts flagged every subscription email as phishing. We rewrote the system prompt with calibration rules ("legitimate-but-annoying marketing is NOT a scam") and validated against a 10-message corpus covering both scams and safe messages — 10/10 correct, with safe messages scoring 0–5/100.

## Accomplishments we're proud of

- The inline tactic highlighting — seeing the hook inside your own message is visceral in a way a "spam" label never is
- A detector that simultaneously catches a Spanish bank-phishing SMS and scores a genuine appointment reminder at 5/100 risk
- The Gym's honesty model: it scores over-flagging, not just misses
- Resilience engineering: hedged model racing, hard timeouts, heuristic fallback — the demo cannot die

## What we learned

- Manipulation has a finite grammar: 12 tactics cover the vast majority of real scams, and once you name them, people spot them immediately
- Calibration is harder than detection: the hard part of a fraud analyst's job isn't finding red flags, it's not drowning real messages in them
- Rate limits and graceful degradation are first-class product design on an AI product, not an afterthought

## What's next for BaitBreaker

- Browser extension that runs the analyzer on any selected text
- WhatsApp/Messages share-sheet integration
- Team leaderboards in the Scam Gym for schools and companies
- Fine-tuned lightweight model for on-device, zero-latency screening with Gemini for deep analysis

## Built with

`next.js` `typescript` `tailwindcss` `google-gemini` `interactions-api` `structured-outputs` `multimodal` `react`

## Sources & attributions

1. Global Anti-Scam Alliance & Feedzai, *Global State of Scams 2024* — scammers stole over **US$1 trillion** globally in 12 months (published 2024, covering 2023). https://gasa.org/knowledge-base/blog/global-state-of-scams-report-2024-1-trillion-stolen-in-12-months-gasa-feedzai
2. SlashNext, *State of Phishing 2023* — a **1,265% increase in malicious phishing emails** since Q4 2022 (ChatGPT-era), including a 967% rise in credential phishing. https://www.cnbc.com/2023/11/28/ai-like-chatgpt-is-creating-huge-increase-in-malicious-phishing-email.html
3. Global Anti-Scam Alliance & Feedzai, *Global State of Scams 2025* — **57% of surveyed adults encountered a scam** in the past year and 23% lost money; an estimated $442B was lost across the 42 countries surveyed. https://gasa.org/knowledge-base/blog/global-scams-on-the-rise-over-half-of-adults-worldwide-report-scam-encounters
4. US Federal Trade Commission, Consumer Sentinel Network Data Book 2024 — consumers reported losing **$12.5 billion to fraud in 2024**, up 25% year over year. https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024

*Build transparency:* AI coding tools were used to help build this project (the ForgeHacks rules permit this). The product's own AI — Google Gemini — is the in-app scam-analysis engine that powers the Analyzer and Scam Gym.

Built for ForgeHacks 2026 — AI + Cybersecurity track.

#scamdetection #phishing #cybersecurity #gemini #nextjs #aieducation #fraudprevention #humanfactors
