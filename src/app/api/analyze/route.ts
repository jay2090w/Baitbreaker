import { NextRequest } from "next/server";
import { analyze } from "@/lib/gemini";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let text: string | undefined;
    let image: { data: string; mimeType: string } | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      const textField = form.get("text");

      if (typeof textField === "string" && textField.trim()) {
        text = textField.trim();
      }

      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_IMAGE_BYTES) {
          return Response.json(
            { error: "Image too large — please keep it under 8MB." },
            { status: 413 },
          );
        }
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          return Response.json(
            { error: `Unsupported image type ${file.type || "unknown"}. Use PNG, JPEG, or WebP.` },
            { status: 415 },
          );
        }
        const buf = Buffer.from(await file.arrayBuffer());
        image = { data: buf.toString("base64"), mimeType: file.type };
      }
    } else {
      const body = await req.json();
      if (typeof body?.text === "string" && body.text.trim()) {
        text = body.text.trim();
      }
    }

    if (!text && !image) {
      return Response.json(
        { error: "Provide message text or upload a screenshot." },
        { status: 400 },
      );
    }

    if (text && text.length > 20_000) {
      text = text.slice(0, 20_000);
    }

    const result = await analyze({ text, image });
    return Response.json(result);
  } catch (err) {
    console.error("[/api/analyze]", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Analysis failed unexpectedly.",
      },
      { status: 500 },
    );
  }
}
