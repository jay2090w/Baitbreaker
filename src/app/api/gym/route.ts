import { NextRequest } from "next/server";
import { generateScenario, scoreAttempt } from "@/lib/gemini";
import type { GymChannel } from "@/lib/types";

const CHANNELS: GymChannel[] = [
  "sms",
  "email",
  "call_transcript",
  "dm",
  "marketplace",
  "job_offer",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "generate") {
      const difficulty = Number(body?.difficulty ?? 2);
      const channel = CHANNELS.includes(body?.channel) ? body.channel : undefined;
      const scenario = await generateScenario(difficulty, channel);
      return Response.json({ scenario });
    }

    if (action === "score") {
      const scenario = body?.scenario;
      const flagged = Array.isArray(body?.flagged) ? body.flagged : [];
      if (!scenario?.sentences) {
        return Response.json(
          { error: "Missing scenario to score." },
          { status: 400 },
        );
      }
      const score = scoreAttempt(scenario, flagged);
      return Response.json({ score });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("[/api/gym]", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Gym request failed.",
      },
      { status: 500 },
    );
  }
}
