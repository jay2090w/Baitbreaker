// Offline heuristic scanner.
// Runs instantly with zero API calls — the first pass of the hybrid pipeline.
// Also serves as a resilient fallback when the AI API is unavailable.

import { SEVERITY_WEIGHT } from "./tactics";
import type { Analysis, Severity, TacticHit, TacticId } from "./types";

interface Rule {
  tactic: TacticId;
  severity: Severity;
  patterns: RegExp[];
  explanation: string;
}

const CURRENCY = String.raw`(?:\$|₹|€|£|USD|INR|EUR|GBP)\s?\d`;

const RULES: Rule[] = [
  {
    tactic: "urgency",
    severity: "medium",
    patterns: [
      /\b(?:urgent(?:ly)?|immediately|right away|act now|final (?:notice|warning|reminder)|last chance|expir(?:e|es|ing|ed) (?:today|soon|in)|within \d+ (?:hours?|minutes?|days?)|today only|24 ?hours?|asap)\b/gi,
      /\b(?:limited time|before it(?:'s| is) too late|don'?t delay|time is running out)\b/gi,
    ],
    explanation: "Creates time pressure so you act before you think or verify.",
  },
  {
    tactic: "authority_impersonation",
    severity: "high",
    patterns: [
      /\b(?:this is|on behalf of|from) (?:the )?(?:irs|internal revenue|social security|medicare|fbi|police|customs|immigration|tax (?:dept|department|office)|bank(?:'s)? (?:security|fraud) (?:team|department)|fraud (?:prevention|department|team))\b/gi,
      /\b(?:irs|social security administration|federal bureau|drug enforcement)\b/gi,
      /\b(?:amazon|apple|google|microsoft|paypal|netflix|chase|wells fargo|bank of america|hdfc|sbi|icici) (?:security|support|account|team|service)\b/gi,
    ],
    explanation:
      "Borrows the trust of a bank, government body, or big brand that would rarely contact you this way.",
  },
  {
    tactic: "fear_threat",
    severity: "high",
    patterns: [
      /\b(?:account (?:will be|has been|is) (?:suspended|locked|closed|deactivated|frozen)|legal action|lawsuit|arrest(?:ed)?|warrant|fine of|penalt(?:y|ies)|court (?:case|date)|suspend(?:ed)? your (?:account|number|card|license)|unauthorized (?:login|transaction|access) (?:attempt )?(?:detected|found))\b/gi,
      /\b(?:failure to (?:comply|respond|pay)|avoid (?:legal|further) action)\b/gi,
    ],
    explanation: "Uses fear of loss or legal trouble to make you panic and comply.",
  },
  {
    tactic: "greed_reward",
    severity: "medium",
    patterns: [
      /\b(?:congratulations|you(?:'ve| have) won|winner|claim your (?:prize|reward|refund|gift)|free (?:gift|money|cash|iphone)|lottery|lucky (?:winner|day)|selected to receive)\b/gi,
      /\b(?:refund of|compensation of|cashback)\b/gi,
    ],
    explanation: "Dangles a prize, refund, or windfall to override your skepticism.",
  },
  {
    tactic: "secrecy_isolation",
    severity: "high",
    patterns: [
      /\b(?:keep (?:this|it) (?:a )?(?:secret|confidential|between us)|don'?t (?:tell|inform|notify|discuss (?:this )?with) (?:anyone|your (?:family|bank|husband|wife|parents|daughter|son))|this (?:call|message|conversation) (?:is|must remain) (?:confidential|secret))\b/gi,
    ],
    explanation:
      "Wants you to stay quiet — real institutions never tell you to hide things from family or your bank.",
  },
  {
    tactic: "payment_pressure",
    severity: "high",
    patterns: [
      /\b(?:gift ?cards?|itunes cards?|google play cards?|steam cards?|amazon cards?|bitcoin|btc|usdt|crypto(?:currency)?|wire transfer|western union|money ?gram|zelle|venmo|cash app|pay ?pal friends and family|upi|bank transfer|processing fee|clearance fee|customs (?:fee|duty)|small fee|advance payment|deposit of)\b/gi,
    ],
    explanation:
      "Demands payment through methods that are hard or impossible to reverse.",
  },
  {
    tactic: "credential_phishing",
    severity: "high",
    patterns: [
      /\b(?:otp|one[- ]time (?:password|code)|verification code|login (?:code|credentials?)|password|pin (?:number|code)?|cvv|card number|security code|ssn|social security number|aadhaar|pan (?:card|number)|mother'?s maiden name)\b/gi,
      /\b(?:verify (?:your|the) (?:account|identity|details|information)|confirm your (?:details|identity|account|password)|re-?validate your)\b/gi,
    ],
    explanation:
      "Tries to extract codes, passwords, or identity details that unlock your accounts.",
  },
  {
    tactic: "link_mismatch",
    severity: "medium",
    patterns: [
      /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}\b/gi,
      /\bhttps?:\/\/[a-z0-9.-]*(?:bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|rb\.gy|cutt\.ly|shorturl|rebrand\.ly)\b/gi,
      /\bhttps?:\/\/[a-z0-9.-]*(?:paypa[l1][^./]*|arnazon[^./]*|app1e[^./]*|micros0ft[^./]*|g00gle[^./]*|faceb00k[^./]*|netfl1x[^./]*)\.[a-z]{2,}/gi,
      /\bhttps?:\/\/[a-z0-9.-]+\.(?:xyz|top|icu|click|link|live|work|buzz|rest|monster)\b/gi,
    ],
    explanation:
      "Link domain doesn't match the brand it claims — a classic phishing signature.",
  },
  {
    tactic: "too_good_to_be_true",
    severity: "medium",
    patterns: [
      /\b(?:earn|make) (?:up to )?(?:\$|₹|€|£|usd |inr )?\d[\d,.]*(?:k|\+)? (?:per|a |each )?(?:day|week|month|hour)|guaranteed (?:returns?|income|profit)|no (?:experience|risk| investment) (?:required|needed)|\d+% (?:returns?|profit|interest)|\beasy money\b|\bwork from home (?:and earn|jobs?)\b/gi,
      /\b(?:part[- ]time|simple) (?:job|task|work)\b.{0,60}\b(?:pay|earn|salary|income)\b/gi,
    ],
    explanation: "The economics don't make sense — a lure for victims.",
  },
  {
    tactic: "pretexting_context",
    severity: "low",
    patterns: [
      /\b(?:parcel|package|shipment) (?:is|has been|could not be|was) (?:held|delayed|undeliverable|waiting|returned)|customs|delivery (?:attempt|failed)|re-?delivery fee|unpaid (?:toll|ticket|invoice|balance)|subscription (?:renewal|will auto)|invoice (?:attached|is ready|overdue)|netflix|your (?:recent )?order\b/gi,
      /\b(?:we (?:attempted|tried) to (?:deliver|contact)|incomplete (?:address|delivery))\b/gi,
    ],
    explanation:
      "A plausible everyday story (delivery, invoice, subscription) wrapped around the ask.",
  },
  {
    tactic: "remote_access",
    severity: "high",
    patterns: [
      /\b(?:anydesk|teamviewer|quick ?support|logmein|remote (?:access|desktop|support)|screen ?shar(?:e|ing)|download (?:this|the) (?:app|software|tool))\b/gi,
    ],
    explanation:
      "Wants remote access to your device — once installed, they can see everything and drain accounts.",
  },
  {
    tactic: "emotional_manipulation",
    severity: "high",
    patterns: [
      /\b(?:grandma|grandpa|mom|dad|honey|sweetheart|darling)\b.{0,80}\b(?:emergency|help|accident|hospital|arrested|stuck|stranded|money|transfer)\b/gi,
      /\b(?:don'?t want (?:to worry|you to worry)|i'?m (?:in|having) (?:trouble|an emergency)|please help me)\b/gi,
      /\b(?:new (?:number|phone)|broke my phone|lost my phone)\b/gi,
    ],
    explanation:
      "Exploits love, worry, or a fake emergency so you act without verifying through another channel.",
  },
];

export interface HeuristicResult {
  hits: TacticHit[];
  score: number;
}

export function heuristicScan(text: string): HeuristicResult {
  const hits: TacticHit[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const quote = match[0].trim();
        if (!quote) continue;
        const key = `${rule.tactic}:${quote.toLowerCase()}`;
        if (seen.has(key)) continue;
        // Avoid duplicate tactic with identical quote, but allow multiple
        // quotes of the same tactic (e.g. two different threats).
        seen.add(key);
        hits.push({
          tactic: rule.tactic,
          quote,
          explanation: rule.explanation,
          severity: rule.severity,
        });
        break; // One representative match per pattern is plenty.
      }
    }
  }

  // Score: capped sum of distinct tactic severities with diminishing returns.
  const byTactic = new Map<TacticId, number>();
  for (const hit of hits) {
    byTactic.set(
      hit.tactic,
      (byTactic.get(hit.tactic) ?? 0) + SEVERITY_WEIGHT[hit.severity],
    );
  }
  let score = 0;
  for (const value of [...byTactic.values()].sort((a, b) => b - a)) {
    score += Math.min(value, 40) * (score === 0 ? 1 : 0.6);
  }
  score = Math.min(100, Math.round(score));

  return { hits: hits.slice(0, 10), score };
}

export function heuristicAnalysis(text: string): Analysis {
  const { hits, score } = heuristicScan(text);
  const hasHigh = hits.some((h) => h.severity === "high");
  const verdict =
    score >= 60 && hasHigh
      ? "scam"
      : score >= 30
        ? "suspicious"
        : "likely_safe";

  return {
    verdict,
    risk_score: verdict === "likely_safe" ? Math.min(score, 25) : score,
    summary:
      verdict === "scam"
        ? `Pattern scan found ${hits.length} manipulation signal(s) including high-severity ones. Treat this as hostile and do not engage.`
        : verdict === "suspicious"
          ? `Pattern scan found ${hits.length} early-warning signal(s). Verify through an official channel before acting.`
          : "Pattern scan found no strong manipulation signals. Still verify unexpected requests independently.",
    tactics: hits,
    asks: guessAsks(text),
    safe_reply:
      verdict === "likely_safe"
        ? ""
        : "Thanks for reaching out. I'll verify this directly through the official app or website myself. Please don't contact me again about this.",
    report_summary: buildReportSummary(text, verdict, hits, score),
  };
}

function guessAsks(text: string): Analysis["asks"] {
  const asks: Analysis["asks"] = [];
  const lower = text.toLowerCase();
  if (/gift ?card|crypto|bitcoin|wire|zelle|venmo|cash app|upi|bank transfer|payment|fee|transfer/.test(lower)) {
    asks.push({ what: "Send money via an unusual payment method", kind: "money" });
  }
  if (/otp|password|pin|code|login|cvv|card number|ssn|aadhaar/.test(lower)) {
    asks.push({ what: "Hand over credentials or identity details", kind: "credentials" });
  }
  if (/click|link|download|install|open the attachment|verify/.test(lower)) {
    asks.push({ what: "Click a link, install something, or open an attachment", kind: "action" });
  }
  if (asks.length === 0 && /\?/.test(text)) {
    asks.push({ what: "Get a reply from you", kind: "other" });
  }
  return asks;
}

function buildReportSummary(
  text: string,
  verdict: Analysis["verdict"],
  hits: TacticHit[],
  score: number,
): string {
  if (verdict === "likely_safe") {
    return `No strong scam indicators found (pattern score ${score}/100). If you're still unsure, verify with the institution using a number from its official website.`;
  }
  const tactics = [...new Set(hits.map((h) => h.tactic))].join(", ") || "none detected by pattern scan";
  const preview = text.replace(/\s+/g, " ").slice(0, 220);
  return `I received the following message and believe it is a ${verdict === "scam" ? "scam" : "suspicious message"} (risk ${score}/100). Detected tactics: ${tactics}. Message excerpt: "${preview}${text.length > 220 ? "…" : ""}"`;
}
