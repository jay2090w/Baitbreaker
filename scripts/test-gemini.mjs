// Quick smoke test for the Gemini Interactions API + key.
// Run: node scripts/test-gemini.mjs
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) {
  console.error("No GEMINI_API_KEY found in .env.local");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: key });
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

console.log("Testing model:", model);
const t0 = Date.now();

try {
  const interaction = await ai.interactions.create({
    model,
    input: "Reply with exactly the JSON {\"ok\":true} and nothing else.",
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
    },
    store: false,
  });
  console.log("OK in", Date.now() - t0, "ms");
  console.log("output_text:", interaction.output_text);
} catch (err) {
  console.error("FAILED after", Date.now() - t0, "ms");
  console.error(err?.message ?? err);
  if (err?.response) {
    console.error("status:", err.response.status);
  }
}
