import Link from "next/link";
import Nav from "@/components/Nav";

const FEATURES = [
  {
    title: "Instant Tactic Breakdown",
    body: "Paste a text, email, DM, or call transcript. Every manipulation tactic — urgency, fake authority, OTP theft, payment pressure — gets highlighted inline with a plain-English explanation.",
  },
  {
    title: "Screenshot Analysis",
    body: "Got a suspicious text on your phone? Drop in a screenshot. BaitBreaker reads the image, transcribes the conversation, and analyzes the thread like a fraud analyst.",
  },
  {
    title: "Risk Score & Report",
    body: "A calibrated 0–100 risk score, plus a ready-to-paste incident report for your bank or platform, and a safe reply that leaks nothing.",
  },
  {
    title: "Scam Gym",
    body: "Training beats tools. The Gym generates adaptive scam scenarios — SMS, calls, job offers — and scores your ability to spot the tells. Inoculation, not just detection.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="py-20 text-center sm:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-ring" />
            ForgeHacks 2026 · AI + Cybersecurity
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            See the hook.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-rose-400 bg-clip-text text-transparent">
              Break the bait.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Scams cost people over a trillion dollars a year — and AI has made
            them fluent, personalized, and multilingual. BaitBreaker fights back
            with the same technology: real-time manipulation analysis, and an
            adaptive trainer that makes you the hard target.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/analyze"
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition-transform hover:scale-[1.02] sm:w-auto"
            >
              Analyze a message
            </Link>
            <Link
              href="/gym"
              className="w-full rounded-xl border border-[var(--border)] bg-white/5 px-6 py-3 text-center font-semibold transition-colors hover:bg-white/10 sm:w-auto"
            >
              Train in the Scam Gym
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="panel p-6">
              <h2 className="text-base font-semibold text-cyan-300">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {feature.body}
              </p>
            </div>
          ))}
        </section>

        <section className="pb-24">
          <div className="panel-strong mx-auto max-w-3xl p-6 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Why detection alone fails
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The best spam filter in the world still can&apos;t protect you
              when a scam arrives through a channel it doesn&apos;t see, written
              in your own language, referencing your own life. BaitBreaker is
              built on two layers: an analyst-grade detector for the message in
              front of you, and an inoculation trainer that recalibrates your
              instincts for the next thousand messages. Scroll-stopping
              detection, permanent immunity.
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-slate-500">
        BaitBreaker · Built for ForgeHacks 2026 · AI + Cybersecurity track
      </footer>
    </>
  );
}
