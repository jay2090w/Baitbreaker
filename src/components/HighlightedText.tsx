"use client";

import { useMemo, useState } from "react";
import { tacticMeta } from "@/lib/tactics";
import type { TacticHit } from "@/lib/types";

interface Segment {
  text: string;
  hit?: TacticHit;
}

/** Find every tactic quote inside the original text, resolving overlaps. */
function buildSegments(text: string, hits: TacticHit[]): Segment[] {
  const lower = text.toLowerCase();

  const found: Array<{ start: number; end: number; hit: TacticHit }> = [];
  for (const hit of hits) {
    const quote = hit.quote.trim();
    if (!quote) continue;
    // Try exact match first, then case-insensitive.
    let index = text.indexOf(quote);
    if (index === -1) index = lower.indexOf(quote.toLowerCase());
    if (index === -1) {
      // Model paraphrased; try the first 24 chars as an anchor.
      const anchor = quote.slice(0, 24).toLowerCase();
      if (anchor.length >= 8) index = lower.indexOf(anchor);
      if (index === -1) continue;
      found.push({ start: index, end: index + Math.min(quote.length, text.length - index), hit });
      continue;
    }
    found.push({ start: index, end: index + quote.length, hit });
  }

  // Longest-first, drop overlaps.
  found.sort((a, b) => b.end - b.start - (a.end - a.start));
  const chosen: typeof found = [];
  for (const candidate of found) {
    const overlaps = chosen.some(
      (c) => candidate.start < c.end && c.start < candidate.end,
    );
    if (!overlaps) chosen.push(candidate);
  }
  chosen.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end, hit } of chosen) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), hit });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

export default function HighlightedText({
  text,
  hits,
}: {
  text: string;
  hits: TacticHit[];
}) {
  const segments = useMemo(() => buildSegments(text, hits), [text, hits]);
  const [activeHit, setActiveHit] = useState<TacticHit | null>(null);

  return (
    <div className="space-y-3">
      <div className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-black/25 p-4 font-mono text-[13px] leading-7 text-slate-200">
        {segments.map((segment, i) =>
          segment.hit ? (
            <mark
              key={i}
              className="tactic"
              style={
                {
                  "--tactic-color": tacticMeta(segment.hit.tactic).color,
                  "--tactic-soft": tacticMeta(segment.hit.tactic).soft,
                } as React.CSSProperties
              }
              onMouseEnter={() => setActiveHit(segment.hit!)}
              onMouseLeave={() => setActiveHit(null)}
              onClick={() =>
                setActiveHit(activeHit === segment.hit ? null : segment.hit!)
              }
            >
              {segment.text}
            </mark>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
      </div>

      {activeHit ? (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            borderColor: tacticMeta(activeHit.tactic).color,
            background: tacticMeta(activeHit.tactic).soft,
          }}
        >
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: tacticMeta(activeHit.tactic).color }}
          >
            {tacticMeta(activeHit.tactic).label} · {activeHit.severity} severity
          </span>
          <p className="mt-1 text-slate-200">{activeHit.explanation}</p>
        </div>
      ) : (
        hits.length > 0 && (
          <p className="text-xs text-slate-500">
            Hover or tap a highlighted span to see why it&apos;s dangerous.
          </p>
        )
      )}
    </div>
  );
}
