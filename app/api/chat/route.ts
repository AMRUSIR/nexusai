```typescript
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid chat messages." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing from Vercel." },
        { status: 500 }
      );
    }

    const messages = body.messages.filter(
      (m: { role?: string; content?: unknown }) =>
        ["user", "assistant"].includes(m.role || "") &&
        typeof m.content === "string"
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
                "You are NexusAI, a helpful multilingual assistant. Reply in the same language as the user.",
            },
            ...messages,
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Chat request failed." },
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
      { error: "Request failed. Please try again." },
      { status: 500 }
    );
  }
}
```
