import { NextResponse } from "next/server";
import { requireUser, type AuthenticatedUserContext } from "./require-user";
import { isInternalRole, type InternalRole } from "./roles";

export type InternalUserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: InternalRole;
  is_active: boolean;
};

export type AuthorizedInternalUserContext = AuthenticatedUserContext & {
  profile: InternalUserProfile;
  role: InternalRole;
};

type ForbiddenReason =
  | "missing_internal_profile"
  | "inactive_internal_profile"
  | "invalid_internal_role"
  | "role_not_allowed";

export class ForbiddenError extends Error {
  status = 403 as const;
  actorUserId: string | null;
  actorEmail: string | null;
  role: string | null;
  reason: ForbiddenReason;

  constructor(input: {
    actorUserId: string | null;
    actorEmail: string | null;
    role?: string | null;
    reason: ForbiddenReason;
  }) {
    super("No autorizado.");
    this.name = "ForbiddenError";
    this.actorUserId = input.actorUserId;
    this.actorEmail = input.actorEmail;
    this.role = input.role ?? null;
    this.reason = input.reason;
  }
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "No autorizado." }, { status: 403 });
}

export async function requireRole(
  allowedRoles: readonly InternalRole[]
): Promise<AuthorizedInternalUserContext> {
  const auth = await requireUser();
  const { data, error } = await auth.supabase
    .from("internal_user_profiles")
    .select("id,email,full_name,role,is_active")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profile = data as {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
  } | null;

  if (!profile) {
    throw new ForbiddenError({
      actorUserId: auth.user.id,
      actorEmail: auth.email,
      reason: "missing_internal_profile",
    });
  }

  if (!profile.is_active) {
    throw new ForbiddenError({
      actorUserId: auth.user.id,
      actorEmail: profile.email ?? auth.email,
      role: profile.role,
      reason: "inactive_internal_profile",
    });
  }

  if (!isInternalRole(profile.role)) {
    throw new ForbiddenError({
      actorUserId: auth.user.id,
      actorEmail: profile.email ?? auth.email,
      role: profile.role,
      reason: "invalid_internal_role",
    });
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new ForbiddenError({
      actorUserId: auth.user.id,
      actorEmail: profile.email ?? auth.email,
      role: profile.role,
      reason: "role_not_allowed",
    });
  }

  return {
    ...auth,
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      is_active: profile.is_active,
    },
    role: profile.role,
  };
}
