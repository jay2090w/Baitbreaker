// Shared domain types for BaitBreaker

export type Verdict = "scam" | "suspicious" | "likely_safe";

export type TacticId =
  | "urgency"
  | "authority_impersonation"
  | "fear_threat"
  | "greed_reward"
  | "secrecy_isolation"
  | "payment_pressure"
  | "credential_phishing"
  | "link_mismatch"
  | "too_good_to_be_true"
  | "pretexting_context"
  | "remote_access"
  | "emotional_manipulation";

export type Severity = "low" | "medium" | "high";

export interface TacticHit {
  tactic: TacticId;
  quote: string;
  explanation: string;
  severity: Severity;
}

export interface Ask {
  what: string;
  kind: "money" | "credentials" | "personal_info" | "action" | "other";
}

export interface Analysis {
  verdict: Verdict;
  risk_score: number; // 0-100
  summary: string;
  tactics: TacticHit[];
  asks: Ask[];
  safe_reply: string;
  report_summary: string;
  extracted_text?: string; // present when input was an image
}

export type GymChannel =
  | "sms"
  | "email"
  | "call_transcript"
  | "dm"
  | "marketplace"
  | "job_offer";

export interface GymSentence {
  id: number;
  text: string;
  is_tell: boolean;
  tactic?: TacticId;
  explanation?: string;
}

export interface GymScenario {
  channel: GymChannel;
  difficulty: number; // 1-5
  sender_label: string;
  subject?: string;
  sentences: GymSentence[];
  is_scam: boolean;
  reveal: string;
}

export interface GymScore {
  score: number; // 0-100
  flagged: number[];
  tells_found: number[];
  tells_missed: number[];
  false_positives: number[];
  headline: string;
  debrief: string;
}
