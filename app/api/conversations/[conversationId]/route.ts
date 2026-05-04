import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  isForbiddenError,
  requireRole,
} from "@/lib/auth/require-role";
import {
  isAuthRequiredError,
  unauthorizedResponse,
} from "@/lib/auth/require-user";
import { CONVERSATION_READER_ROLES } from "@/lib/auth/roles";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { getSupabaseServer } from "@/lib/supabase-server";

type Params = Promise<{ conversationId: string }>;

export async function GET(
  _request: NextRequest,
  context: { params: Params }
) {
  try {
    const { conversationId } = await context.params;
    const auth = await requireRole(CONVERSATION_READER_ROLES);
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("conversations_log")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("message_timestamp", { ascending: true });

    if (error) {
      console.error("Supabase error /api/conversations/[conversationId]:", error);
      return NextResponse.json(
        { error: "Error cargando mensajes." },
        { status: 500 }
      );
    }

    await logSecurityEvent({
      actorUserId: auth.user.id,
      actorEmail: auth.profile.email ?? auth.email,
      action: "conversations.messages.read",
      resourceType: "conversation",
      resourceId: conversationId,
      metadata: {
        messageCount: data?.length ?? 0,
        role: auth.role,
      },
    });

    return NextResponse.json({ messages: data ?? [] });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }

    if (isForbiddenError(error)) {
      const { conversationId } = await context.params;

      await logSecurityEvent({
        actorUserId: error.actorUserId,
        actorEmail: error.actorEmail,
        action: "internal_api.access_denied",
        resourceType: "api_route",
        resourceId: `/api/conversations/${conversationId}`,
        metadata: {
          reason: error.reason,
          role: error.role,
          requiredRoles: CONVERSATION_READER_ROLES,
        },
      });

      return forbiddenResponse();
    }

    console.error("Server error /api/conversations/[conversationId]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
