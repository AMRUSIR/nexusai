"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

const suggestions = [
  {
    icon: "✦",
    title: "Explain something",
    text: "Explain artificial intelligence simply",
  },
  {
    icon: "⌘",
    title: "Write some code",
    text: "Write a Python program for beginners",
  },
  {
    icon: "✎",
    title: "Help me write",
    text: "Write a professional email for me",
  },
  {
    icon: "◈",
    title: "Creative ideas",
    text: "Give me 5 creative YouTube video ideas",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();

    if (!content || loading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "API returned non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

        throw new Error(
          response.status === 404
            ? "API route not found. Check that the API file exists and redeploy."
            : `Server returned HTML instead of JSON (HTTP ${response.status}). Check the Vercel deployment and function logs.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to get a response.");
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply || "",
          image: typeof data.image === "string" ? data.image : undefined,
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function generateImage() {
    const prompt = imagePrompt.trim();

    if (!prompt || imageLoading) return;

    setImageLoading(true);
    setImageError("");
    setGeneratedImage("");

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "API returned non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

        throw new Error(
          response.status === 404
            ? "API route not found. Check that the API file exists and redeploy."
            : `Server returned HTML instead of JSON (HTTP ${response.status}). Check the Vercel deployment and function logs.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Image generation failed.");
      }

      if (typeof data.image !== "string") {
        throw new Error("No image was returned.");
      }

      setGeneratedImage(data.image);
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setImageLoading(false);
    }
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="nexus-app">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #090a0f;
          color: #f4f4f8;
          font-family: Arial, Helvetica, sans-serif;
        }

        button,
        textarea {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .nexus-app {
          display: flex;
          min-height: 100dvh;
          background:
            radial-gradient(
              ellipse at 70% -15%,
              rgba(92, 65, 190, 0.13),
              transparent 45%
            ),
            #090a0f;
        }

        .sidebar {
          width: 252px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 22px 15px;
          background: rgba(15, 16, 23, 0.96);
          border-right: 1px solid #22232d;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 4px 8px 30px;
        }

        .brand-logo {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #8b5cf6, #4f75ff);
          box-shadow: 0 4px 25px #7355e633;
          font-size: 22px;
        }

        .brand-name {
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.7px;
        }

        .brand-sub {
          color: #818392;
          font-size: 11px;
          margin-top: 4px;
        }

        .new-chat {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px;
          color: #fff;
          background: linear-gradient(
            110deg,
            rgba(125, 91, 240, 0.2),
            rgba(80, 108, 255, 0.12)
          );
          border: 1px solid #4c416c;
          border-radius: 11px;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .new-chat:hover {
          background: #29213d;
          border-color: #8b72d9;
        }

        .sidebar-label {
          margin: 30px 8px 12px;
          color: #777989;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.3px;
        }

        .history-empty {
          padding: 8px;
          color: #777989;
          font-size: 12px;
          line-height: 1.7;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 14px 8px 0;
          border-top: 1px solid #252631;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          background: #252538;
          border: 1px solid #48405f;
          border-radius: 50%;
          color: #c6b5ff;
        }

        .profile-name {
          font-size: 12px;
          font-weight: 600;
        }

        .profile-caption {
          margin-top: 4px;
          color: #777989;
          font-size: 11px;
        }

        .main-panel {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
        }

        .topbar {
          height: 68px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          border-bottom: 1px solid #20212a;
          background: rgba(9, 10, 15, 0.7);
        }

        .model-name {
          color: #e9e8f0;
          font-size: 13px;
          font-weight: 600;
        }

        .model-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 5px;
          color: #8c8d9d;
          font-size: 11px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #51d5a1;
          box-shadow: 0 0 10px #51d5a155;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .top-button {
          padding: 9px 13px;
          color: #c4c4d0;
          background: #14151d;
          border: 1px solid #292a35;
          border-radius: 9px;
          font-size: 12px;
          cursor: pointer;
        }

        .top-button:hover {
          background: #20212c;
        }

        .mobile-menu {
          display: none;
        }

        .chat-area {
          width: 100%;
          max-width: 880px;
          flex: 1;
          margin: 0 auto;
          padding: 38px 30px 22px;
          display: flex;
          flex-direction: column;
        }

        .welcome {
          width: 100%;
          max-width: 700px;
          margin: auto;
          padding: 35px 0 45px;
        }

        .welcome-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          margin: 0 auto 25px;
          border-radius: 21px;
          background: linear-gradient(140deg, #8b5cf6, #536dff);
          box-shadow: 0 10px 45px #7257ff35;
          font-size: 33px;
        }

        .welcome h1 {
          margin: 0;
          text-align: center;
          font-size: clamp(29px, 4vw, 42px);
          line-height: 1.2;
          letter-spacing: -1.7px;
          font-weight: 750;
        }

        .gradient-text {
          color: #a995ff;
          background: linear-gradient(90deg, #c2aaff, #829dff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome-description {
          max-width: 440px;
          margin: 15px auto 32px;
          color: #999aaa;
          text-align: center;
          font-size: 14px;
          line-height: 1.8;
        }

        .suggestions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .suggestion {
          min-height: 100px;
          padding: 17px;
          text-align: left;
          color: #f2f0fa;
          background: rgba(20, 21, 31, 0.8);
          border: 1px solid #292a37;
          border-radius: 14px;
          cursor: pointer;
          transition:
            transform 0.2s,
            border-color 0.2s,
            background 0.2s;
        }

        .suggestion:hover {
          transform: translateY(-2px);
          background: #191a28;
          border-color: #6553a4;
        }

        .suggestion-icon {
          display: block;
          margin-bottom: 11px;
          color: #ae9aff;
          font-size: 18px;
        }

        .suggestion-title {
          display: block;
          font-size: 13px;
          font-weight: 650;
        }

        .suggestion-text {
          display: block;
          margin-top: 6px;
          color: #9293a4;
          font-size: 11px;
          line-height: 1.5;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding: 8px 0 28px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .message.user {
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: 1px solid #393044;
          border-radius: 11px;
          color: #c6b2ff;
          background: #211a33;
        }

        .message.user .message-avatar {
          color: #fff;
          background: #30314b;
          border-color: #444563;
        }

        .message-body {
          min-width: 0;
          max-width: calc(100% - 46px);
          padding-top: 3px;
        }

        .message-role {
          margin-bottom: 8px;
          color: #b7b6c7;
          font-size: 12px;
          font-weight: 650;
        }

        .message.user .message-role {
          text-align: right;
        }

        .message-content {
          color: #e3e3ed;
          font-size: 14px;
          line-height: 1.85;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .message.user .message-content {
          padding: 12px 15px;
          background: #252437;
          border: 1px solid #37344e;
          border-radius: 15px 4px 15px 15px;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 22px;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a48aff;
          animation: bounce 1s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        .composer-wrap {
          position: sticky;
          bottom: 0;
          padding-top: 15px;
          background: linear-gradient(
            180deg,
            rgba(9, 10, 15, 0),
            #090a0f 18%
          );
        }

        .composer {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 15px 15px 13px 19px;
          background: #14151e;
          border: 1px solid #343542;
          border-radius: 17px;
          box-shadow: 0 12px 50px #00000025;
          transition: border-color 0.2s;
        }

        .composer:focus-within {
          border-color: #7060ae;
        }

        .composer textarea {
          flex: 1;
          min-width: 0;
          min-height: 27px;
          max-height: 150px;
          resize: vertical;
          outline: none;
          border: none;
          color: #f4f2fc;
          background: transparent;
          font-size: 14px;
          line-height: 1.7;
        }

        .composer textarea::placeholder {
          color: #77798b;
        }

        .send-button {
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 12px;
          color: white;
          background: linear-gradient(135deg, #8b5cf6, #596fff);
          font-size: 21px;
          cursor: pointer;
          transition:
            opacity 0.2s,
            transform 0.2s;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .send-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .disclaimer {
          margin: 12px 0 0;
          color: #737485;
          text-align: center;
          font-size: 10px;
          line-height: 1.7;
        }

        .empty-note {
          margin: auto 0 12px;
          text-align: center;
          color: #77798a;
          font-size: 11px;
        }

        @media (max-width: 760px) {
          .sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            z-index: 10;
            width: 270px;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 15px 0 50px #0005;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-menu {
            display: inline-grid;
            place-items: center;
            width: 35px;
            height: 35px;
            margin-right: 9px;
            border: 1px solid #292a35;
            border-radius: 9px;
            color: #eee;
            background: #14151d;
            cursor: pointer;
          }

          .topbar {
            height: 62px;
            padding: 0 15px;
          }

          .topbar-left {
            display: flex;
            align-items: center;
          }

          .chat-area {
            padding: 24px 17px 15px;
          }

          .welcome {
            padding: 35px 0;
          }

          .welcome-icon {
            width: 55px;
            height: 55px;
            border-radius: 18px;
          }

          .welcome-description {
            font-size: 13px;
          }

          .suggestion {
            padding: 13px;
            min-height: 105px;
          }

          .suggestion-text {
            font-size: 10px;
          }

          .messages {
            gap: 22px;
          }

          .composer {
            padding: 12px;
            gap: 8px;
          }

          .composer textarea {
            font-size: 13px;
          }

          .top-button {
            padding: 8px 10px;
            font-size: 11px;
          }
        }

        @media (max-width: 390px) {
          .suggestions {
            grid-template-columns: 1fr;
          }

          .suggestion {
            min-height: 0;
          }

          .suggestion-icon {
            margin-bottom: 7px;
          }

          .welcome h1 {
            font-size: 30px;
          }
        }
      `}</style>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">✦</div>
          <div>
            <div className="brand-name">NexusAI</div>
            <div className="brand-sub">Your AI workspace</div>
          </div>
        </div>

        <button className="new-chat" onClick={newChat}>
          <span>＋</span>
          <span>New conversation</span>
        </button>

        <div className="sidebar-label">Workspace</div>
        <div className="history-empty">
          Your conversations will appear here as you chat.
        </div>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">✦</div>
            <div>
              <div className="profile-name">NexusAI</div>
              <div className="profile-caption">AI assistant</div>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <div>
              <div className="model-name">NexusAI Assistant</div>
              <div className="model-status">
                <span className="status-dot" />
                Ready to help
              </div>
            </div>
          </div>

          <div className="top-actions">
            <button className="top-button" onClick={newChat}>
              ＋ New chat
            </button>
          </div>
        </header>

        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon">✦</div>
              <h1>
                Meet your new
                <br />
                <span className="gradient-text">AI companion.</span>
              </h1>
              <p className="welcome-description">
                Ask questions, explore ideas, write code, or create something
                amazing. What would you like to work on today?
              </p>

              <div className="suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    className="suggestion"
                    key={suggestion.title}
                    onClick={() => sendMessage(suggestion.text)}
                  >
                    <span className="suggestion-icon">{suggestion.icon}</span>
                    <span className="suggestion-title">
                      {suggestion.title}
                    </span>
                    <span className="suggestion-text">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <div
                  className={`message ${message.role}`}
                  key={`${index}-${message.role}`}
                >
                  <div className="message-avatar">
                    {message.role === "assistant" ? "✦" : "●"}
                  </div>

                  <div className="message-body">
                    <div className="message-role">
                      {message.role === "assistant" ? "NexusAI" : "You"}
                    </div>
                    {message.content && (
                      <div className="message-content">{message.content}</div>
                    )}

                    {message.image && (
                      <div className="generated-image-wrap" style={{ marginTop: 12 }}>
                        <img
                          src={message.image}
                          alt="Image generated by NexusAI"
                          style={{
                            display: "block",
                            width: "100%",
                            maxWidth: 640,
                            height: "auto",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        />
                        <a
                          href={message.image}
                          download="nexusai-generated-image.png"
                          style={{
                            display: "inline-block",
                            marginTop: 10,
                            padding: "9px 14px",
                            borderRadius: 9,
                            textDecoration: "none",
                            border: "1px solid rgba(255,255,255,0.18)",
                            color: "inherit",
                            fontSize: 14,
                          }}
                        >
                          Download image ↓
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message assistant">
                  <div className="message-avatar">✦</div>
                  <div className="message-body">
                    <div className="message-role">NexusAI</div>
                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          <div
            style={{
              marginBottom: 18,
              padding: 16,
              background: "#14151e",
              border: "1px solid #343542",
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              🎨 Create an image with NexusAI
            </div>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe your image... e.g. A cinematic black sports car on a neon-lit street at night"
              maxLength={2000}
              rows={3}
              aria-label="Describe an image to generate"
              style={{
                width: "100%",
                padding: 12,
                color: "#f4f4f8",
                background: "#090a0f",
                border: "1px solid #343542",
                borderRadius: 10,
                resize: "vertical",
                outline: "none",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "#9293a4", fontSize: 11 }}>
                {imagePrompt.length}/2000 characters
              </span>
              <button
                type="button"
                onClick={generateImage}
                disabled={!imagePrompt.trim() || imageLoading}
                style={{
                  padding: "11px 17px",
                  color: "#fff",
                  background: "linear-gradient(135deg, #8b5cf6, #596fff)",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: imageLoading ? "wait" : "pointer",
                  opacity: !imagePrompt.trim() || imageLoading ? 0.55 : 1,
                }}
              >
                {imageLoading ? "⏳ Generating..." : "🎨 Generate Image"}
              </button>
            </div>

            {imageError && (
              <p style={{ color: "#ff8585", fontSize: 13, marginTop: 12 }}>
                {imageError}
              </p>
            )}

            {generatedImage && (
              <div style={{ marginTop: 16 }}>
                <img
                  src={generatedImage}
                  alt="Image generated by NexusAI"
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: 640,
                    height: "auto",
                    borderRadius: 12,
                  }}
                />
                <a
                  href={generatedImage}
                  download="nexusai-image.png"
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "10px 15px",
                    color: "#fff",
                    background: "#18794e",
                    borderRadius: 9,
                    textDecoration: "none",
                  }}
                >
                  ⬇️ Download Image
                </a>
              </div>
            )}
          </div>

          <div className="composer-wrap">
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message NexusAI..."
                rows={1}
                aria-label="Message NexusAI"
              />

              <button
                className="send-button"
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                ↑
              </button>
            </form>

            <p className="disclaimer">
              NexusAI can make mistakes. Check important information.
              <br />
              Press Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
