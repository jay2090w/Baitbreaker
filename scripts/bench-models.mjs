// Benchmark the candidate models on the real analysis task.
// Usage: node scripts/bench-models.mjs
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
const ai = new GoogleGenAI({ apiKey: key });

const MESSAGE =
  "URGENT: Your bank account has been locked due to a suspicious transaction. Verify at http://secure-bank-verify.xyz within 24 hours or funds will be held. Send the OTP to complete verification.";

const schema = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["scam", "suspicious", "likely_safe"] },
    risk_score: { type: "integer" },
    summary: { type: "string" },
  },
  required: ["verdict", "risk_score", "summary"],
};

const MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
const RUNS = 3;

for (const model of MODELS) {
  const times = [];
  let status = "ok";
  for (let i = 0; i < RUNS; i++) {
    const t0 = Date.now();
    try {
      const res = await ai.interactions.create(
        {
          model,
          input: `Analyze this message for scam signals:\n${MESSAGE}`,
          system_instruction: "You are a fraud analyst. Output JSON per schema.",
          response_format: { type: "text", mime_type: "application/json", schema },
          generation_config: { thinking_level: "minimal" },
          store: false,
        },
        { timeout: 30000 },
      );
      if (!res.output_text) throw new Error("empty");
      times.push(Date.now() - t0);
    } catch (err) {
      status = err.message.slice(0, 80);
      break;
    }
  }
  if (times.length === RUNS) {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    console.log(`${model.padEnd(28)} avg=${avg}ms  runs=[${times.join(", ")}]`);
  } else {
    console.log(`${model.padEnd(28)} FAILED: ${status}`);
  }
}
