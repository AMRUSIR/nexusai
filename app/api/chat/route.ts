```typescript
import { NextResponse } from "next/server";

export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isImageRequest(text: string): boolean {
  return /\b(generate|create|make|draw|render|produce)\b.{0,100}\b(image|picture|photo|artwork|illustration|wallpaper)\b/i.test(
    text
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
        (m: { role?: string; content?: unknown }) =>
          ["user", "assistant"].includes(m.role || "") &&
          typeof m.content === "string"
      )
      .map((m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1].content;

    // IMAGE GENERATION
    if (isImageRequest(latestMessage)) {
      const token = process.env.HF_TOKEN;

      if (!token) {
        return NextResponse.json(
          { error: "HF_TOKEN is missing from Vercel Environment Variables." },
          { status: 500 }
        );
      }

      const response = await fetch(
        "https://router.huggingface.co/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "black-forest-labs/FLUX.1-schnell",
            prompt: latestMessage,
            size: "1024x1024",
          }),
        }
      );

      if (!response.ok) {
        const details = await response.text();
        console.error("Hugging Face error:", details);

        return NextResponse.json(
          {
            error: "Image generation failed.",
            details: details.slice(0, 1000),
          },
          { status: 502 }
        );
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const result = await response.json();

        const imageData =
          result.data?.[0]?.b64_json ||
          result.image ||
          result.data?.[0]?.url;

        if (typeof imageData !== "string") {
          return NextResponse.json(
            { error: "The image provider returned no usable image." },
            { status: 502 }
          );
        }

        if (
          imageData.startsWith("data:image/") ||
          /^https?:\/\//i.test(imageData)
        ) {
          return NextResponse.json({
            reply: "Here is your generated image!",
            image: imageData,
          });
        }

        return NextResponse.json({
          reply: "Here is your generated image!",
          image: `data:image/png;base64,${imageData}`,
        });
      }

      if (!contentType.startsWith("image/")) {
        return NextResponse.json(
          {
            error: "The provider returned an unsupported response type.",
            details: contentType || "Unknown content type",
          },
          { status: 502 }
        );
      }

      const bytes = Buffer.from(await response.arrayBuffer());

      return NextResponse.json({
        reply: "Here is your generated image!",
        image: `data:${contentType};base64,${bytes.toString("base64")}`,
      });
    }

    // NORMAL TEXT CHAT
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing from Vercel." },
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
                "You are NexusAI, a helpful multilingual assistant. Reply in the same language as the user. Be clear, friendly, and accurate. Do not claim to have generated an image in a text-only response.",
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
            data.error?.message || "The chat provider request failed.",
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
    console.error("NexusAI error:", error);

    return NextResponse.json(
      {
        error: "The request failed.",
        details:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
```
