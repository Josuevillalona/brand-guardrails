import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { buildStructuredBrandPrompt, buildAlternativePrompt } from "@/lib/prompt-builder";
import { BrandKit } from "@/types";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function POST(req: NextRequest) {
  try {
    const {
      userPrompt,
      brandKit = null,
      count = 2,
      failingDimension = null,
      isAlternative = false,
      imageMode = "hero",
      scoreIssues,
      scoreExplanation,
    }: {
      userPrompt: string;
      brandKit: BrandKit | null;
      count?: number;
      failingDimension?: string | null;
      isAlternative?: boolean;
      imageMode?: "hero" | "supporting" | "broll";
      scoreIssues?: string[];
      scoreExplanation?: string;
    } = await req.json();

    if (!userPrompt) {
      return NextResponse.json(
        { error: "userPrompt is required" },
        { status: 400 }
      );
    }

    // Build the prompt — 7-block structured when Brand Kit present, raw prompt otherwise.
    // imageMode shifts which blocks are enforced: hero=full, supporting=loosen colors, broll=atmosphere only.
    const assembledPrompt = brandKit
      ? isAlternative
        ? buildAlternativePrompt(userPrompt, brandKit, failingDimension, imageMode, scoreIssues, scoreExplanation)
        : buildStructuredBrandPrompt(userPrompt, brandKit, imageMode)
      : userPrompt.trim();

    const imageCount = Math.min(Math.max(1, count), 2);

    // FLUX.1-dev via Replicate — supports num_outputs natively, single call
    const output = await replicate.run("black-forest-labs/flux-dev", {
      input: {
        prompt: assembledPrompt,
        num_outputs: imageCount,
        aspect_ratio: "1:1",
        output_format: "webp",
        output_quality: 90,
        go_fast: false,      // full quality weights
        guidance: isAlternative ? 5.0 : 3.5, // higher adherence for targeted corrections
      },
    });

    // SDK v1.x returns FileOutput[]; .toString() gives the CDN URL in all versions
    const imageUrls = (output as unknown[])
      .map((item) => String(item))
      .filter(Boolean);

    return NextResponse.json({ imageUrls, assembledPrompt, userPrompt });
  } catch (err) {
    console.error("[generate-image]", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const isRateLimit = message.includes("429") || message.toLowerCase().includes("throttled") || message.toLowerCase().includes("rate limit");
    if (isRateLimit) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const isOutOfCredits = message.includes("402") || message.toLowerCase().includes("insufficient credit") || message.toLowerCase().includes("payment required");
    if (isOutOfCredits) {
      return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
