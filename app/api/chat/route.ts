import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const latestMessage = safeMessages[safeMessages.length - 1].content;

    // Detect requests to generate an actual image.
    const imageRequest =
      /\b(generate|create|make|draw|produce)\b.{0,50}\b(image|picture|photo|artwork|illustration)\b/i.test(
        latestMessage
      ) ||
      /\b(image|picture|photo)\b.{0,50}\b(generate|create|make|draw)\b/i.test(
        latestMessage
      );

    if (imageRequest) {
      const hfToken = process.env.HF_TOKEN;

      if (!hfToken) {
        return NextResponse.json(
          { error: "Image generation is not configured. Check HF_TOKEN in Vercel." },
          { status: 500 }
        );
      }

      const imageResponse = await fetch(
        "https://router.huggingface.co/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "black-forest-labs/FLUX.1-schnell",
            prompt: latestMessage,
            size: "1024x1024",
          }),
        }
      );

      if (!imageResponse.ok) {
        const details = await imageResponse.text();
        console.error("Image provider error:", details);

        return NextResponse.json(
          {
            error:
              "Image generation failed. Check Hugging Face model availability, token permissions, and available credits.",
          },
          { status: 502 }
        );
      }

      const imageBlob = await imageResponse.blob();
      const imageBase64 = Buffer.from(
        await imageBlob.arrayBuffer()
      ).toString("base64");

      return NextResponse.json({
        reply: "Here is your generated image!",
        image: `data:${imageBlob.type || "image/png"};base64,${imageBase64}`,
      });
    }

    // Normal chat continues through OpenRouter.
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chat API key is missing. Check your environment variables." },
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
              content: `
You are NexusAI, a helpful, friendly, multilingual AI assistant.

Reply in the same language as the user's latest message.
Support English, Malayalam, Hindi, Tamil, Telugu, Kannada,
Bengali, Marathi, Arabic, French, Spanish, and other languages
supported by the model.

Be friendly, clear, helpful, and accurate.
Explain technical topics in beginner-friendly language.
Never claim you generated an image unless an image was actually generated.
When users ask for images, explain that they can ask NexusAI to generate
an image, rather than only providing an image prompt.
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
          error: data.error?.message || "The AI provider request failed.",
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
      { error: "Server error. Check the deployment logs for details." },
      { status: 500 }
    );
  }
}
