import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const token = process.env.HF_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "HF_TOKEN is missing. Add it to Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const prompt = body.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please provide an image prompt." },
        { status: 400 }
      );
    }

    const client = new InferenceClient(token);

    const imageBlob = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      provider: "auto",
      inputs: prompt.trim(),
    });

    const contentType = imageBlob.type || "image/png";

    if (!contentType.startsWith("image/")) {
      throw new Error(`Unexpected image response type: ${contentType}`);
    }

    const imageBase64 = Buffer.from(
      await imageBlob.arrayBuffer()
    ).toString("base64");

    return NextResponse.json({
      success: true,
      reply: "Here is your generated image!",
      image: `data:${contentType};base64,${imageBase64}`,
    });
  } catch (error) {
    console.error("NexusAI image generation error:", error);

    return NextResponse.json(
      {
        error: "Image generation failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown image generation error.",
      },
      { status: 500 }
    );
  }
}
