import { getSupabaseServer } from "@/lib/supabase-server";

type SecurityAuditMetadata = Record<string, unknown>;

export type LogSecurityEventInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: SecurityAuditMetadata;
};

export async function logSecurityEvent(input: LogSecurityEventInput) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("security_audit_log").insert({
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("No pudimos registrar security_audit_log:", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("No pudimos registrar evento de seguridad:", error);
  }
}
