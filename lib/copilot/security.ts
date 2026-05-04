import type {
  AuthorizedInternalUserContext,
  ForbiddenError,
} from "@/lib/auth/require-role";
import type { InternalRole } from "@/lib/auth/roles";
import { logSecurityEvent } from "@/lib/security/audit-log";
import type { CopilotResponse } from "./types";

export const COPILOT_API_ROLES: readonly InternalRole[] = [
  "admin",
  "manager",
  "ops",
  "sales",
];

type CopilotAuditMetadata = Record<string, unknown>;

export function getCopilotActorEmail(auth: AuthorizedInternalUserContext) {
  return auth.profile.email ?? auth.email;
}

export function getApproximateCharCount(value: string | null | undefined) {
  return value?.length ?? 0;
}

export function getCopilotResponseAuditMetadata(response: CopilotResponse) {
  return {
    sourceCount: response.sources.length,
    sourceTypes: [...new Set(response.sources.map((source) => source.type))],
    sourceStatuses: [...new Set(response.sources.map((source) => source.status))],
    cardCount: response.cards.length,
    actionCount: response.actions.length,
    contextCount: response.context.length,
  };
}

export async function logCopilotEvent(input: {
  auth: AuthorizedInternalUserContext;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: CopilotAuditMetadata;
}) {
  await logSecurityEvent({
    actorUserId: input.auth.user.id,
    actorEmail: getCopilotActorEmail(input.auth),
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: {
      role: input.auth.role,
      ...(input.metadata ?? {}),
    },
  });
}

export async function logCopilotAccessDenied(input: {
  error: ForbiddenError;
  route: string;
  metadata?: CopilotAuditMetadata;
}) {
  await logSecurityEvent({
    actorUserId: input.error.actorUserId,
    actorEmail: input.error.actorEmail,
    action: "internal_api.access_denied",
    resourceType: "api_route",
    resourceId: input.route,
    metadata: {
      module: "copilot",
      reason: input.error.reason,
      role: input.error.role,
      requiredRoles: COPILOT_API_ROLES,
      ...(input.metadata ?? {}),
    },
  });
}

export async function logCopilotApiError(input: {
  auth: AuthorizedInternalUserContext | null;
  route: string;
  operation: string;
  status?: number;
  errorCode?: string;
  resourceId?: string | null;
  metadata?: CopilotAuditMetadata;
}) {
  await logSecurityEvent({
    actorUserId: input.auth?.user.id ?? null,
    actorEmail: input.auth ? getCopilotActorEmail(input.auth) : null,
    action: "copilot.api.error",
    resourceType: "api_route",
    resourceId: input.resourceId ?? input.route,
    metadata: {
      route: input.route,
      operation: input.operation,
      status: input.status ?? 500,
      errorCode: input.errorCode ?? "internal_error",
      role: input.auth?.role ?? null,
      ...(input.metadata ?? {}),
    },
  });
}
