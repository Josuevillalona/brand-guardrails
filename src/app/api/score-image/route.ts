import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getScoringPrompt, parseScoringResponse, ImageMode } from "@/lib/image-scorer";
import { BrandKit } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      imageUrl,
      brandKit,
      userPrompt = "",
      imageMode = "hero",
    }: { imageUrl: string; brandKit: BrandKit; userPrompt?: string; imageMode?: ImageMode } =
      await req.json();

    if (!imageUrl || !brandKit) {
      return NextResponse.json(
        { error: "imageUrl and brandKit are required" },
        { status: 400 }
      );
    }

    // Fetch image and convert to base64 — Claude vision requires base64 source
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch image for scoring");
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = (imgRes.headers.get("content-type") ?? "image/png") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: getScoringPrompt(brandKit, userPrompt, imageMode),
            },
          ],
        },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const score = parseScoringResponse(rawText, imageMode);

    return NextResponse.json({ score });
  } catch (err) {
    console.error("[score-image]", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
