import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const auth = await requireRole(CONVERSATION_READER_ROLES);
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("conversations_summary")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Supabase error /api/conversations:", error);
      return NextResponse.json(
        { error: "Error cargando conversaciones." },
        { status: 500 }
      );
    }

    await logSecurityEvent({
      actorUserId: auth.user.id,
      actorEmail: auth.profile.email ?? auth.email,
      action: "conversations.list.read",
      resourceType: "conversation",
      metadata: {
        limit: 100,
        resultCount: data?.length ?? 0,
        role: auth.role,
      },
    });

    return NextResponse.json({ conversations: data ?? [] });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return unauthorizedResponse();
    }

    if (isForbiddenError(error)) {
      await logSecurityEvent({
        actorUserId: error.actorUserId,
        actorEmail: error.actorEmail,
        action: "internal_api.access_denied",
        resourceType: "api_route",
        resourceId: "/api/conversations",
        metadata: {
          reason: error.reason,
          role: error.role,
          requiredRoles: CONVERSATION_READER_ROLES,
        },
      });

      return forbiddenResponse();
    }

    console.error("Server error /api/conversations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
