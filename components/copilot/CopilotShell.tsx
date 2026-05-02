"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bot, LayoutDashboard, Moon, SunMedium } from "lucide-react";
import { CopilotChat } from "./CopilotChat";
import { CopilotContextPanel } from "./CopilotContextPanel";
import { CopilotSidebar } from "./CopilotSidebar";
import {
  mockActions,
  mockContext,
  mockMetrics,
} from "./mock-data";
import type { CopilotAction, CopilotContextItem, CopilotMessage } from "./types";
import type {
  CopilotChatMessage,
  CopilotResponse,
} from "@/lib/copilot/types";

type ThemeMode = "dark" | "light";

type ConversationApiRecord = {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

type MessageApiRecord = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response: CopilotResponse | null;
  created_at: string;
};

function formatTime() {
  return new Intl.DateTimeFormat("es-PR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function mapResponseContext(response: CopilotResponse | null): CopilotContextItem[] {
  if (!response || response.context.length === 0) {
    return mockContext;
  }

  return response.context.map((item) => ({
    label: item.label,
    value: item.value,
  }));
}

function mapResponseActions(response: CopilotResponse | null): CopilotAction[] {
  if (!response || response.actions.length === 0) {
    return mockActions;
  }

  return response.actions.map((action) => ({
    id: action.id,
    label: action.label,
    detail: action.description,
    status: action.type === "draft_message" ? "Borrador" : "Revisar",
  }));
}

function formatConversationTime(value: string) {
  try {
    return new Intl.DateTimeFormat("es-PR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function mapConversationToHistory(item: ConversationApiRecord) {
  return {
    id: item.id,
    title: item.title,
    source: "Copilot",
    status: "Activo" as const,
    time: formatConversationTime(item.updated_at),
    summary: item.summary || "Sin mensajes todavia.",
  };
}

function mapApiMessageToUi(item: MessageApiRecord): CopilotMessage {
  return {
    id: item.id,
    role: item.role,
    author: item.role === "assistant" ? "Nancy Copilot" : "Equipo",
    time: formatConversationTime(item.created_at),
    content: item.content,
    response: item.response ?? undefined,
  };
}

export function CopilotShell() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationApiRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] = useState<CopilotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("light");

  const context = useMemo(() => mapResponseContext(latestResponse), [latestResponse]);
  const actions = useMemo(() => mapResponseActions(latestResponse), [latestResponse]);
  const historyItems = useMemo(() => {
    return conversations.map(mapConversationToHistory);
  }, [conversations]);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const response = await fetch("/api/copilot/conversations", { cache: "no-store" });
      const data = (await response.json()) as { conversations?: ConversationApiRecord[] };
      setConversations(data.conversations ?? []);
    } catch (loadError) {
      console.error("Error cargando historial Copilot:", loadError);
      setConversations([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "light" ? "light" : "dark");
  }, []);

  async function loadConversation(conversationId: string) {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/copilot/conversations/${conversationId}/messages`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No pudimos abrir la conversacion.");
      }

      const data = (await response.json()) as {
        messages?: MessageApiRecord[];
      };
      const loadedMessages = (data.messages ?? []).map(mapApiMessageToUi);
      setActiveConversationId(conversationId);
      setMessages(loadedMessages);
      setLatestResponse(
        [...loadedMessages].reverse().find((message) => message.response)?.response ?? null
      );
    } catch (loadError) {
      console.error("Error abriendo conversacion Copilot:", loadError);
      setError("No pudimos abrir esa conversacion.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleToggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("nancy-theme", next);
      return next;
    });
  }

  async function handleCreateConversation() {
    setError("");

    try {
      const response = await fetch("/api/copilot/conversations", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No pudimos crear la conversacion.");
      }

      const data = (await response.json()) as { conversation?: ConversationApiRecord };
      setActiveConversationId(data.conversation?.id ?? null);
      setMessages([]);
      setLatestResponse(null);
      void loadConversations();
    } catch (createError) {
      console.error("Error creando conversacion Copilot:", createError);
      setActiveConversationId(null);
      setMessages([]);
      setLatestResponse(null);
      setError("No pudimos crear la conversacion guardada. Puedes escribir y se intentara guardar de nuevo.");
    }
  }

  async function handleSubmit(message: string) {
    const currentMessages = messages;
    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      author: "Equipo",
      time: formatTime(),
      content: message,
    };

    setMessages((items) => [...items, userMessage]);
    setError("");
    setIsLoading(true);

    const history: CopilotChatMessage[] = currentMessages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, history, conversationId: activeConversationId }),
      });

      if (!response.ok) {
        throw new Error("No pudimos obtener respuesta de Nancy Copilot.");
      }

      const data = (await response.json()) as CopilotResponse;
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
      }

      const assistantMessage: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        author: "Nancy Copilot",
        time: formatTime(),
        content: data.answer,
        response: data,
      };

      setLatestResponse(data);
      setMessages((items) => [...items, assistantMessage]);
      void loadConversations();
    } catch (requestError) {
      console.error("Error consultando Nancy Copilot:", requestError);
      setError("Nancy no pudo responder ahora mismo. Intenta de nuevo en unos segundos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  return (
    <main className="min-h-screen lg:h-screen lg:overflow-hidden" style={{ color: "var(--foreground)" }}>
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:h-screen lg:px-6 lg:py-8">
        <header className="mb-6 lg:mb-8">
          <div
            className="overflow-hidden rounded-[28px] border px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
            style={{
              borderColor: "var(--border-soft)",
              background:
                "linear-gradient(135deg, rgba(184,161,127,0.10) 0%, rgba(42,64,89,0.08) 42%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "var(--shadow-panel)",
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                  style={{
                    borderColor: "var(--border-soft)",
                    backgroundColor: "var(--panel-soft)",
                  }}
                >
                  <Image
                    src="/brand/nancy-mark.png"
                    alt="Nancy Copilot"
                    fill
                    className="object-cover"
                    sizes="44px"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                      Nancy Copilot
                    </h1>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                      style={{
                        borderColor: "var(--status-warning-border)",
                        backgroundColor: "var(--status-warning-bg)",
                        color: "var(--status-warning-text)",
                      }}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      V1
                    </span>
                  </div>
                  <p className="mt-1 text-sm sm:text-[15px]" style={{ color: "var(--foreground-soft)" }}>
                    Base estructural para asistencia comercial con contexto interno.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium"
                  href="/"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: "var(--foreground)",
                  }}
                >
                  <ArrowLeft className="h-4 w-4" style={{ color: "var(--brand-gold)" }} />
                  Monitor
                </Link>
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  aria-label="Cambiar tema"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition hover:bg-white/5"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: "var(--foreground)",
                  }}
                >
                  {theme === "dark" ? (
                    <SunMedium className="h-4 w-4" style={{ color: "var(--brand-gold)" }} />
                  ) : (
                    <Moon className="h-4 w-4" style={{ color: "var(--brand-blue)" }} />
                  )}
                </button>
                <span
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground-soft)",
                  }}
                >
                  <LayoutDashboard className="h-4 w-4" style={{ color: "var(--brand-gold)" }} />
                  Historial activo
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)_360px]">
          <CopilotSidebar
            activeId={activeConversationId}
            isLoading={loadingHistory}
            items={historyItems}
            onCreate={handleCreateConversation}
            onSelect={(id) => void loadConversation(id)}
          />
          <CopilotChat
            error={error}
            isLoading={isLoading}
            messages={messages}
            onSubmit={handleSubmit}
          />
          <CopilotContextPanel
            actions={actions}
            context={context}
            metrics={mockMetrics}
          />
        </div>
      </div>
    </main>
  );
}
