import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in Vercel environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const prompt = body?.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please enter a description for the image." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt.trim(),
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";

        return NextResponse.json({
          success: true,
          image: `data:${mimeType};base64,${part.inlineData.data}`,
        });
      }
    }

    return NextResponse.json(
      { error: "The model did not return an image. Try a different prompt." },
      { status: 502 }
    );
  } catch (error) {
    console.error("NexusAI image generation error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      { error: `Image generation failed: ${message}` },
      { status: 500 }
    );
  }
}
