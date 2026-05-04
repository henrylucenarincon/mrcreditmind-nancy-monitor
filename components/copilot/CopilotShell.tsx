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

type CopilotApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "server_error"
  | "non_json_response"
  | "unexpected_response"
  | "request_failed";

class CopilotApiError extends Error {
  status: number;
  code: CopilotApiErrorCode;

  constructor(message: string, status: number, code: CopilotApiErrorCode) {
    super(message);
    this.name = "CopilotApiError";
    this.status = status;
    this.code = code;
  }
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConversationRecord(value: unknown): value is ConversationApiRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (typeof value.summary === "string" || value.summary === null) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isMessageRecord(value: unknown): value is MessageApiRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.created_at === "string"
  );
}

function isCopilotResponse(value: unknown): value is CopilotResponse {
  return (
    isRecord(value) &&
    typeof value.answer === "string" &&
    Array.isArray(value.cards) &&
    Array.isArray(value.actions) &&
    Array.isArray(value.context) &&
    Array.isArray(value.sources) &&
    (typeof value.conversationId === "string" || value.conversationId === undefined)
  );
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new CopilotApiError(
      "La respuesta del servidor no tuvo el formato esperado.",
      response.status,
      "non_json_response"
    );
  }

  return (await response.json()) as unknown;
}

function getStatusErrorCode(status: number): CopilotApiErrorCode {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status >= 500) return "server_error";
  return "request_failed";
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof CopilotApiError)) {
    return fallback;
  }

  if (error.code === "unauthenticated") {
    return "Tu sesion expiro o no esta autenticada. Vuelve a iniciar sesion para usar Nancy Copilot.";
  }

  if (error.code === "forbidden") {
    return "Tu usuario no tiene permiso para usar Nancy Copilot. Pide acceso a un administrador.";
  }

  if (error.code === "server_error") {
    return "Nancy Copilot tuvo un error interno. Intenta de nuevo en unos segundos.";
  }

  if (error.code === "non_json_response" || error.code === "unexpected_response") {
    return "Nancy Copilot recibio una respuesta inesperada del servidor. Intenta recargar la pagina.";
  }

  return fallback;
}

async function readApiData<T>(
  response: Response,
  validate: (value: unknown) => value is T
) {
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new CopilotApiError(
      "No pudimos completar la solicitud.",
      response.status,
      getStatusErrorCode(response.status)
    );
  }

  if (!validate(data)) {
    throw new CopilotApiError(
      "La estructura de respuesta no fue la esperada.",
      response.status,
      "unexpected_response"
    );
  }

  return data;
}

export function CopilotShell() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationApiRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] = useState<CopilotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
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
      const data = await readApiData(
        response,
        (value): value is { conversations: ConversationApiRecord[] } =>
          isRecord(value) &&
          Array.isArray(value.conversations) &&
          value.conversations.every(isConversationRecord)
      );
      setConversations(data.conversations);
      setIsAccessBlocked(false);
    } catch (loadError) {
      console.error("Error cargando historial Copilot:", loadError);
      setConversations([]);
      setIsAccessBlocked(
        loadError instanceof CopilotApiError &&
          (loadError.code === "unauthenticated" || loadError.code === "forbidden")
      );
      setError(
        getSafeErrorMessage(
          loadError,
          "No pudimos cargar el historial de Nancy Copilot."
        )
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      setTheme(currentTheme === "light" ? "light" : "dark");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function loadConversation(conversationId: string) {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/copilot/conversations/${conversationId}/messages`, {
        cache: "no-store",
      });

      if (!response.ok) {
        await readJsonResponse(response);
        throw new CopilotApiError(
          "No pudimos abrir la conversacion.",
          response.status,
          getStatusErrorCode(response.status)
        );
      }

      const data = await readApiData(
        response,
        (value): value is { messages: MessageApiRecord[] } =>
          isRecord(value) &&
          Array.isArray(value.messages) &&
          value.messages.every(isMessageRecord)
      );
      const loadedMessages = data.messages.map(mapApiMessageToUi);
      setActiveConversationId(conversationId);
      setMessages(loadedMessages);
      setLatestResponse(
        [...loadedMessages].reverse().find((message) => message.response)?.response ?? null
      );
      setIsAccessBlocked(false);
    } catch (loadError) {
      console.error("Error abriendo conversacion Copilot:", loadError);
      setIsAccessBlocked(
        loadError instanceof CopilotApiError &&
          (loadError.code === "unauthenticated" || loadError.code === "forbidden")
      );
      setError(
        getSafeErrorMessage(loadError, "No pudimos abrir esa conversacion.")
      );
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
        await readJsonResponse(response);
        throw new CopilotApiError(
          "No pudimos crear la conversacion.",
          response.status,
          getStatusErrorCode(response.status)
        );
      }

      const data = await readApiData(
        response,
        (value): value is { conversation: ConversationApiRecord } =>
          isRecord(value) && isConversationRecord(value.conversation)
      );
      setActiveConversationId(data.conversation.id);
      setMessages([]);
      setLatestResponse(null);
      setIsAccessBlocked(false);
      void loadConversations();
    } catch (createError) {
      console.error("Error creando conversacion Copilot:", createError);
      setActiveConversationId(null);
      setMessages([]);
      setLatestResponse(null);
      setIsAccessBlocked(
        createError instanceof CopilotApiError &&
          (createError.code === "unauthenticated" || createError.code === "forbidden")
      );
      setError(
        getSafeErrorMessage(
          createError,
          "No pudimos crear la conversacion guardada. Puedes escribir y se intentara guardar de nuevo."
        )
      );
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
        body: JSON.stringify({
          message,
          history,
          conversationId: activeConversationId ?? undefined,
        }),
      });

      if (!response.ok) {
        await readJsonResponse(response);
        throw new CopilotApiError(
          "No pudimos obtener respuesta de Nancy Copilot.",
          response.status,
          getStatusErrorCode(response.status)
        );
      }

      const data = await readApiData(response, isCopilotResponse);
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
      setIsAccessBlocked(false);
      void loadConversations();
    } catch (requestError) {
      console.error("Error consultando Nancy Copilot:", requestError);
      setIsAccessBlocked(
        requestError instanceof CopilotApiError &&
          (requestError.code === "unauthenticated" || requestError.code === "forbidden")
      );
      setError(
        getSafeErrorMessage(
          requestError,
          "Nancy no pudo responder ahora mismo. Intenta de nuevo en unos segundos."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadConversations();
    });

    return () => window.cancelAnimationFrame(frame);
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
            isDisabled={isAccessBlocked}
            onCreate={handleCreateConversation}
            onSelect={(id) => void loadConversation(id)}
          />
          <CopilotChat
            error={error}
            isLoading={isLoading}
            isDisabled={isAccessBlocked}
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
