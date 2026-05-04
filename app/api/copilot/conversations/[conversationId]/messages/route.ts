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
  getCopilotConversation,
  listCopilotMessages,
} from "@/lib/copilot/history";
import {
  COPILOT_API_ROLES,
  logCopilotAccessDenied,
  logCopilotApiError,
  logCopilotEvent,
} from "@/lib/copilot/security";

type Params = Promise<{ conversationId: string }>;

export async function GET(_request: NextRequest, context: { params: Params }) {
  let auth: AuthorizedInternalUserContext | null = null;
  const { conversationId } = await context.params;

  try {
    auth = await requireRole(COPILOT_API_ROLES);
    const conversation = await getCopilotConversation(auth.user.id, conversationId);

    if (!conversation) {
      return NextResponse.json({ error: "Conversacion no encontrada." }, { status: 404 });
    }

    const messages = await listCopilotMessages(auth.user.id, conversationId);

    await logCopilotEvent({
      auth,
      action: "copilot.messages.read",
      resourceType: "copilot_conversation",
      resourceId: conversationId,
      metadata: {
        messageCount: messages.length,
      },
    });

    return NextResponse.json({ conversation, messages });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }

    if (isForbiddenError(error)) {
      await logCopilotAccessDenied({
        error,
        route: `/api/copilot/conversations/${conversationId}/messages`,
        metadata: { method: "GET", conversationId },
      });

      return forbiddenResponse();
    }

    console.error("Error cargando mensajes Copilot:", error);
    await logCopilotApiError({
      auth,
      route: `/api/copilot/conversations/${conversationId}/messages`,
      operation: "read_messages",
      resourceId: conversationId,
      errorCode: "copilot_messages_read_failed",
      metadata: { conversationId },
    });

    return NextResponse.json(
      { error: "No pudimos cargar la conversacion." },
      { status: 500 }
    );
  }
}
