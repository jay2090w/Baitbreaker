"use client";

import type { Verdict } from "@/lib/types";

const VERDICT_STYLE: Record<
  Verdict,
  { label: string; color: string; track: string }
> = {
  scam: { label: "SCAM", color: "#f43f5e", track: "rgba(244,63,94,0.15)" },
  suspicious: {
    label: "SUSPICIOUS",
    color: "#f59e0b",
    track: "rgba(245,158,11,0.15)",
  },
  likely_safe: {
    label: "LIKELY SAFE",
    color: "#10b981",
    track: "rgba(16,185,129,0.15)",
  },
};

export default function RiskGauge({
  score,
  verdict,
}: {
  score: number;
  verdict: Verdict;
}) {
  const style = VERDICT_STYLE[verdict];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={style.track}
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={style.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color: style.color }}>
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-slate-400">
            risk
          </span>
        </div>
      </div>
      <span
        className="rounded-full px-3 py-1 text-xs font-bold tracking-widest"
        style={{ background: style.track, color: style.color }}
      >
        {style.label}
      </span>
    </div>
  );
}
