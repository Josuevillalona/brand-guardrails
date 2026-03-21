import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildStructuredBrandPrompt, buildAlternativePrompt } from "@/lib/prompt-builder";
import { BrandKit } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Generate `count` images in parallel (default 2)
    const imageCount = Math.min(Math.max(1, count), 2);
    const requests = Array.from({ length: imageCount }, () =>
      openai.images.generate({
        model: "dall-e-3",
        prompt: assembledPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      })
    );

    const results = await Promise.all(requests);
    const imageUrls = results
      .map((r) => r.data?.[0]?.url)
      .filter((url): url is string => Boolean(url));

    return NextResponse.json({
      imageUrls,
      assembledPrompt,
      userPrompt,
    });
  } catch (err) {
    console.error("[generate-image]", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
