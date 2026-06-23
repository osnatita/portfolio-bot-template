"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

/* ------------------------------------------------------------------ *
 * CUSTOMIZE ME: the three constants below are everything in the UI.
 * ------------------------------------------------------------------ */
const BOT_NAME = "Portfolio Bot";
const PORTFOLIO_URL = "https://example.com"; // your portfolio link (or remove the nav link)
const INTRO = "Ask me anything about the work.";
const SUGGESTED = [
  "What are the strongest projects?",
  "Tell me about the AI work",
  "What's the approach to accessibility?",
  "Is there availability for new work?",
];
/* ------------------------------------------------------------------ */

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts || !Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// Pull a trailing follow-up question off the end of an answer so it can be shown
// as a clickable chip. Optional sugar; safe to delete if you don't want it.
function extractFollowUp(text: string): { mainText: string; followUp: string | null } {
  const trimmed = text.trim();
  const starters = ["Want to", "Want ", "Curious about", "Should I", "Next up", "Interested in", "Would you like"];
  for (const starter of starters) {
    const lastIndex = trimmed.lastIndexOf(starter);
    if (lastIndex > 0) {
      const candidate = trimmed.slice(lastIndex).trim();
      if (candidate.endsWith("?") && candidate.length < 150) {
        return { mainText: trimmed.slice(0, lastIndex).trim(), followUp: candidate };
      }
    }
  }
  return { mainText: text, followUp: null };
}

export default function PortfolioBot() {
  const [input, setInput] = useState("");
  const [chatKey, setChatKey] = useState(0);

  const sessionId = useMemo(() => `session-${chatKey}-${Date.now()}`, [chatKey]);

  const { messages, sendMessage, status } = useChat({
    id: `chat-${chatKey}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({ body: { messages, sessionId } }),
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const sendSuggestion = (text: string) => sendMessage({ text });
  const resetChat = () => setChatKey((prev) => prev + 1);
  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <div className="pbot-root">
      <nav className="pbot-nav">
        <button onClick={resetChat} className="pbot-wordmark pbot-home-btn" aria-label="Reset chat">
          {BOT_NAME} <em>· beta</em>
        </button>
        <div className="pbot-navlinks">
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="pbot-navlink">
            Portfolio
          </a>
        </div>
      </nav>

      <main className="pbot-main">
        {showSuggestions && (
          <>
            <h1 className="pbot-intro">{INTRO}</h1>
            <p className="pbot-introsub">
              I&apos;m a chatbot trained on the portfolio. Try one of these to start:
            </p>
            <div className="pbot-suggestions">
              {SUGGESTED.map((q) => (
                <button key={q} className="pbot-chip" onClick={() => sendSuggestion(q)}>
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="pbot-scroll" ref={scrollRef}>
          {messages.map((m, index) => {
            const text = getMessageText(m);
            const isLastAssistant = m.role === "assistant" && index === messages.length - 1;
            const { mainText, followUp } =
              m.role === "assistant" ? extractFollowUp(text) : { mainText: text, followUp: null };

            return (
              <div key={m.id} className="pbot-msg">
                {m.role === "user" ? (
                  <div className="pbot-msg-user">
                    <div className="pbot-msg-user-bubble">{text}</div>
                  </div>
                ) : (
                  <div className="pbot-msg-bot">
                    <div className="pbot-msg-bot-mark">★</div>
                    <div className="pbot-msg-bot-content">
                      <div className="pbot-msg-bot-body">{mainText}</div>
                      {followUp && isLastAssistant && !isLoading && (
                        <div className="pbot-followup">
                          <button
                            className="pbot-followup-chip"
                            onClick={() => sendSuggestion(followUp.replace(/\?$/, ""))}
                          >
                            {followUp}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="pbot-msg">
              <div className="pbot-msg-bot">
                <div className="pbot-msg-bot-mark">★</div>
                <div className="pbot-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {status === "error" && (
          <div className="pbot-error">Something broke. Refresh and try again.</div>
        )}

        <form className="pbot-form" onSubmit={handleSubmit}>
          <div className="pbot-input-wrap">
            <input
              ref={inputRef}
              className="pbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about the work..."
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="pbot-send"
              disabled={isLoading || !input?.trim()}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
