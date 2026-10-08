"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { tacticMeta } from "@/lib/tactics";
import type { GymChannel, GymScenario, GymScore } from "@/lib/types";

const CHANNELS: Array<{ id: GymChannel | ""; label: string }> = [
  { id: "", label: "Random channel" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "call_transcript", label: "Phone call" },
  { id: "dm", label: "Social DM" },
  { id: "marketplace", label: "Marketplace" },
  { id: "job_offer", label: "Job offer" },
];

const DIFFICULTY_LABELS = ["", "Obvious", "Easy", "Realistic", "Subtle", "Expert"];

interface Stats {
  rounds: number;
  totalScore: number;
  best: number;
  perfect: number;
}

const EMPTY_STATS: Stats = { rounds: 0, totalScore: 0, best: 0, perfect: 0 };

export default function GymPage() {
  const [difficulty, setDifficulty] = useState(2);
  const [channel, setChannel] = useState<GymChannel | "">("");
  const [scenario, setScenario] = useState<GymScenario | null>(null);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [score, setScore] = useState<GymScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  // Load persisted stats after mount. Reading localStorage during render/init
  // would cause an SSR hydration mismatch, so an effect is correct here.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("baitbreaker-gym-stats");
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
        setStats({ ...EMPTY_STATS, ...JSON.parse(raw) });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistStats = useCallback((next: Stats) => {
    setStats(next);
    try {
      localStorage.setItem("baitbreaker-gym-stats", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  async function newRound() {
    setLoading(true);
    setError(null);
    setScore(null);
    setFlagged(new Set());
    setScenario(null);

    try {
      const res = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          difficulty,
          channel: channel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate scenario.");
      setScenario(data.scenario as GymScenario);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSentence(id: number) {
    if (score) return; // locked after scoring
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!scenario || score) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          scenario,
          flagged: [...flagged],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to score.");
      const nextScore = data.score as GymScore;
      setScore(nextScore);

      const nextStats: Stats = {
        rounds: stats.rounds + 1,
        totalScore: stats.totalScore + nextScore.score,
        best: Math.max(stats.best, nextScore.score),
        perfect:
          stats.perfect +
          (nextScore.tells_missed.length === 0 &&
          nextScore.false_positives.length === 0
            ? 1
            : 0),
      };
      persistStats(nextStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const avg = stats.rounds ? Math.round(stats.totalScore / stats.rounds) : 0;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Scam Gym</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Adaptive scam scenarios, generated live. Flag every manipulation
              tell you can find — but don&apos;t over-flag, some rounds are
              genuinely safe.
            </p>
          </div>
          {stats.rounds > 0 && (
            <div className="flex gap-4 text-center">
              <Stat label="Rounds" value={String(stats.rounds)} />
              <Stat label="Avg score" value={String(avg)} />
              <Stat label="Best" value={String(stats.best)} />
              <Stat label="Flawless" value={String(stats.perfect)} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="panel mb-6 flex flex-wrap items-end gap-4 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Difficulty · {DIFFICULTY_LABELS[difficulty]}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-44 accent-cyan-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as GymChannel | "")}
              className="rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm"
            >
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={newRound}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 transition-transform enabled:hover:scale-[1.01] disabled:opacity-40"
          >
            {loading && !scenario ? "Generating…" : scenario ? "New scenario" : "Start round"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {!scenario && !loading && (
          <div className="panel flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="mb-3 text-4xl">🎣</div>
            <p className="max-w-md text-sm">
              Pick a difficulty and hit start. You&apos;ll get a realistic
              message — tap the sentences that contain manipulation tells, then
              submit for your analysis.
            </p>
          </div>
        )}

        {loading && !scenario && (
          <div className="panel flex min-h-[280px] flex-col items-center justify-center gap-4 p-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            <p className="text-sm text-slate-400">
              Writing a fresh scenario at difficulty {difficulty}…
            </p>
          </div>
        )}

        {scenario && (
          <div className="space-y-4">
            <div className="panel p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono uppercase tracking-wider">
                  {scenario.channel.replace(/_/g, " ")}
                </span>
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono">
                  difficulty {scenario.difficulty}/5
                </span>
                <span className="truncate">
                  From: <span className="text-slate-200">{scenario.sender_label}</span>
                </span>
              </div>

              {scenario.subject && (
                <p className="mb-2 border-b border-[var(--border)] pb-2 text-sm font-medium text-slate-200">
                  Subject: {scenario.subject}
                </p>
              )}

              <p className="mb-3 text-xs text-slate-500">
                Tap any sentence you believe is a manipulation tell.
              </p>

              <div className="space-y-1.5">
                {scenario.sentences.map((sentence) => {
                  const isFlagged = flagged.has(sentence.id);
                  const revealed = Boolean(score);
                  const showAsTell = revealed && sentence.is_tell;
                  const showAsMissed = revealed && sentence.is_tell && !isFlagged;
                  const showAsFalsePositive =
                    revealed && !sentence.is_tell && isFlagged;

                  let style =
                    "border-[var(--border)] bg-black/20 hover:bg-white/5";
                  if (isFlagged && !revealed)
                    style = "border-cyan-400/60 bg-cyan-400/10";
                  if (showAsTell && isFlagged)
                    style = "border-emerald-400/60 bg-emerald-400/10";
                  if (showAsMissed)
                    style = "border-amber-400/60 bg-amber-400/10";
                  if (showAsFalsePositive)
                    style = "border-rose-400/60 bg-rose-400/10";

                  const meta = sentence.tactic
                    ? tacticMeta(sentence.tactic)
                    : null;

                  return (
                    <button
                      key={sentence.id}
                      onClick={() => toggleSentence(sentence.id)}
                      disabled={revealed}
                      className={`block w-full rounded-lg border px-3 py-2 text-left text-sm leading-6 transition-colors ${style}`}
                    >
                      <span>{sentence.text}</span>
                      {revealed && (
                        <span className="mt-1 block text-xs">
                          {sentence.is_tell ? (
                            <>
                              <span
                                className="font-bold uppercase tracking-wider"
                                style={{ color: meta?.color ?? "#94a3b8" }}
                              >
                                {meta ? meta.label : "Tactic"}
                              </span>
                              <span
                                className={
                                  isFlagged ? "text-emerald-300" : "text-amber-300"
                                }
                              >
                                {isFlagged ? " — caught! " : " — missed. "}
                              </span>
                              <span className="text-slate-400">
                                {sentence.explanation}
                              </span>
                            </>
                          ) : isFlagged ? (
                            <span className="text-rose-300">
                              Over-flagged — this line is harmless. Real
                              messages contain odd-but-innocent lines too.
                            </span>
                          ) : (
                            <span className="text-slate-500">Harmless.</span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!score && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={submit}
                    disabled={loading}
                    className="rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 transition-transform enabled:hover:scale-[1.01] disabled:opacity-40"
                  >
                    {loading ? "Scoring…" : `Submit (${flagged.size} flagged)`}
                  </button>
                  <button
                    onClick={() => setFlagged(new Set())}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear flags
                  </button>
                </div>
              )}
            </div>

            {score && (
              <div className="panel space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-center">
                    <div
                      className="text-5xl font-bold tabular-nums"
                      style={{
                        color:
                          score.score >= 70
                            ? "#10b981"
                            : score.score >= 40
                              ? "#f59e0b"
                              : "#f43f5e",
                      }}
                    >
                      {score.score}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-400">
                      score
                    </div>
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold text-slate-100">{score.headline}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {score.debrief}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Stat label="Tells found" value={`${score.tells_found.length}`} good />
                    <Stat label="Missed" value={`${score.tells_missed.length}`} bad={score.tells_missed.length > 0} />
                    <Stat
                      label="Over-flagged"
                      value={`${score.false_positives.length}`}
                      bad={score.false_positives.length > 0}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      scenario.is_scam
                        ? "bg-rose-400/15 text-rose-300"
                        : "bg-emerald-400/15 text-emerald-300"
                    }`}
                  >
                    {scenario.is_scam ? "This was a scam" : "This was genuinely safe"}
                  </span>
                  <button
                    onClick={newRound}
                    className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01]"
                  >
                    Next round →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  good,
  bad,
}: {
  label: string;
  value: string;
  good?: boolean;
  bad?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-lg font-bold tabular-nums ${
          good ? "text-emerald-300" : bad ? "text-rose-300" : "text-slate-200"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
    </div>
  );
}
