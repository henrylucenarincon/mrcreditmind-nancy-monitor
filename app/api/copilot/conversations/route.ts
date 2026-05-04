import { NextResponse } from "next/server";
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
  createCopilotConversation,
  listCopilotConversations,
} from "@/lib/copilot/history";
import {
  COPILOT_API_ROLES,
  logCopilotAccessDenied,
  logCopilotApiError,
  logCopilotEvent,
} from "@/lib/copilot/security";

export async function GET() {
  let auth: AuthorizedInternalUserContext | null = null;

  try {
    auth = await requireRole(COPILOT_API_ROLES);
    const conversations = await listCopilotConversations(auth.user.id);

    await logCopilotEvent({
      auth,
      action: "copilot.conversations.list.read",
      resourceType: "copilot_conversation",
      metadata: {
        limit: 50,
        resultCount: conversations.length,
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }

    if (isForbiddenError(error)) {
      await logCopilotAccessDenied({
        error,
        route: "/api/copilot/conversations",
        metadata: { method: "GET" },
      });

      return forbiddenResponse();
    }

    console.error("Error listando conversaciones Copilot:", error);
    await logCopilotApiError({
      auth,
      route: "/api/copilot/conversations",
      operation: "list_conversations",
      errorCode: "copilot_conversations_list_failed",
    });

    return NextResponse.json(
      { error: "No pudimos cargar el historial." },
      { status: 500 }
    );
  }
}

export async function POST() {
  let auth: AuthorizedInternalUserContext | null = null;

  try {
    auth = await requireRole(COPILOT_API_ROLES);
    const conversation = await createCopilotConversation(auth.user.id);

    await logCopilotEvent({
      auth,
      action: "copilot.conversation.created",
      resourceType: "copilot_conversation",
      resourceId: conversation.id,
      metadata: {
        status: "created",
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }

    if (isForbiddenError(error)) {
      await logCopilotAccessDenied({
        error,
        route: "/api/copilot/conversations",
        metadata: { method: "POST" },
      });

      return forbiddenResponse();
    }

    console.error("Error creando conversacion Copilot:", error);
    await logCopilotApiError({
      auth,
      route: "/api/copilot/conversations",
      operation: "create_conversation",
      errorCode: "copilot_conversation_create_failed",
    });

    return NextResponse.json(
      { error: "No pudimos crear la conversacion." },
      { status: 500 }
    );
  }
}
