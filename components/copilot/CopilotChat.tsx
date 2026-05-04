import { FormEvent, KeyboardEvent, useState } from "react";
import { Bot, CheckCircle2, Paperclip, Send, Sparkles } from "lucide-react";
import type { CopilotMessage } from "./types";
import type { CopilotCard, CopilotSource } from "@/lib/copilot/types";

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
    bg: "rgba(255,255,255,0.03)",
    border: "var(--border)",
    text: "var(--foreground-soft)",
  },
};

function ResponseCards({ cards }: { cards: CopilotCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {cards.map((card) => {
        const tone = cardTone[card.tone];

        return (
          <div
            className="rounded-2xl border p-3"
            key={card.id}
            style={{
              borderColor: tone.border,
              backgroundColor: tone.bg,
              color: tone.text,
            }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide">{card.title}</p>
            <p className="mt-1 text-sm font-semibold">{card.value}</p>
            {card.description ? <p className="mt-1 text-xs leading-5">{card.description}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function ResponseSources({ sources }: { sources: CopilotSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sources.map((source) => (
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]"
          key={source.id}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "rgba(255,255,255,0.03)",
            color: "var(--muted)",
          }}
        >
          {source.label}
        </span>
      ))}
    </div>
  );
}

export function CopilotChat({
  messages,
  isLoading,
  error,
  onSubmit,
}: {
  messages: CopilotMessage[];
  isLoading: boolean;
  error: string;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();
    if (!message || isLoading) return;

    setDraft("");
    await onSubmit(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section
      className="flex min-h-[620px] flex-col rounded-3xl border lg:min-h-0"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="border-b px-5 py-4 sm:px-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className="text-[11px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              Chat central
            </p>
            <h2 className="mt-1 text-xl font-semibold">Nancy Copilot</h2>
          </div>
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: "var(--status-success-border)",
              backgroundColor: "var(--status-success-bg)",
              color: "var(--status-success-text)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Base visual V1
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
              key={message.id}
            >
              <div className={`max-w-[88%] ${isAssistant ? "sm:max-w-[78%]" : "sm:max-w-[72%]"}`}>
                <div
                  className="mb-2 flex items-center gap-2 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {isAssistant ? <Bot className="h-4 w-4" /> : null}
                  <span>{message.author}</span>
                  <span>{message.time}</span>
                </div>
                <div
                  className="whitespace-pre-line rounded-[28px] border px-5 py-4 text-sm leading-6 shadow-sm"
                  style={{
                    borderColor: isAssistant ? "var(--border)" : "var(--status-warning-border)",
                    backgroundColor: isAssistant ? "var(--card)" : "var(--status-warning-bg)",
                    color: isAssistant ? "var(--foreground)" : "var(--status-warning-text)",
                  }}
                >
                  {message.content}
                  {message.response ? (
                    <>
                      <ResponseCards cards={message.response.cards} />

                      {message.response.actions.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {message.response.actions.map((action) => (
                            <button
                              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                              key={action.id}
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "rgba(255,255,255,0.03)",
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

                      <ResponseSources sources={message.response.sources} />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="max-w-[78%]">
              <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                <Bot className="h-4 w-4" />
                <span>Nancy Copilot</span>
              </div>
              <div
                className="rounded-[28px] border px-5 py-4 text-sm leading-6"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground-soft)",
                }}
              >
                Nancy esta revisando el contexto...
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t p-4 sm:p-5" style={{ borderColor: "var(--border)" }}>
        {error ? (
          <p
            className="mb-3 rounded-2xl border px-4 py-3 text-sm"
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
          className="flex items-end gap-3 rounded-3xl border p-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              borderColor: "var(--border)",
              color: "var(--brand-gold)",
            }}
            type="button"
            aria-label="Adjuntar contexto"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            className="min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
            disabled={isLoading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una instruccion para Nancy Copilot..."
            rows={1}
            value={draft}
            style={{ color: "var(--foreground)" }}
          />
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
            disabled={isLoading || draft.trim().length === 0}
            style={{
              borderColor: "var(--status-warning-border)",
              backgroundColor: "var(--status-warning-bg)",
              color: "var(--status-warning-text)",
              opacity: isLoading || draft.trim().length === 0 ? 0.55 : 1,
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
