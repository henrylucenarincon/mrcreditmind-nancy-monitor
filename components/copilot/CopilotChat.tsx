import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff, Send } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CopilotMessage } from "./types";
import type { CopilotCard } from "@/lib/copilot/types";

const cardTone: Record<CopilotCard["tone"], { bg: string; border: string; text: string }> = {
  info: {
    bg: "var(--status-info-bg)",
    border: "var(--status-info-border)",
    text: "var(--status-info-text)",
  },
  success: {
    bg: "var(--status-success-bg)",
    border: "var(--status-success-border)",
    text: "var(--status-success-text)",
  },
  warning: {
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
    text: "var(--status-warning-text)",
  },
  danger: {
    bg: "var(--status-danger-bg)",
    border: "var(--status-danger-border)",
    text: "var(--status-danger-text)",
  },
  neutral: {
    bg: "transparent",
    border: "var(--border)",
    text: "var(--foreground-soft)",
  },
};

function ResponseCards({ cards }: { cards: CopilotCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {cards.map((card) => {
        const tone = cardTone[card.tone];

        return (
          <div
            className="rounded-xl border p-3"
            key={card.id}
            style={{
              borderColor: tone.border,
              backgroundColor: tone.bg,
              color: tone.text,
            }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-75">{card.title}</p>
            <p className="mt-1 text-sm font-semibold">{card.value}</p>
            {card.description ? <p className="mt-1 text-xs leading-5 opacity-80">{card.description}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border"
          style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--panel-soft)" }}
        >
          <Image src="/brand/nancy-mark.png" alt="Nancy" width={28} height={28} className="object-cover" />
        </div>
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--brand-gold)", animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--brand-gold)", animationDelay: "200ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--brand-gold)", animationDelay: "400ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CopilotChat({
  messages,
  isLoading,
  isDisabled = false,
  error,
  onSubmit,
}: {
  messages: CopilotMessage[];
  isLoading: boolean;
  isDisabled?: boolean;
  error: string;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [draft]);

  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any)?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.lang = "es-PR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setDraft(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();
    if (!message || isLoading || isDisabled) return;

    setDraft("");
    await onSubmit(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const hasText = draft.trim().length > 0;

  return (
    <section
      className="flex min-h-[600px] flex-col rounded-2xl border lg:min-h-0"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: "var(--border)" }}>
        <div className="relative flex items-center gap-2">
          <h2 className="text-sm font-semibold">Nancy Copilot</h2>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: isLoading ? "var(--brand-gold)" : "#2f7d57",
              boxShadow: isLoading
                ? "0 0 0 3px rgba(184,161,127,0.18)"
                : "0 0 0 3px rgba(47,125,87,0.18)",
            }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              className={`flex items-end gap-2.5 ${isAssistant ? "justify-start" : "justify-end"}`}
              key={message.id}
            >
              {isAssistant ? (
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border"
                  style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--panel-soft)" }}
                >
                  <Image src="/brand/nancy-mark.png" alt="Nancy" width={28} height={28} className="object-cover" />
                </div>
              ) : null}

              <div className={`${isAssistant ? "max-w-[75%]" : "max-w-[68%]"}`}>
                <div
                  className="rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm"
                  style={{
                    borderColor: isAssistant
                      ? "var(--border)"
                      : "rgba(184,161,127,0.28)",
                    backgroundColor: isAssistant
                      ? "var(--card)"
                      : "rgba(184,161,127,0.12)",
                    color: "var(--foreground)",
                  }}
                >
                  {isAssistant ? (
                    <div className="prose-nancy">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--brand-gold)", textDecoration: "underline" }}
                            >
                              {children}
                            </a>
                          ),
                          h1: ({ children }) => <p className="text-base font-bold mt-3 mb-1">{children}</p>,
                          h2: ({ children }) => <p className="text-sm font-bold mt-3 mb-1">{children}</p>,
                          h3: ({ children }) => <p className="text-sm font-semibold mt-2 mb-1">{children}</p>,
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-5">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          hr: () => <hr style={{ borderColor: "var(--border)", margin: "10px 0" }} />,
                          code: ({ children }) => (
                            <code
                              className="rounded px-1 py-0.5 text-xs"
                              style={{ backgroundColor: "var(--panel-soft)" }}
                            >
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}

                  {message.response ? (
                    <>
                      <ResponseCards cards={message.response.cards} />

                      {message.response.actions.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.response.actions.map((action) => (
                            <button
                              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                              key={action.id}
                              style={{
                                borderColor: "var(--border-strong)",
                                color: "var(--foreground-soft)",
                              }}
                              type="button"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <p
                  className={`mt-1 px-1 text-[11px] ${isAssistant ? "text-left" : "text-right"}`}
                  style={{ color: "var(--muted)" }}
                >
                  {message.time}
                </p>
              </div>
            </div>
          );
        })}

        {isLoading ? <TypingIndicator /> : null}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
        {error ? (
          <p
            className="mb-3 rounded-xl border px-3 py-2.5 text-sm"
            style={{
              borderColor: "var(--status-danger-border)",
              backgroundColor: "var(--status-danger-bg)",
              color: "var(--status-danger-text)",
            }}
          >
            {error}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-2xl border p-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <button
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors"
            style={{
              borderColor: isListening ? "rgba(239,68,68,0.4)" : "var(--border)",
              backgroundColor: isListening ? "rgba(239,68,68,0.08)" : "transparent",
              color: isListening ? "rgb(239,68,68)" : "var(--brand-gold)",
              opacity: isDisabled || isLoading ? 0.4 : 1,
            }}
            type="button"
            disabled={isDisabled || isLoading}
            onClick={toggleVoice}
            aria-label={isListening ? "Detener grabación" : "Hablar con Nancy"}
          >
            {isListening ? (
              <>
                <span
                  className="absolute inset-0 rounded-xl animate-ping"
                  style={{ backgroundColor: "rgba(239,68,68,0.15)" }}
                />
                <MicOff className="h-4 w-4 relative" />
              </>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            className="max-h-36 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
            disabled={isLoading || isDisabled}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una instruccion para Nancy..."
            rows={1}
            value={draft}
            style={{ color: "var(--foreground)" }}
          />

          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors"
            disabled={isLoading || isDisabled || !hasText}
            style={{
              borderColor: hasText ? "rgba(184,161,127,0.40)" : "var(--border)",
              backgroundColor: hasText ? "var(--brand-gold)" : "transparent",
              color: hasText ? "#ffffff" : "var(--muted)",
              opacity: isLoading || isDisabled ? 0.5 : 1,
            }}
            type="submit"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
