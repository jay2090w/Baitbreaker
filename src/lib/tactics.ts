import type { Severity, TacticId } from "./types";

export interface TacticMeta {
  id: TacticId;
  label: string;
  short: string;
  description: string;
  /** Tailwind-ish hex colors for highlights and cards */
  color: string;
  soft: string;
}

export const TACTICS: Record<TacticId, TacticMeta> = {
  urgency: {
    id: "urgency",
    label: "Manufactured Urgency",
    short: "Urgency",
    description:
      "Pressure to act immediately so you skip verification. Countdowns, 'final notice', 'within 24 hours'.",
    color: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.16)",
  },
  authority_impersonation: {
    id: "authority_impersonation",
    label: "Authority Impersonation",
    short: "Fake authority",
    description:
      "Pretending to be a bank, government agency, police, a boss, or a known brand to borrow trust.",
    color: "#e11d48",
    soft: "rgba(225, 29, 72, 0.16)",
  },
  fear_threat: {
    id: "fear_threat",
    label: "Fear & Threats",
    short: "Threats",
    description:
      "Threats of account closure, fines, arrest, or loss to make you panic and comply.",
    color: "#dc2626",
    soft: "rgba(220, 38, 38, 0.16)",
  },
  greed_reward: {
    id: "greed_reward",
    label: "Greed & Rewards",
    short: "Bait reward",
    description:
      "Prizes, refunds, bonuses, or huge returns dangled to override your skepticism.",
    color: "#84cc16",
    soft: "rgba(132, 204, 22, 0.16)",
  },
  secrecy_isolation: {
    id: "secrecy_isolation",
    label: "Secrecy & Isolation",
    short: "Isolation",
    description:
      "Asking you to keep it secret or avoid telling family, bank staff, or police.",
    color: "#a855f7",
    soft: "rgba(168, 85, 247, 0.16)",
  },
  payment_pressure: {
    id: "payment_pressure",
    label: "Unusual Payment Demand",
    short: "Odd payment",
    description:
      "Gift cards, crypto, wire transfer, Zelle, or payment apps — methods that are hard to reverse.",
    color: "#f97316",
    soft: "rgba(249, 115, 22, 0.16)",
  },
  credential_phishing: {
    id: "credential_phishing",
    label: "Credential Phishing",
    short: "Phishing",
    description:
      "Requests for passwords, OTP codes, PINs, or full card numbers under some pretext.",
    color: "#0ea5e9",
    soft: "rgba(14, 165, 233, 0.16)",
  },
  link_mismatch: {
    id: "link_mismatch",
    label: "Suspicious Link",
    short: "Bad link",
    description:
      "Links whose domain doesn't match the claimed brand, or shortened/odd URLs.",
    color: "#06b6d4",
    soft: "rgba(6, 182, 212, 0.16)",
  },
  too_good_to_be_true: {
    id: "too_good_to_be_true",
    label: "Too Good To Be True",
    short: "Too good",
    description:
      "Offers that don't survive common sense: easy high-pay jobs, guaranteed returns, free money.",
    color: "#eab308",
    soft: "rgba(234, 179, 8, 0.16)",
  },
  pretexting_context: {
    id: "pretexting_context",
    label: "Fake Context / Pretext",
    short: "Pretext",
    description:
      "A believable story wrapped around the ask: a held package, an unpaid invoice, a subscription renewal.",
    color: "#8b5cf6",
    soft: "rgba(139, 92, 246, 0.16)",
  },
  remote_access: {
    id: "remote_access",
    label: "Remote Access Request",
    short: "Remote access",
    description:
      "Asking you to install AnyDesk, TeamViewer, or similar so they can 'help' — and take over.",
    color: "#14b8a6",
    soft: "rgba(20, 184, 166, 0.16)",
  },
  emotional_manipulation: {
    id: "emotional_manipulation",
    label: "Emotional Manipulation",
    short: "Emotional",
    description:
      "Love, family emergency, or sympathy used as leverage: 'grandma, I need help'.",
    color: "#ec4899",
    soft: "rgba(236, 72, 153, 0.16)",
  },
};

export const TACTIC_ORDER: TacticId[] = Object.keys(TACTICS) as TacticId[];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 8,
  medium: 16,
  high: 28,
};

export function tacticMeta(id: string): TacticMeta {
  return TACTICS[id as TacticId] ?? TACTICS.pretexting_context;
}
