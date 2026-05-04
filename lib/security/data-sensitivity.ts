import type { InternalRole } from "@/lib/auth/roles";

export const DATA_SENSITIVITY_LEVELS = [
  "public_operational",
  "internal",
  "sensitive",
  "highly_sensitive",
  "secret",
] as const;

export type DataSensitivityLevel = (typeof DATA_SENSITIVITY_LEVELS)[number];

export type ExposurePurpose = "audit" | "display" | "model" | "storage";

export type ExposureContext = {
  purpose?: ExposurePurpose;
  sourceType?: string;
  allowSensitive?: boolean;
  allowHighlySensitive?: boolean;
};

export type MaskOptions = ExposureContext & {
  role?: InternalRole;
  fieldName?: string;
  revealFirst?: number;
  revealLast?: number;
};

export type MaskObjectOptions = {
  role?: InternalRole;
  context?: ExposureContext;
  maxDepth?: number;
  fieldClassifier?: (fieldName: string) => DataSensitivityLevel;
};

export const REDACTED_VALUES = {
  sensitive: "[redacted:sensitive]",
  highlySensitive: "[redacted:highly-sensitive]",
  secret: "[redacted:secret]",
  url: "[redacted:url]",
  driveUrl: "[redacted:drive-url]",
} as const;

