import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key missing. Check your environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = body.messages;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid chat messages." },
        { status: 400 }
      );
    }

    const safeMessages = messages
      .filter(
        (m: { role?: string; content?: string }) =>
          ["user", "assistant"].includes(m.role || "") &&
          typeof m.content === "string"
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

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
              content: `
You are NexusAI, a helpful, friendly, multilingual AI assistant.

LANGUAGE:
- Reply in the same language as the user's latest message.
- Support English, Malayalam, Hindi, Tamil, Telugu, Kannada,
  Bengali, Marathi, Arabic, French, Spanish, and other languages
  supported by the model.
- If the user requests a specific language, use that language.
- If the user mixes languages, respond naturally.
- Use natural spelling and grammar.
- If asked which languages you support, explain that you can
  communicate in many languages.

BEHAVIOUR:
- Be friendly, clear, helpful, and accurate.
- Explain technical topics in beginner-friendly language.
- Give examples when useful.
- Never claim you performed an action you did not perform.
- If you don't know an answer, say so honestly.
`,
            },
            ...safeMessages,
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
    console.error("NexusAI API error:", error);

    return NextResponse.json(
      { error: "Server error. Check the terminal for details." },
      { status: 500 }
    );
  }
}
