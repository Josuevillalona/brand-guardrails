import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { buildStructuredBrandPrompt, buildAlternativePrompt } from "@/lib/prompt-builder";
import { BrandKit } from "@/types";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function POST(req: NextRequest) {
  try {
    const {
      userPrompt,
      brandKit,
      count = 2,
      failingDimension = null,
      isAlternative = false,
    }: {
      userPrompt: string;
      brandKit: BrandKit;
      count?: number;
      failingDimension?: string | null;
      isAlternative?: boolean;
    } = await req.json();

    if (!userPrompt || !brandKit) {
      return NextResponse.json(
        { error: "userPrompt and brandKit are required" },
        { status: 400 }
      );
    }

    // Build the 7-block structured prompt
    const assembledPrompt = isAlternative
      ? buildAlternativePrompt(userPrompt, brandKit, failingDimension)
      : buildStructuredBrandPrompt(userPrompt, brandKit);

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
        guidance: 3.5,       // default — balanced prompt adherence
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
