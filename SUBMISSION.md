# BaitBreaker — Devpost Submission Kit

Everything you need to submit and demo. Read this file top to bottom on submission day.

**Live URL:** https://baitbreaker.vercel.app
**Repo:** https://github.com/jay2090w/Baitbreaker

---

## 1. Elevator pitch (use this everywhere)

> **BaitBreaker — See the hook. Break the bait.**
> An AI scam detector that doesn't just flag messages — it trains you to spot manipulation yourself. Paste any text or screenshot and watch every tactic get highlighted inline: urgency, fake authority, OTP theft, payment pressure. Then enter the Scam Gym, where an AI writes adaptive scam scenarios at five difficulty levels and scores whether you caught the tells — or over-flagged the harmless ones.

---

## 2. Devpost description (paste this into the submission form)

### Inspiration

Scams cost people over a trillion dollars a year [1], and generative AI has made them fluent, personalized, and multilingual [2]. Most anti-scam tools are black boxes: they say "spam" and give you no reason. And even perfect detection fails when a scam arrives through a channel the filter can't see, written in your own language, referencing your own life. We built BaitBreaker because protection needs two layers: an analyst-grade detector for the message in front of you, and inoculation training so you're harder to fool forever.

### What it does

**Message Analyzer** — paste any SMS, email, DM, marketplace post, job offer, or call transcript (or upload a screenshot). BaitBreaker:

- Highlights every manipulation tactic **inline** in the original text, with a plain-English explanation of why it's dangerous
- Gives a calibrated 0–100 risk score and a verdict (scam / suspicious / likely safe)
- Shows **what the sender actually wants** (money via gift card, your OTP, a click…)
- Writes a safe response that leaks nothing — or tells you not to reply at all
- Generates a ready-to-paste incident report for your bank or platform

**Scam Gym** — training beats tooling. The Gym generates fresh scam scenarios across six channels (SMS, email, phone call, social DM, marketplace, job offer) at five difficulty levels, from obvious to expert-subtle. You tap the sentences you believe are manipulation tells, submit, and get scored on recall, precision, and over-flagging — because ~40% of rounds are genuinely safe messages, teaching you not to live in fear. Every round ends with a debrief explaining what you caught, what you missed, and why.

### How we built it

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS 4**
- **Google Gemini via the Interactions API** with **structured JSON output** — the model returns schema-validated analysis objects (verdict, verbatim tactic quotes, asks, safe reply, incident report), not prose we have to parse
- **Multimodal input**: screenshots are transcribed and analyzed as conversations
- **Hybrid pipeline**: an instant 12-tactic heuristic regex scanner runs first (zero cost, zero latency), then Gemini refines the analysis; if the API is unreachable, the heuristic result stands — the tool never goes dark
- **Hedged multi-model racing**: requests race across Gemini models with staggered starts and hard timeouts, so a rate-limited or overloaded model can't stall a user; we cut worst-case latency from 39s to ~5s this way
- **Deterministic scoring** in the Gym (no LLM in the loop) so feedback is instant, explainable, and offline-safe

### Challenges we ran into

- **Free-tier rate limits are per-model and per-day** — we discovered `gemini-3.6-flash` allows only 20 requests/day, which killed our first design. We rebuilt with hedged racing across models and a fail-fast path that instantly tries the next model when one is throttled.
- **Structured output discipline**: getting verbatim quotes for highlighting requires strict schema design. We verify each quote against the source text before rendering so the UI can't highlight text that doesn't exist.
- **Over-flagging is a failure mode too**: early prompts flagged every subscription email as phishing. We rewrote the system prompt with calibration rules ("legitimate-but-annoying marketing is NOT a scam") and validated against a 10-message corpus covering both scams and safe messages — 10/10 correct, with safe messages scoring 0–5/100.

### Accomplishments we're proud of

- The inline tactic highlighting — seeing the hook inside your own message is visceral in a way a "spam" label never is
- A detector that simultaneously catches a Spanish bank-phishing SMS and scores a genuine appointment reminder at 5/100 risk
- The Gym's honesty model: it scores over-flagging, not just misses
- Resilience engineering: hedged model racing, hard timeouts, heuristic fallback — the demo cannot die

### What we learned

- Manipulation has a finite grammar: 12 tactics cover the vast majority of real scams, and once you name them, people spot them immediately
- Calibration is harder than detection: the hard part of a fraud analyst's job isn't finding red flags, it's not drowning real messages in them
- Rate limits and graceful degradation are first-class product design on an AI product, not an afterthought

### What's next for BaitBreaker

- Browser extension that runs the analyzer on any selected text
- WhatsApp/Messages share-sheet integration
- Team leaderboards in the Scam Gym for schools and companies
- Fine-tuned lightweight model for on-device, zero-latency screening with Gemini for deep analysis

### Built with

`next.js` `typescript` `tailwindcss` `google-gemini` `interactions-api` `structured-outputs` `multimodal` `react`

### Sources & attributions

1. Global Anti-Scam Alliance & Feedzai, *Global State of Scams 2024* — scammers stole over **US$1 trillion** globally in 12 months (published 2024, covering 2023). https://gasa.org/knowledge-base/blog/global-state-of-scams-report-2024-1-trillion-stolen-in-12-months-gasa-feedzai
2. SlashNext, *State of Phishing 2023* — a **1,265% increase in malicious phishing emails** since Q4 2022 (ChatGPT-era), including a 967% rise in credential phishing. https://www.cnbc.com/2023/11/28/ai-like-chatgpt-is-creating-huge-increase-in-malicious-phishing-email.html
3. Global Anti-Scam Alliance & Feedzai, *Global State of Scams 2025* — **57% of surveyed adults encountered a scam** in the past year and 23% lost money; an estimated $442B was lost across the 42 countries surveyed. https://gasa.org/knowledge-base/blog/global-scams-on-the-rise-over-half-of-adults-worldwide-report-scam-encounters
4. US Federal Trade Commission, Consumer Sentinel Network Data Book 2024 — consumers reported losing **$12.5 billion to fraud in 2024**, up 25% year over year. https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024

*Build transparency:* AI coding tools were used to help build this project (the ForgeHacks rules permit this). The product's own AI — Google Gemini — is the in-app scam-analysis engine and is what powers the Analyzer and Scam Gym.

---

## 3. Demo video script (~2:30, record with OBS or Loom)

**Setup before recording:**
- `npm run dev` running, browser on http://localhost:3000, dark theme
- Have the "Bank phishing SMS" sample ready (Analyzer)
- Have a screenshot file of a scam text ready to upload — use `demo-assets/01-bank-phishing-sms.png`
- Gym: pre-generate one scenario so there's no wait on camera

**Demo assets** in `demo-assets/` (all fictional sample data, safe to show on camera):

| File | Use it for |
|---|---|
| `01-bank-phishing-sms.png` | **Primary screenshot demo** — upload this one |
| `02-parcel-redelivery-fee.png` | Alternate: delivery-fee scam |
| `03-grandchild-emergency-whatsapp.png` | Alternate: WhatsApp/grandparent scam |
| `04-job-advance-fee.png` | Alternate: job / advance-fee scam |
| `05-safe-clinic-reminder.png` | **Calibration proof** — a genuine message that scores low |

| Time | On screen | Say |
|---|---|---|
| 0:00 | Landing page | "Every year, scams cost over a trillion dollars — and AI just made scammers fluent, multilingual, and personal. This is BaitBreaker: see the hook, break the bait." |
| 0:15 | Analyzer, paste phishing SMS | "Here's a text millions of people get. Watch what BaitBreaker does." |
| 0:25 | Click analyze, result appears | "In five seconds: a hundred-out-of-hundred risk score, and every manipulation tactic highlighted inside the message itself. *Urgency* — amber. *Threat of losing funds* — red. *The fake .xyz domain* — cyan. *Asking for an OTP* — that's the whole scam in one line." |
| 0:55 | Scroll to asks + report | "It tells you exactly what they want — your OTP — drafts a report you can paste to your bank, and says: do not reply." |
| 1:05 | Upload screenshot of scam text | "Screenshots too. No typing needed — it reads the image, transcribes the thread, and analyzes it." |
| 1:20 | Show verdict on screenshot | "A bank phishing SMS — screenshot straight from the phone, flagged instantly." |
| 1:30 | Switch to Scam Gym | "But detection is only half the problem. Filters can't protect you from the message that gets through. So we built the Scam Gym." |
| 1:40 | Hit start, scenario appears; tap 2-3 sentences, submit | "The AI writes fresh scams just for you — this one's a client who wants your bank details before paying. I'll flag what I think are the tells… and submit." |
| 2:05 | Scored reveal | "It scores recall *and* over-flagging — because some rounds are genuinely safe. Every round ends with a debrief: what you caught, what you missed, why. That's inoculation — training beats tooling." |
| 2:25 | Landing page | "BaitBreaker. Analyst-grade detection, permanent immunity. Built for ForgeHacks 2026." |

**Recording tips:**
- 1080p minimum, browser at ~90% zoom so text is readable
- Pre-run everything once so API results are warm
- If the API is slow on camera, the hedge keeps it under ~6s — that's fine; narrate over it
- Keep it under 3 minutes

---

## 4. Before submitting — checklist

- [x] GitHub repo public with README → https://github.com/jay2090w/Baitbreaker
- [x] Vercel deployment live, `GEMINI_API_KEY` set in project env vars → https://baitbreaker.vercel.app
- [x] Tested the deployed URL: analyzer (text + screenshot) and gym end-to-end
- [x] Devpost form description has [1]–[4] citations + "Sources & attributions" section pasted
- [ ] Demo video uploaded (YouTube unlisted or Loom)
- [ ] Devpost form filled (description above, built-with list, video link, repo link, live URL)
- [x] Deployed site API key protected (all calls server-side)
- [ ] Submit before **Saturday Oct 10, 12:00 PM** (submissions lock — don't be that team)
