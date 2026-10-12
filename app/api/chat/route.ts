import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isImageRequest(message: string): boolean {
  const text = message.toLowerCase();

  return (
    /\b(generate|create|make|draw|produce|render)\b.{0,100}\b(image|picture|photo|artwork|illustration|wallpaper)\b/i.test(
      text
    ) ||
    /\b(image|picture|photo|artwork|illustration|wallpaper)\b.{0,100}\b(generate|create|make|draw|produce|render)\b/i.test(
      text
    ) ||
    /\b(generate|create|make|draw|render)\s+(me\s+)?(a|an|some)\b/i.test(
      text
    ) &&
      /\b(image|picture|photo|wallpaper|illustration|artwork)\b/i.test(text)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid chat messages." },
        { status: 400 }
      );
    }

    const messages: ChatMessage[] = body.messages
      .filter(
        (message: { role?: string; content?: unknown }) =>
          ["user", "assistant"].includes(message.role || "") &&
          typeof message.content === "string"
      )
      .map((message: ChatMessage) => ({
        role: message.role,
        content: message.content,
      }));

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1].content;

    // Generate an actual image for image requests.
    if (isImageRequest(latestMessage)) {
      const token = process.env.HF_TOKEN;

      if (!token) {
        return NextResponse.json(
          {
            error:
              "Image generation is not configured. Add HF_TOKEN to Vercel Environment Variables.",
          },
          { status: 500 }
        );
      }

      const client = new InferenceClient(token);

      const imageBlob = await client.textToImage({
        model: "black-forest-labs/FLUX.1-schnell",
        provider: "auto",
        inputs: latestMessage,
      });

      const contentType = imageBlob.type || "image/png";

      if (!contentType.startsWith("image/")) {
        throw new Error(
          `The image provider returned an unexpected content type: ${contentType}`
        );
      }

      const imageBase64 = Buffer.from(
        await imageBlob.arrayBuffer()
      ).toString("base64");

      return NextResponse.json({
        reply: "Here is your generated image!",
        image: `data:${contentType};base64,${imageBase64}`,
      });
    }

    // Normal text chat uses OpenRouter.
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing from the environment variables." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are NexusAI, a helpful multilingual AI assistant. Reply in the same language as the user's latest message. Be friendly, clear, accurate, and beginner-friendly. Do not claim to generate images in a normal text response.",
            },
            ...messages,
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message || "The AI provider request failed.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      reply:
        data.choices?.[0]?.message?.content ||
        "No response received. Please try again.",
    });
  } catch (error) {
    console.error("NexusAI chat API error:", error);

    return NextResponse.json(
      {
        error: "Image generation or chat failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
