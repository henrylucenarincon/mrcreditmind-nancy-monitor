import type { InternalRole } from "@/lib/auth/roles";
import {
  REDACTED_VALUES,
  type DataSensitivityLevel,
  type ExposureContext,
  type MaskObjectOptions,
  type MaskOptions,
} from "./data-sensitivity";
import { classifyField } from "./sensitive-fields";

const DEFAULT_ROLE: InternalRole = "readonly";
const DEFAULT_MAX_DEPTH = 6;

const DRIVE_URL_PATTERN = /\bhttps?:\/\/(?:drive|docs)\.google\.com\/[^\s"')]+/gi;
const URL_PATTERN = /\bhttps?:\/\/[^\s"')]+/gi;
const SSN_PATTERN = /\b(\d{3})-(\d{2})-(\d{4})\b/g;
const EIN_PATTERN = /\b(\d{2})-(\d{3})(\d{4})\b/g;
const EMAIL_PATTERN = /\b([A-Z0-9._%+-])([A-Z0-9._%+-]*)(@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const OPENAI_KEY_PATTERN = /\bsk-[A-Za-z0-9_-]{12,}\b/g;
const GOOGLE_KEY_PATTERN = /\bAIza[A-Za-z0-9_-]{20,}\b/g;
const KEY_VALUE_SECRET_PATTERN =
  /\b(password|passwd|api[_-]?key|token|secret|authorization|credential|credentials)\b\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDriveUrl(value: string) {
  return /\bhttps?:\/\/(?:drive|docs)\.google\.com\//i.test(value);
}

function hasSecretToken(value: string) {
  return (
    JWT_PATTERN.test(value) ||
    OPENAI_KEY_PATTERN.test(value) ||
    GOOGLE_KEY_PATTERN.test(value) ||
    KEY_VALUE_SECRET_PATTERN.test(value) ||
    BEARER_PATTERN.test(value)
  );
}

function resetStatefulPatterns() {
  JWT_PATTERN.lastIndex = 0;
  OPENAI_KEY_PATTERN.lastIndex = 0;
  GOOGLE_KEY_PATTERN.lastIndex = 0;
  KEY_VALUE_SECRET_PATTERN.lastIndex = 0;
  BEARER_PATTERN.lastIndex = 0;
}

function maskEmail(value: string) {
  return value.replace(EMAIL_PATTERN, (_match, first: string, _rest: string, domain: string) => {
    return `${first.toLowerCase()}***${domain.toLowerCase()}`;
  });
}

function maskPhone(value: string) {
  return value.replace(PHONE_PATTERN, (match) => {
    const digits = match.replace(/\D/g, "");

    if (digits.length < 8) {
      return match;
    }

    const lastFour = digits.slice(-4);
    return `${"*".repeat(Math.max(8, digits.length - 4))}${lastFour}`;
  });
}

function maskSsn(value: string) {
  return value.replace(SSN_PATTERN, "***-**-$3");
}

function maskEin(value: string) {
  return value.replace(EIN_PATTERN, "**-***$3");
}

function maskGenericString(value: string, revealFirst = 1, revealLast = 4) {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return "";
  }

  if (normalized.length <= revealFirst + revealLast + 2) {
    return `${normalized.slice(0, 1)}***`;
  }

  return `${normalized.slice(0, revealFirst)}***${normalized.slice(-revealLast)}`;
}

function maskInternalString(value: string, fieldName?: string) {
  const normalizedField = fieldName?.toLowerCase() ?? "";

  if (EMAIL_PATTERN.test(value) || normalizedField.includes("email")) {
    EMAIL_PATTERN.lastIndex = 0;
    return maskEmail(value);
  }

  if (
    PHONE_PATTERN.test(value) ||
    normalizedField.includes("phone") ||
    normalizedField.includes("telefono")
  ) {
    PHONE_PATTERN.lastIndex = 0;
    return maskPhone(value);
  }

  PHONE_PATTERN.lastIndex = 0;
  return redactSecretsFromText(value);
}

function inferLevelFromValue(value: unknown): DataSensitivityLevel {
  if (typeof value !== "string") {
    return "public_operational";
  }

  resetStatefulPatterns();

  if (hasSecretToken(value)) {
    resetStatefulPatterns();
    return "secret";
  }

  resetStatefulPatterns();

  if (hasDriveUrl(value) || SSN_PATTERN.test(value) || EIN_PATTERN.test(value)) {
    SSN_PATTERN.lastIndex = 0;
    EIN_PATTERN.lastIndex = 0;
    return "highly_sensitive";
  }

  SSN_PATTERN.lastIndex = 0;
  EIN_PATTERN.lastIndex = 0;

  if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value)) {
    EMAIL_PATTERN.lastIndex = 0;
    PHONE_PATTERN.lastIndex = 0;
    return "internal";
  }

  EMAIL_PATTERN.lastIndex = 0;
  PHONE_PATTERN.lastIndex = 0;

  return "public_operational";
}

function canViewInternal(role: InternalRole) {
  return role === "admin" || role === "manager" || role === "ops" || role === "sales";
}

function canViewSensitive(role: InternalRole, context: ExposureContext) {
  return (
    role === "admin" ||
    role === "manager" ||
    (role === "ops" && context.allowSensitive === true)
  );
}

function canViewHighlySensitive(role: InternalRole, context: ExposureContext) {
  return (
    (role === "admin" || role === "manager") &&
    context.allowHighlySensitive === true
  );
}

export function redactSecretsFromText(text: string): string {
  resetStatefulPatterns();

  return text
    .replace(DRIVE_URL_PATTERN, REDACTED_VALUES.driveUrl)
    .replace(BEARER_PATTERN, "Bearer [redacted:secret]")
    .replace(KEY_VALUE_SECRET_PATTERN, "$1=[redacted:secret]")
    .replace(JWT_PATTERN, REDACTED_VALUES.secret)
    .replace(OPENAI_KEY_PATTERN, REDACTED_VALUES.secret)
    .replace(GOOGLE_KEY_PATTERN, REDACTED_VALUES.secret)
    .replace(SSN_PATTERN, "***-**-$3")
    .replace(EIN_PATTERN, "**-***$3")
    .replace(EMAIL_PATTERN, (_match, first: string, _rest: string, domain: string) => {
      return `${first.toLowerCase()}***${domain.toLowerCase()}`;
    })
    .replace(PHONE_PATTERN, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 8) return match;
      return `${"*".repeat(Math.max(8, digits.length - 4))}${digits.slice(-4)}`;
    })
    .replace(URL_PATTERN, REDACTED_VALUES.url);
}

export function shouldExposeField(
  fieldName: string,
  role: InternalRole,
  context: ExposureContext = {}
) {
  const level = classifyField(fieldName);

  if (level === "public_operational") return true;
  if (level === "internal") return canViewInternal(role);
  if (level === "sensitive") return canViewSensitive(role, context);
  if (level === "highly_sensitive") return canViewHighlySensitive(role, context);

  return false;
}

export function maskValue(
  value: unknown,
  level: DataSensitivityLevel,
  options: MaskOptions = {}
): unknown {
  const role = options.role ?? DEFAULT_ROLE;
  const purpose = options.purpose ?? "display";
  const fieldName = options.fieldName;

  if (value === null || value === undefined) {
    return value;
  }

  if (level === "secret") {
    return REDACTED_VALUES.secret;
  }

  const text = typeof value === "string" ? value : String(value);

  if (level === "highly_sensitive") {
    if (hasDriveUrl(text) || fieldName?.toLowerCase().includes("drive")) {
      return REDACTED_VALUES.driveUrl;
    }

    if (!canViewHighlySensitive(role, options)) {
      return REDACTED_VALUES.highlySensitive;
    }

    if (SSN_PATTERN.test(text)) {
      SSN_PATTERN.lastIndex = 0;
      return maskSsn(text);
    }

    SSN_PATTERN.lastIndex = 0;

    if (EIN_PATTERN.test(text)) {
      EIN_PATTERN.lastIndex = 0;
      return maskEin(text);
    }

    EIN_PATTERN.lastIndex = 0;

    return maskGenericString(redactSecretsFromText(text), 1, 4);
  }

  if (level === "sensitive") {
    if (purpose === "audit" || !canViewSensitive(role, options)) {
      return REDACTED_VALUES.sensitive;
    }

    return maskGenericString(redactSecretsFromText(text), options.revealFirst ?? 2, options.revealLast ?? 6);
  }

  if (level === "internal") {
    if (!canViewInternal(role)) {
      return maskGenericString(redactSecretsFromText(text), options.revealFirst ?? 1, options.revealLast ?? 4);
    }

    return maskInternalString(text, fieldName);
  }

  return typeof value === "string" ? redactSecretsFromText(value) : value;
}

function maskAny(
  value: unknown,
  fieldName: string | undefined,
  options: Required<Pick<MaskObjectOptions, "role" | "maxDepth">> &
    Pick<MaskObjectOptions, "context" | "fieldClassifier">,
  depth: number
): unknown {
  const classifier = options.fieldClassifier ?? classifyField;
  const context = options.context ?? {};
  const level = fieldName ? classifier(fieldName) : inferLevelFromValue(value);

  if (depth > options.maxDepth) {
    return "[redacted:max-depth]";
  }

  if (
    fieldName &&
    (level === "secret" ||
      level === "highly_sensitive" ||
      (level === "sensitive" && context.purpose === "audit"))
  ) {
    return maskValue(value, level, {
      ...context,
      role: options.role,
      fieldName,
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskAny(item, fieldName, options, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        maskAny(item, key, options, depth + 1),
      ])
    );
  }

  return maskValue(value, level, {
    ...context,
    role: options.role,
    fieldName,
  });
}

export function maskObject<T>(input: T, options: MaskObjectOptions = {}): T {
  return maskAny(
    input,
    undefined,
    {
      role: options.role ?? DEFAULT_ROLE,
      context: options.context ?? {},
      maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
      fieldClassifier: options.fieldClassifier,
    },
    0
  ) as T;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  return maskObject(metadata ?? {}, {
    role: "readonly",
    context: {
      purpose: "audit",
    },
  });
}

export function sanitizeErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactSecretsFromText(error.message),
    };
  }

  if (typeof error === "string") {
    return redactSecretsFromText(error);
  }

  return "[redacted:error]";
}
