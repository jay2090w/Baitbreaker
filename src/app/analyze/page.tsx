"use client";

import { useCallback, useRef, useState } from "react";
import HighlightedText from "@/components/HighlightedText";
import Nav from "@/components/Nav";
import RiskGauge from "@/components/RiskGauge";
import { tacticMeta } from "@/lib/tactics";
import type { Analysis } from "@/lib/types";

interface AnalyzeResponse {
  analysis: Analysis;
  engine: "ai+heuristics" | "heuristics";
  error?: string;
}

const SAMPLES: Array<{ label: string; text: string }> = [
  {
    label: "Bank phishing SMS",
    text: "URGENT: Your Chase account has been temporarily locked due to a suspicious transaction of $1,249.00. Verify your identity within 24 hours at http://chase-secure-verify.xyz or your funds will be held. Reply with the OTP we sent to complete verification. — Chase Fraud Team, Ref #TX-88431",
  },
  {
    label: "Delivery scam",
    text: "Your USPS package could not be delivered because the address is incomplete. A $1.99 redelivery fee is required. Reschedule your delivery here: http://usps-redelivery.example/pay — this link expires in 12 hours and the parcel will be returned to sender.",
  },
  {
    label: "Grandparent emergency",
    text: "Hi grandma, it's me. I'm in trouble and I don't want to worry mom and dad. I got into an accident and I'm at the hospital, my phone broke so this is a new number. The hospital needs a deposit right now or they won't treat me. Can you send $950 by gift card? I'll explain everything later, please don't call, just help me.",
  },
  {
    label: "Legit renewal notice",
    text: "Hi Alex, your Spotify Premium subscription renews on Nov 3 for $10.99/month. You can manage or cancel anytime in Settings > Account. No action is needed if you want to keep Premium. — The Spotify Team",
  },
];

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickImage = useCallback((file: File | null) => {
    setImageFile(file);
    setImagePreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res: Response;
      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        if (text.trim()) form.append("text", text.trim());
        res = await fetch("/api/analyze", { method: "POST", body: form });
      } else {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
      } else {
        setResult(data as AnalyzeResponse);
      }
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setText("");
    onPickImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canAnalyze = (text.trim().length > 0 || imageFile) && !loading;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Message Analyzer
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Paste any suspicious message or upload a screenshot. Every
            manipulation tactic gets flagged inline.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Input column */}
          <div className="space-y-4">
            <div className="panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Message text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder={"Paste the SMS, email, DM, or call transcript here…"}
                className="w-full resize-y rounded-lg border border-[var(--border)] bg-black/30 p-3 text-sm leading-6 placeholder:text-slate-600"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Try a sample:</span>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.label}
                    onClick={() => {
                      setText(sample.text);
                      onPickImage(null);
                    }}
                    className="rounded-full border border-[var(--border)] bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                …or a screenshot
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
              />
              {imagePreview ? (
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Screenshot preview"
                    className="max-h-40 rounded-lg border border-[var(--border)]"
                  />
                  <button
                    onClick={() => {
                      onPickImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-slate-400 transition-colors hover:border-cyan-400/50 hover:text-slate-200"
                >
                  Click to upload an image (PNG / JPEG / WebP, ≤ 8MB)
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={runAnalysis}
                disabled={!canAnalyze}
                className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition-transform enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Analyzing…" : "Analyze for scams"}
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm text-slate-300 transition-colors hover:bg-white/10"
              >
                Clear
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}
          </div>

          {/* Result column */}
          <div className="space-y-4">
            {!result && !loading && (
              <div className="panel flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center text-slate-500">
                <div className="mb-3 text-4xl">🪝</div>
                <p className="text-sm">
                  Results appear here: risk score, highlighted tactics, what the
                  sender wants, a safe reply, and a report you can send.
                </p>
              </div>
            )}

            {loading && (
              <div className="panel flex min-h-[300px] flex-col items-center justify-center gap-4 p-8">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                <p className="text-sm text-slate-400">
                  Reading the message like a fraud analyst…
                </p>
              </div>
            )}

            {result && (
              <ResultView data={result} originalText={text} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function ResultView({
  data,
  originalText,
}: {
  data: AnalyzeResponse;
  originalText: string;
}) {
  const { analysis } = data;
  const displayText = analysis.extracted_text || originalText;

  return (
    <div className="space-y-4">
      {data.error && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          {data.error}
        </div>
      )}

      <div className="panel flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
        <RiskGauge score={analysis.risk_score} verdict={analysis.verdict} />
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              engine: {data.engine}
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-200">{analysis.summary}</p>
          {analysis.asks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.asks.map((ask, i) => (
                <span
                  key={i}
                  className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-300"
                >
                  Wants: {ask.what}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {displayText && analysis.tactics.length > 0 && (
        <div className="panel p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tactic highlights ({analysis.tactics.length})
          </h2>
          <HighlightedText text={displayText} hits={analysis.tactics} />
        </div>
      )}

      {analysis.tactics.length > 0 && (
        <div className="panel p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tactic breakdown
          </h2>
          <ul className="space-y-2">
            {analysis.tactics.map((hit, i) => {
              const meta = tacticMeta(hit.tactic);
              return (
                <li
                  key={i}
                  className="rounded-lg border p-3"
                  style={{ borderColor: meta.color, background: meta.soft }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      {hit.severity}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-300">
                    “{hit.quote}”
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {hit.explanation}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {analysis.safe_reply && (
        <CopyBlock
          title="What to do instead"
          content={analysis.safe_reply}
        />
      )}

      {analysis.report_summary && (
        <CopyBlock
          title="Report summary (paste to your bank / platform)"
          content={analysis.report_summary}
        />
      )}

      <p className="text-center text-[11px] leading-5 text-slate-600">
        BaitBreaker is an awareness tool, not legal or financial advice. When in
        doubt, verify through the official app or website — never through
        numbers or links in the message.
      </p>
    </div>
  );
}

function CopyBlock({ title, content }: { title: string; content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h2>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {content}
      </p>
    </div>
  );
}
