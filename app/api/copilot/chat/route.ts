import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  let auth: AuthorizedInternalUserContext | null = null;
  let input: CopilotChatRequest | null = null;
  let conversationId: string | undefined;

  try {
    auth = await requireRole(COPILOT_API_ROLES);

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

      return NextResponse.json(
        { error: "El body debe incluir message y un history opcional valido." },
        { status: 400 }
      );
    }

    conversationId = input.conversationId;

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

    let response: CopilotResponse;

    try {
      response = await runClaudeCopilot(input);
    } catch (agentError) {
      console.error(
        "Nancy Copilot Claude agent no disponible, usando fallback local:",
        sanitizeErrorForLog(agentError)
      );
      const fallbackResponse = await runCopilotOrchestrator(input);
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
      conversationId,
    };

    if (conversationId) {
      try {
        await appendCopilotMessage({
          userId: auth.user.id,
          conversationId,
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
      auth,
      action: "copilot.chat.message.sent",
      resourceType: "copilot_conversation",
      resourceId: conversationId,
      metadata: {
        conversationId,
        status: "success",
        messageCharCount: getApproximateCharCount(input.message),
        historyMessageCount: input.history?.length ?? 0,
        responseCharCount: getApproximateCharCount(response.answer),
        ...getCopilotResponseAuditMetadata(response),
      },
    });

    return NextResponse.json(responseWithConversation);
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }

    if (isForbiddenError(error)) {
      await logCopilotAccessDenied({
        error,
        route: "/api/copilot/chat",
        metadata: {
          method: "POST",
          conversationId,
          messageCharCount: getApproximateCharCount(input?.message),
        },
      });

      return forbiddenResponse();
    }

    console.error("Error en /api/copilot/chat:", sanitizeErrorForLog(error));
    await logCopilotApiError({
      auth,
      route: "/api/copilot/chat",
      operation: "send_message",
      resourceId: conversationId,
      errorCode: "copilot_chat_failed",
      metadata: {
        conversationId,
        messageCharCount: getApproximateCharCount(input?.message),
      },
    });

    return NextResponse.json(
      { error: "Error interno generando respuesta de Copilot." },
      { status: 500 }
    );
  }
}
