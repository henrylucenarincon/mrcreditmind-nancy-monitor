export const INTERNAL_ROLES = [
  "admin",
  "manager",
  "ops",
  "sales",
  "readonly",
] as const;

export type InternalRole = (typeof INTERNAL_ROLES)[number];

export const CONVERSATION_READER_ROLES: readonly InternalRole[] = INTERNAL_ROLES;

export function isInternalRole(value: unknown): value is InternalRole {
  return (
    typeof value === "string" &&
    INTERNAL_ROLES.includes(value as InternalRole)
  );
}
