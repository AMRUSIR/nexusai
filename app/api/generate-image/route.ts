import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const prompt = body?.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please enter a description for the image." },
        { status: 400 }
      );
    }

    const apiKey = process.env.CLOUDFLARE_IMAGE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "CLOUDFLARE_IMAGE_API_KEY is missing in Vercel." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://nexusai-image-api.lyfen757.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Cloudflare API error:", response.status, errorText);

      return NextResponse.json(
        {
          error: `Image API failed (${response.status}): ${errorText}`,
        },
        { status: response.status }
      );
    }

    // Cloudflare returns JPEG bytes, not JSON.
    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      image: `data:image/jpeg;base64,${base64}`,
    });
  } catch (error) {
    console.error("NexusAI image generation error:", error);

    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
