import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies external images (e.g. Replicate CDN) through our own origin
 * so html2canvas can capture them without CORS errors.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return new NextResponse("Upstream fetch failed", { status: 502 });

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/webp";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 500 });
  }
}
