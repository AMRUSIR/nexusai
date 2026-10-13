```typescript
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid messages format." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing. Add it in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const messages = body.messages.filter(
      (message: { role?: string; content?: unknown }) =>
        ["user", "assistant"].includes(message.role || "") &&
        typeof message.content === "string"
    );

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
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
                "You are NexusAI, a friendly and helpful AI assistant. Answer clearly and naturally. Respond in the same language as the user.",
            },
            ...messages,
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter API error:", data);

      return NextResponse.json(
        {
          error:
            data.error?.message || "The AI service could not complete your request.",
        },
        { status: response.status }
      );
    }

    const reply = data.choices?.[0]?.message?.content;

    return NextResponse.json({
      reply:
        typeof reply === "string" && reply.length > 0
          ? reply
          : "I couldn't generate a response. Please try again.",
    });
  } catch (error) {
    console.error("NexusAI API error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
```
