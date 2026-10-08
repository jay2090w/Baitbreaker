// Benchmark extra free-tier models for the hedge chain.
// Usage: node scripts/bench-extra.mjs
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
const ai = new GoogleGenAI({ apiKey: key });

const schema = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["scam", "suspicious", "likely_safe"] },
    risk_score: { type: "integer" },
    summary: { type: "string" },
  },
  required: ["verdict", "risk_score", "summary"],
};

const MSG =
  "URGENT: Your account is locked. Verify at http://fake-bank.xyz within 24h or funds will be held. Send the OTP.";

const MODELS = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
];

for (const model of MODELS) {
  const t0 = Date.now();
  try {
    const res = await ai.interactions.create(
      {
        model,
        input: `Analyze this message for scam signals:\n${MSG}`,
        system_instruction: "You are a fraud analyst. Output JSON per schema.",
        response_format: { type: "text", mime_type: "application/json", schema },
        generation_config: { thinking_level: "minimal" },
        store: false,
      },
      { timeout: 45000 },
    );
    const t = Date.now() - t0;
    let ok = false;
    try { ok = JSON.parse(res.output_text).verdict === "scam"; } catch {}
    console.log(`${model.padEnd(28)} ${t}ms  json=${ok ? "valid" : "INVALID"}  ${ok ? "" : (res.output_text || "").slice(0, 80)}`);
  } catch (err) {
    const msg = (err?.message || String(err)).slice(0, 110);
    console.log(`${model.padEnd(28)} FAILED after ${Date.now() - t0}ms: ${msg}`);
  }
}
