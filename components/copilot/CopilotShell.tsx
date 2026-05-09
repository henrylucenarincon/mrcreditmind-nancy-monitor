"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Moon, SunMedium } from "lucide-react";
import { CopilotChat } from "./CopilotChat";
import { CopilotContextPanel } from "./CopilotContextPanel";
import { CopilotSidebar } from "./CopilotSidebar";
import type { CopilotMessage, ToolActivityItem } from "./types";
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

const TOOL_LABELS: Record<string, string> = {
  funnelup_request: "Consultando FunnelUP",
  drive_request: "Revisando Drive",
  find_client: "Buscando cliente",
  find_drive_folder_or_file: "Buscando en Drive",
  get_client_documents: "Revisando documentos",
  get_client_onboarding_status: "Verificando onboarding",
  get_client_summary: "Obteniendo resumen",
  get_funding_status: "Revisando financiamiento",
  search_internal_operational_data: "Buscando datos internos",
};

function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name;
}

function formatTime() {
  return new Intl.DateTimeFormat("es-PR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
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

function isSseEvent(value: unknown): value is Record<string, unknown> & { type: string } {
  return isRecord(value) && typeof value.type === "string";
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [toolActivity, setToolActivity] = useState<ToolActivityItem[]>([]);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setIsAccessBlocked(false);
      void loadConversations();
    } catch (createError) {
      console.error("Error creando conversacion Copilot:", createError);
      setActiveConversationId(null);
      setMessages([]);
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
    setToolActivity([]);

    if (cleanupTimerRef.current !== null) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

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

      if (!response.ok || !response.body) {
        const status = response.status;
        throw new CopilotApiError(
          "No pudimos obtener respuesta de Nancy Copilot.",
          status,
          getStatusErrorCode(status)
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const rawJson = trimmed.slice("data:".length).trim();
          if (!rawJson) continue;

          let parsed: unknown;
          try {
            parsed = JSON.parse(rawJson) as unknown;
          } catch {
            continue;
          }

          if (!isSseEvent(parsed)) continue;

          if (parsed.type === "tool_start" && typeof parsed.name === "string") {
            const name = parsed.name;
            const label = typeof parsed.label === "string" ? parsed.label : name;
            setToolActivity((prev) => [
              ...prev,
              { name, label, status: "running" },
            ]);
          } else if (
            parsed.type === "tool_end" &&
            typeof parsed.name === "string" &&
            typeof parsed.ok === "boolean"
          ) {
            const name = parsed.name;
            const ok = parsed.ok;
            setToolActivity((prev) =>
              prev.map((item) =>
                item.name === name && item.status === "running"
                  ? { ...item, status: ok ? "done" : "error" }
                  : item
              )
            );
          } else if (parsed.type === "done") {
            // Build a full CopilotResponse-shaped object from the SSE event
            const candidate: unknown = {
              answer: parsed.answer,
              cards: parsed.cards ?? [],
              actions: parsed.actions ?? [],
              context: parsed.context ?? [],
              sources: parsed.sources ?? [],
              conversationId: parsed.conversationId,
            };

            if (!isCopilotResponse(candidate)) {
              throw new CopilotApiError(
                "La estructura de respuesta no fue la esperada.",
                200,
                "unexpected_response"
              );
            }

            if (candidate.conversationId) {
              setActiveConversationId(candidate.conversationId);
            }

            const assistantMessage: CopilotMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              author: "Nancy Copilot",
              time: formatTime(),
              content: candidate.answer,
              response: candidate,
            };

            setMessages((items) => [...items, assistantMessage]);
            setIsAccessBlocked(false);
            void loadConversations();

            // Clear tool activity after 2 seconds
            cleanupTimerRef.current = setTimeout(() => {
              setToolActivity([]);
              cleanupTimerRef.current = null;
            }, 2000);
          } else if (parsed.type === "error" && typeof parsed.message === "string") {
            setError(parsed.message);
          }
        }
      }
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current !== null) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  return (
    <main className="min-h-screen lg:h-screen lg:overflow-hidden" style={{ color: "var(--foreground)" }}>
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-4 py-3 sm:px-6 sm:py-4 lg:h-screen lg:px-6 lg:py-4">
        <header className="mb-4">
          <div
            className="flex h-16 items-center justify-between gap-3 border-b px-1"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border"
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
                  sizes="32px"
                  priority
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight leading-none">
                  Nancy Copilot
                </h1>
                <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                  Asistente comercial con contexto interno
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 text-sm"
                href="/"
                style={{ color: "var(--muted)" }}
              >
                <ArrowLeft className="h-4 w-4" />
                Monitor
              </Link>
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-label="Cambiar tema"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors hover:border-[var(--border-strong)]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                }}
              >
                {theme === "dark" ? (
                  <SunMedium className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[288px_minmax(0,1fr)_288px]">
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
            toolActivity={toolActivity}
            isLoading={isLoading}
          />
        </div>
      </div>
    </main>
  );
}
