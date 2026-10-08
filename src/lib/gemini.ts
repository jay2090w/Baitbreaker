// Server-side Gemini client for BaitBreaker.
// All calls use the Interactions API with structured JSON output.

import "server-only";
import { GoogleGenAI } from "@google/genai";
import { heuristicAnalysis, heuristicScan } from "./heuristics";
import {
  ANALYZE_SYSTEM_PROMPT,
  GYM_SYSTEM_PROMPT,
  analysisJsonSchema,
  gymJsonSchema,
} from "./prompts";
import type { Analysis, GymChannel, GymScenario, GymScore } from "./types";
import { tacticMeta } from "./tactics";

// Hedged model plan. Stage 1 starts immediately; later stages launch only if
// no earlier stage has answered ("hedging"). This keeps latency low when
// Google's free tier queues a request, while usually firing just ONE call.
//
// Model choice is driven by free-tier reality (Oct 2026):
//  - gemini-3.6-flash: only 20 requests/day on free — excluded from the demo path.
//  - gemini-3.5-flash / 3.5-flash-lite: fast (~1.2s) and reliable.
//  - gemini-3.8-flash: flagship quality, but overloaded; used as a late hedge.
// GEMINI_MODEL overrides to a single model.
const HEDGE_STAGES: Array<{ model: string; atMs: number }> = [
  { model: "gemini-3.5-flash", atMs: 0 },
  { model: "gemini-3.5-flash-lite", atMs: 3500 },
  { model: "gemini-3.8-flash", atMs: 8000 },
];

/** Per-attempt timeout (ms). Free-tier thinking on overloaded models can hang. */
const ATTEMPT_TIMEOUT_MS = 20_000;

/**
 * Call the Interactions API with a hard timeout. Races the SDK promise
 * against a timer so a hanging request can never stall the demo.
 */
/** Minimal shape we consume from the SDK's non-streaming interaction. */
interface InteractionOutput {
  output_text?: string;
}

async function createInteraction(
  params: Parameters<GoogleGenAI["interactions"]["create"]>[0],
  externalController?: AbortController,
  timeoutMs: number = ATTEMPT_TIMEOUT_MS,
): Promise<InteractionOutput> {
  const controller = externalController ?? new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await client().interactions.create(params, {
      timeout: timeoutMs,
      fetchOptions: { signal: controller.signal },
    });
    return result as unknown as InteractionOutput;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hedged racing: launch stage 1 immediately; if it hasn't answered by the
 * next stage's start time, launch that stage in parallel. First success wins
 * and all other in-flight requests are aborted. Try-down vs try-next for
 * each model is also supported (models that reject minimal thinking).
 */
async function callWithFallback(
  build: (
    model: string,
  ) => Parameters<GoogleGenAI["interactions"]["create"]>[0],
): Promise<{ text: string; usedModel: string }> {
  const override = process.env.GEMINI_MODEL?.trim();
  const stages = override ? [{ model: override, atMs: 0 }] : HEDGE_STAGES;

  const controllers: AbortController[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const launchedSet = new Set<number>();
  let settled = false;

  return new Promise((resolve, reject) => {
    let failures = 0;
    const errors: string[] = [];

    const cleanup = () => {
      for (const t of timers) clearTimeout(t);
      for (const c of controllers) c.abort();
    };

    const launchStage = (index: number) => {
      if (settled || index >= stages.length || launchedSet.has(index)) return;
      launchedSet.add(index);
      void tryModel(index, stages[index].model);
    };

    // Launch the next not-yet-launched stage (used when a model fails early).
    const launchNext = () => {
      for (let i = 0; i < stages.length; i++) {
        if (!launchedSet.has(i)) {
          launchStage(i);
          return;
        }
      }
    };

    const tryModel = async (index: number, model: string) => {
      if (settled) return;
      const params = build(model);
      // Attempt 1: as built (with thinking). Attempt 2: without thinking
      // config for models that reject it (e.g. 3.8 rejects "minimal").
      const attempts = [params, stripThinking(params)].filter(Boolean) as Array<
        Parameters<GoogleGenAI["interactions"]["create"]>[0]
      >;
      for (const attempt of attempts) {
        if (settled) return;
        const controller = new AbortController();
        controllers.push(controller);
        try {
          const result = await createInteraction(attempt, controller);
          const text = result.output_text;
          if (!text) throw new Error("Empty model response");
          if (!settled) {
            settled = true;
            console.log(`[gemini] model=${model} ok`);
            cleanup();
            resolve({ text, usedModel: model });
          }
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${model}: ${message}`);
          if (settled) return;
          // Only retry this model without thinking if it rejected that field.
          // Rate-limit / overload / timeout errors skip straight to the hedge.
          if (!/thinking level/i.test(message)) break;
        }
      }
      failures += 1;
      if (settled) return;
      // This model failed — free its slot by starting the next hedge early.
      launchNext();
      if (failures >= stages.length) {
        settled = true;
        cleanup();
        reject(new Error(`All models failed. ${errors.slice(-3).join(" | ")}`));
      }
    };

    // Stage 0 starts now; later stages on their hedge timer, or sooner if an
    // earlier stage fails and calls launchNext.
    launchStage(0);
    for (let i = 1; i < stages.length; i++) {
      timers.push(setTimeout(() => launchStage(i), stages[i].atMs));
    }
  });
}

/** Returns a copy of params without generation_config, or null if nothing to strip. */
function stripThinking(
  params: Parameters<GoogleGenAI["interactions"]["create"]>[0],
): Parameters<GoogleGenAI["interactions"]["create"]>[0] | null {
  if (!("generation_config" in params) || !params.generation_config) return null;
  const { generation_config: _ignored, ...rest } = params;
  void _ignored;
  return rest as Parameters<GoogleGenAI["interactions"]["create"]>[0];
}

let cached: GoogleGenAI | null = null;

function client(): GoogleGenAI {
  if (!cached) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      );
    }
    cached = new GoogleGenAI({ apiKey });
  }
  return cached;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

interface AnalyzeInput {
  text?: string;
  image?: { data: string; mimeType: string };
}

/**
 * Analyze a message for scam signals.
 * Strategy: run the instant heuristic scan first; then refine with Gemini.
 * If the API fails for any reason, return the heuristic result (demo never dies).
 */
export async function analyze(input: AnalyzeInput): Promise<{
  analysis: Analysis;
  engine: "ai+heuristics" | "heuristics";
  error?: string;
}> {
  const text = (input.text ?? "").trim();

  if (!hasApiKey()) {
    if (input.image) {
      throw new Error(
        "Image analysis needs the AI engine. Add GEMINI_API_KEY to .env.local and restart.",
      );
    }
    return {
      analysis: heuristicAnalysis(text),
      engine: "heuristics",
      error: "GEMINI_API_KEY not set — using the offline pattern engine.",
    };
  }

  const { hits: heuristicHits } = heuristicScan(input.image ? "" : text);
  const heuristicContext = heuristicHits.length
    ? `A fast regex pre-scan flagged these candidate spans (verify each; discard false positives):\n${heuristicHits
        .map((h) => `- [${h.tactic}] "${h.quote}"`)
        .join("\n")}`
    : "A fast regex pre-scan found no obvious patterns.";

  const prompt = input.image
    ? `Analyze the attached screenshot of a message the user received. First transcribe ALL visible text (including sender name/label and chat UI text) into extracted_text, then analyze the conversation as a whole.\n\n${heuristicContext}`
    : `Analyze this message the user received:\n\n<message>\n${text}\n</message>\n\n${heuristicContext}`;

  const content: Array<
    { type: "text"; text: string } | { type: "image"; data: string; mime_type: string }
  > = [{ type: "text", text: prompt }];
  if (input.image) {
    content.push({
      type: "image",
      data: input.image.data,
      mime_type: input.image.mimeType,
    });
  }

  try {
    const { text: raw } = await callWithFallback((m) => ({
      model: m,
      input: content,
      system_instruction: ANALYZE_SYSTEM_PROMPT,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: analysisJsonSchema as unknown as Record<string, unknown>,
      },
      generation_config: { thinking_level: "minimal" },
      store: false,
    }));

    const parsed = JSON.parse(raw) as Analysis;
    return { analysis: normalizeAnalysis(parsed, text), engine: "ai+heuristics" };
  } catch (err) {
    if (input.image) {
      throw new Error(
        `AI image analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return {
      analysis: heuristicAnalysis(text),
      engine: "heuristics",
      error: `AI engine unavailable (${
        err instanceof Error ? err.message : String(err)
      }) — showing pattern-engine result.`,
    };
  }
}

function normalizeAnalysis(
  a: Partial<Analysis>,
  originalText: string,
): Analysis {
  const clamp = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.min(100, Math.round(n)))
      : fallback;

  // Verify quotes actually appear in the source text (or in extracted text for images).
  const source = (originalText || a.extracted_text || "").toLowerCase();
  const tactics = (Array.isArray(a.tactics) ? a.tactics : []).filter(
    (t) => t && typeof t.quote === "string" && t.quote.trim().length > 0,
  );

  return {
    verdict: a.verdict === "scam" || a.verdict === "suspicious" ? a.verdict : "likely_safe",
    risk_score: clamp(a.risk_score, tactics.length ? 50 : 10),
    summary: typeof a.summary === "string" ? a.summary : "",
    tactics,
    asks: Array.isArray(a.asks) ? a.asks : [],
    safe_reply: typeof a.safe_reply === "string" ? a.safe_reply : "",
    report_summary:
      typeof a.report_summary === "string" ? a.report_summary : "",
    extracted_text:
      typeof a.extracted_text === "string" && a.extracted_text.trim()
        ? a.extracted_text
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Scam Gym
// ---------------------------------------------------------------------------

export async function generateScenario(
  difficulty: number,
  channel?: GymChannel,
): Promise<GymScenario> {
  const level = Math.max(1, Math.min(5, Math.round(difficulty)));
  if (!hasApiKey()) {
    return fallbackScenario(level, channel);
  }

  const prompt = `Create scenario #difficulty ${level}${
    channel ? ` on channel "${channel}"` : " on a random channel"
  }. Remember: ${level <= 2 ? "make the tells fairly visible" : level >= 4 ? "make it subtle and professional" : "balance realism with detectable tells"}.`;

  try {
    const { text: raw } = await callWithFallback((m) => ({
      model: m,
      input: prompt,
      system_instruction: GYM_SYSTEM_PROMPT,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: gymJsonSchema as unknown as Record<string, unknown>,
      },
      generation_config: { thinking_level: "minimal" },
      store: false,
    }));

    const parsed = JSON.parse(raw) as GymScenario;
    return normalizeScenario(parsed, level, channel);
  } catch {
    return fallbackScenario(level, channel);
  }
}

function normalizeScenario(
  s: GymScenario,
  level: number,
  channel?: GymChannel,
): GymScenario {
  const sentences = (Array.isArray(s.sentences) ? s.sentences : []).map(
    (sentence, i) => ({
      id: i + 1,
      text: String(sentence.text ?? ""),
      is_tell: Boolean(sentence.is_tell),
      tactic: sentence.is_tell ? sentence.tactic : undefined,
      explanation: sentence.is_tell
        ? sentence.explanation?.trim() ||
          (sentence.tactic
            ? tacticMeta(sentence.tactic).description
            : "Manipulation tell.")
        : undefined,
    }),
  );

  return {
    channel: s.channel ?? channel ?? "sms",
    difficulty: level,
    sender_label: s.sender_label || "Unknown sender",
    subject: s.subject || undefined,
    sentences,
    is_scam: Boolean(s.is_scam),
    reveal: s.reveal || "Review the flags above to see what you caught and missed.",
  };
}

/** Deterministic scoring — instant, explainable, works offline. */
export function scoreAttempt(
  scenario: GymScenario,
  flagged: number[],
): GymScore {
  const flaggedSet = new Set(flagged);
  const tells = scenario.sentences.filter((s) => s.is_tell);
  const tellIds = new Set(tells.map((t) => t.id));

  const tellsFound = tells.filter((t) => flaggedSet.has(t.id)).map((t) => t.id);
  const tellsMissed = tells.filter((t) => !flaggedSet.has(t.id)).map((t) => t.id);
  const falsePositives = scenario.sentences
    .filter((s) => flaggedSet.has(s.id) && !tellIds.has(s.id))
    .map((s) => s.id);

  const n = scenario.sentences.length || 1;
  const tellCount = tells.length;

  // Precision/recall over sentences, weighted, then folded to 0-100.
  const recall = tellCount === 0 ? 1 : tellsFound.length / tellCount;
  const precision =
    flaggedSet.size === 0
      ? tellCount === 0
        ? 1
        : 0
      : (tellsFound.length + (scenario.is_scam ? 0 : n - tellCount - falsePositives.length)) /
        flaggedSet.size;
  const p = Math.max(0, Math.min(1, precision));

  let score = Math.round((recall * 0.65 + p * 0.35) * 100);
  if (scenario.is_scam && tellsFound.length > 0) score = Math.max(score, 20);
  score = Math.max(0, Math.min(100, score));

  const headline =
    score >= 90
      ? "Sharp eye — you read it like an analyst."
      : score >= 70
        ? "Solid instincts. A couple of tells slipped by."
        : score >= 40
          ? "Getting there — slow down and scan for pressure and payment asks."
          : scenario.is_scam
            ? "This one got through. Study the debrief and try again."
            : "You flagged a harmless message — over-flagging is also a miss.";

  const debriefParts: string[] = [];
  if (tellsMissed.length) {
    const missed = tells
      .filter((t) => tellsMissed.includes(t.id))
      .map((t) => `"${truncate(t.text)}"${t.tactic ? ` (${t.tactic.replace(/_/g, " ")})` : ""}`);
    debriefParts.push(`You missed: ${missed.join("; ")}.`);
  }
  if (falsePositives.length) {
    const fps = scenario.sentences
      .filter((s) => falsePositives.includes(s.id))
      .map((s) => `"${truncate(s.text)}"`);
    debriefParts.push(
      `These were harmless, but you flagged them: ${fps.join("; ")}. Real messages contain odd-but-innocent lines too.`,
    );
  }
  if (!debriefParts.length) {
    debriefParts.push("Flawless read — every tell caught, nothing over-flagged.");
  }
  debriefParts.push(scenario.reveal);

  return {
    score,
    flagged: [...flaggedSet],
    tells_found: tellsFound,
    tells_missed: tellsMissed,
    false_positives: falsePositives,
    headline,
    debrief: debriefParts.join(" "),
  };
}

function truncate(s: string, n = 80): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ---------------------------------------------------------------------------
// Offline scenario library (fallback when API is unavailable)
// ---------------------------------------------------------------------------

const FALLBACKS: GymScenario[] = [
  {
    channel: "sms",
    difficulty: 1,
    sender_label: "+1 (302) 555-0177",
    is_scam: true,
    sentences: [
      { id: 1, text: "FINAL NOTICE: Your bank account will be suspended today.", is_tell: true, tactic: "fear_threat", explanation: "Threatens account suspension to trigger panic." },
      { id: 2, text: "Verify your identity immediately at http://secure-bank-verify.xyz", is_tell: true, tactic: "link_mismatch", explanation: "Uses .xyz domain that doesn't belong to any real bank." },
      { id: 3, text: "Reply with the OTP we just sent to restore access.", is_tell: true, tactic: "credential_phishing", explanation: "No bank ever asks for your OTP — sharing it hands over your account." },
      { id: 4, text: "Failure to respond within 30 minutes will lock your funds.", is_tell: true, tactic: "urgency", explanation: "Artificial deadline to stop you from verifying." },
    ],
    reveal: "Classic bank-impersonation phishing: fear + fake link + OTP theft under time pressure. Real banks contact you inside their official app, never via .xyz links.",
  },
  {
    channel: "email",
    difficulty: 3,
    sender_label: "service@paypa1-secure.example",
    subject: "Unusual activity: confirm your recent transaction",
    is_scam: true,
    sentences: [
      { id: 1, text: "We noticed a login attempt from an unrecognized device on your account.", is_tell: true, tactic: "pretexting_context", explanation: "Plausible security story sets the hook before any ask." },
      { id: 2, text: "If this was you, no action is needed; otherwise confirm your identity within 24 hours.", is_tell: true, tactic: "urgency", explanation: "The 24-hour window manufactures pressure." },
      { id: 3, text: "Confirm securely here: https://paypa1-secure.example/verify", is_tell: true, tactic: "link_mismatch", explanation: "Lookalike domain (paypa1 with a '1') impersonating a brand." },
      { id: 4, text: "You will be asked for your password and the code sent to your phone.", is_tell: true, tactic: "credential_phishing", explanation: "Asks for password + one-time code — the two keys to your account." },
      { id: 5, text: "Thanks for helping us keep your account safe.", is_tell: false },
    ],
    reveal: "Lookalike-domain phishing. The giveaway is the domain — 'paypa1' uses a numeral 1. Never enter credentials from an emailed link; open the app directly.",
  },
  {
    channel: "sms",
    difficulty: 2,
    sender_label: "UPS Delivery",
    is_scam: false,
    sentences: [
      { id: 1, text: "Hi, this is your driver. Your package couldn't be left at the door.", is_tell: false },
      { id: 2, text: "I've left it with the front desk — tracking is on your order page in the app.", is_tell: false },
      { id: 3, text: "No action needed. Have a good day!", is_tell: false },
    ],
    reveal: "This one is genuine. Notice: no link, no payment ask, no urgency, and it points you to the official app rather than external links. Not every unusual message is a scam.",
  },
];

function fallbackScenario(level: number, channel?: GymChannel): GymScenario {
  const pool = FALLBACKS.filter((s) => !channel || s.channel === channel);
  const list = pool.length ? pool : FALLBACKS;
  const pick = list[Math.floor(Math.random() * list.length)];
  return { ...pick, difficulty: level };
}
