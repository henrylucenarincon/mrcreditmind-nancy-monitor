import { NextRequest } from "next/server";
import {
  forbiddenResponse,
  isForbiddenError,
  requireRole,
  type AuthorizedInternalUserContext,
} from "@/lib/auth/require-role";
import {
  isAuthRequiredError,
  unauthorizedResponse,
} from "@/lib/auth/require-user";
import {
  appendCopilotMessage,
  ensureCopilotConversation,
} from "@/lib/copilot/history";
import { runClaudeCopilot } from "@/lib/copilot/claude-client";
import { getTeamMember } from "@/lib/copilot/team";
import { runCopilotOrchestrator } from "@/lib/copilot/orchestrator";
import {
  COPILOT_API_ROLES,
  getApproximateCharCount,
  getCopilotResponseAuditMetadata,
  logCopilotAccessDenied,
  logCopilotApiError,
  logCopilotEvent,
} from "@/lib/copilot/security";
import { sanitizeErrorForLog } from "@/lib/security/masking";
import type {
  CopilotChatMessage,
  CopilotChatRequest,
  CopilotResponse,
} from "@/lib/copilot/types";

function isHistory(value: unknown): value is CopilotChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        "content" in item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
  );
}

function parseRequestBody(body: unknown): CopilotChatRequest | null {
  if (typeof body !== "object" || body === null || !("message" in body)) {
    return null;
  }

  const message = body.message;

  if (typeof message !== "string" || message.trim().length === 0) {
    return null;
  }

  const history = "history" in body ? body.history : undefined;
  const conversationId = "conversationId" in body ? body.conversationId : undefined;

  if (history !== undefined && !isHistory(history)) {
    return null;
  }

  if (
    conversationId !== undefined &&
    conversationId !== null &&
    typeof conversationId !== "string"
  ) {
    return null;
  }

  return {
    message: message.trim(),
    history,
    conversationId: typeof conversationId === "string" ? conversationId : undefined,
  };
}

async function readRequestBody(request: NextRequest) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function getToolLabel(name: string, input: Record<string, unknown>): string {
  const params = (input.params as Record<string, string>) ?? {};

  if (name === "funnelup_request") {
    const path = String(input.path ?? "");
    const method = String(input.method ?? "GET");

    if (path.includes("/opportunities/pipelines")) return "Consultando pipelines de FunnelUP";
    if (path.includes("/opportunities/search")) return "Buscando oportunidades en pipeline";
    if (path.includes("/notes")) return "Revisando notas del cliente";
    if (path.includes("/tasks")) return "Revisando tareas del cliente";
    if (path.includes("/tags")) return "Gestionando etiquetas del cliente";
    if (path.includes("/conversations")) return "Revisando conversaciones";
    if (path.match(/\/contacts\/[^/]+$/)) return "Consultando perfil del cliente";
    if (path.includes("/contacts") && method === "GET") {
      const q = params.query ?? params.q ?? "";
      return q ? `Buscando "${q.slice(0, 35)}" en FunnelUP` : "Buscando contactos en FunnelUP";
    }
    if (method !== "GET") return "Actualizando datos en FunnelUP";
    return `Consultando FunnelUP (${path})`;
  }

  if (name === "read_spreadsheet") {
    return "Leyendo tabla o hoja de cálculo";
  }

  if (name === "drive_request") {
    const endpoint = String(input.endpoint ?? "");
    const q = params.q ?? "";

    if (q.includes("CID-")) return "Buscando carpetas de clientes en Drive";
    if (q.toLowerCase().includes("onboarding") || q.toLowerCase().includes("submission")) return "Buscando onboardings en Drive";
    if (endpoint.includes("/export")) return "Leyendo contenido del documento";
    if (params.alt === "media") return "Descargando contenido del archivo";
    if (endpoint !== "/files" && endpoint.includes("/files/")) return "Abriendo recurso en Drive";
    if (q) return `Buscando en Drive: "${q.slice(0, 40)}"`;
    return "Explorando Google Drive";
  }

  return name;
}

export async function POST(request: NextRequest) {
  let auth: AuthorizedInternalUserContext | null = null;
  let input: CopilotChatRequest | null = null;
  let conversationId: string | undefined;

  // Auth and body parsing must happen before we create the stream
  try {
    auth = await requireRole(COPILOT_API_ROLES);
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }
    if (isForbiddenError(error)) {
      await logCopilotAccessDenied({
        error,
        route: "/api/copilot/chat",
        metadata: { method: "POST" },
      });
      return forbiddenResponse();
    }
    return new Response(JSON.stringify({ error: "Error interno." }), { status: 500 });
  }

  const body = await readRequestBody(request);
  input = parseRequestBody(body);

  if (!input) {
    await logCopilotEvent({
      auth,
      action: "copilot.chat.rejected",
      resourceType: "copilot_chat",
      metadata: {
        status: "bad_request",
        errorCode: "invalid_request_body",
      },
    });

    return new Response(
      JSON.stringify({ error: "El body debe incluir message y un history opcional valido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Team member lookup — blocks unauthorized users and sets context
  const teamMember = getTeamMember(auth.user.email ?? "");
  if (teamMember && !teamMember.canUseNancy) {
    return new Response(
      JSON.stringify({ error: "No tienes acceso a Nancy Copilot." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  conversationId = input.conversationId;

  // Persist user message before streaming
  try {
    const conversation = await ensureCopilotConversation(
      auth.user.id,
      conversationId,
      input.message
    );
    conversationId = conversation.id;

    await appendCopilotMessage({
      userId: auth.user.id,
      conversationId,
      role: "user",
      content: input.message,
    });
  } catch (storageError) {
    console.error(
      "No pudimos persistir mensaje de usuario Copilot:",
      sanitizeErrorForLog(storageError)
    );
  }

  const capturedAuth = auth;
  const capturedInput = input;
  const capturedConversationId = conversationId;
  const capturedTeamMember = teamMember ?? undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(sseEvent(data)));
      }

      let resolvedConversationId = capturedConversationId;

      try {
        let response: CopilotResponse;

        try {
          response = await runClaudeCopilot(
            capturedInput,
            {
              onToolStart(name, input) {
                send({ type: "tool_start", name, label: getToolLabel(name, input) });
              },
              onToolEnd(name, ok) {
                send({ type: "tool_end", name, ok });
              },
            },
            capturedTeamMember
          );
        } catch (agentError) {
          console.error(
            "Nancy Copilot Claude agent no disponible, usando fallback local:",
            sanitizeErrorForLog(agentError)
          );
          const fallbackResponse = await runCopilotOrchestrator(capturedInput);
          response = {
            ...fallbackResponse,
            answer: `${fallbackResponse.answer}\n\nNota: el modelo conversacional no estuvo disponible ahora mismo. Respondo con el contexto estructurado disponible.`,
            sources: [
              ...fallbackResponse.sources,
              {
                id: "claude-conversational-model-pending",
                label: "Claude conversational model pending",
                type: "internal",
                status: "pending",
              },
            ],
          };
        }

        const responseWithConversation = {
          ...response,
          conversationId: resolvedConversationId,
        };

        if (resolvedConversationId) {
          try {
            await appendCopilotMessage({
              userId: capturedAuth.user.id,
              conversationId: resolvedConversationId,
              role: "assistant",
              content: response.answer,
              response: responseWithConversation,
            });
          } catch (storageError) {
            console.error(
              "No pudimos persistir respuesta Copilot:",
              sanitizeErrorForLog(storageError)
            );
          }
        }

        await logCopilotEvent({
          auth: capturedAuth,
          action: "copilot.chat.message.sent",
          resourceType: "copilot_conversation",
          resourceId: resolvedConversationId,
          metadata: {
            conversationId: resolvedConversationId,
            status: "success",
            messageCharCount: getApproximateCharCount(capturedInput.message),
            historyMessageCount: capturedInput.history?.length ?? 0,
            responseCharCount: getApproximateCharCount(response.answer),
            ...getCopilotResponseAuditMetadata(response),
          },
        });

        send({
          type: "done",
          answer: responseWithConversation.answer,
          sources: responseWithConversation.sources,
          cards: responseWithConversation.cards,
          actions: responseWithConversation.actions,
          context: responseWithConversation.context,
          conversationId: resolvedConversationId,
        });
      } catch (error) {
        console.error("Error en /api/copilot/chat stream:", sanitizeErrorForLog(error));

        await logCopilotApiError({
          auth: capturedAuth,
          route: "/api/copilot/chat",
          operation: "send_message",
          resourceId: resolvedConversationId,
          errorCode: "copilot_chat_failed",
          metadata: {
            conversationId: resolvedConversationId,
            messageCharCount: getApproximateCharCount(capturedInput.message),
          },
        });

        send({ type: "error", message: "Error interno generando respuesta de Copilot." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
