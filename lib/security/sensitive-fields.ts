import type { DataSensitivityLevel } from "./data-sensitivity";

type FieldRule = {
  level: DataSensitivityLevel;
  patterns: RegExp[];
};

function normalizeFieldName(fieldName: string) {
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SAFE_METADATA_PATTERNS = [
  /(^|_)count$/,
  /(^|_)count_/,
  /(^|_)limit$/,
  /(^|_)status$/,
  /(^|_)role$/,
  /(^|_)roles$/,
  /(^|_)required_roles$/,
  /(^|_)reason$/,
  /(^|_)module$/,
  /(^|_)operation$/,
  /(^|_)route$/,
  /(^|_)method$/,
  /(^|_)source_type(s)?$/,
  /(^|_)source_status(es)?$/,
  /(^|_)tool_name(s)?$/,
  /(^|_)error_code$/,
  /(^|_)conversation_id$/,
  /(^|_)resource_id$/,
];

const FIELD_RULES: FieldRule[] = [
  {
    level: "secret",
    patterns: [
      /(^|_)password($|_)/,
      /(^|_)passcode($|_)/,
      /(^|_)api_key($|_)/,
      /(^|_)apikey($|_)/,
      /(^|_)access_token($|_)/,
      /(^|_)refresh_token($|_)/,
      /(^|_)token($|_)/,
      /(^|_)secret($|_)/,
      /(^|_)authorization($|_)/,
      /(^|_)bearer($|_)/,
      /(^|_)cookie($|_)/,
      /(^|_)credential(s)?($|_)/,
      /(^|_)smartcredit($|_)/,
      /smartcredit_credential/,
    ],
  },
  {
    level: "highly_sensitive",
    patterns: [
      /(^|_)ssn($|_)/,
      /(^|_)social_security($|_)/,
      /(^|_)ein($|_)/,
      /(^|_)tax_id($|_)/,
      /(^|_)passport($|_)/,
      /(^|_)government_id($|_)/,
      /(^|_)id_document($|_)/,
      /(^|_)bank_statement(s)?($|_)/,
      /(^|_)bank($|_)/,
      /(^|_)drive_url($|_)/,
      /(^|_)google_drive($|_)/,
      /(^|_)document_url($|_)/,
      /(^|_)private_url($|_)/,
      /(^|_)file_url($|_)/,
      /(^|_)url($|_)/,
      /(^|_)link($|_)/,
    ],
  },
  {
    level: "sensitive",
    patterns: [
      /(^|_)missing_document(s)?($|_)/,
      /(^|_)document(s)?_missing($|_)/,
      /(^|_)internal_note(s)?($|_)/,
      /(^|_)note(s)?($|_)/,
      /(^|_)prompt($|_)/,
      /(^|_)full_prompt($|_)/,
      /(^|_)ai_response($|_)/,
      /(^|_)model_response($|_)/,
      /(^|_)assistant_response($|_)/,
      /(^|_)full_response($|_)/,
      /(^|_)response($|_)/,
      /(^|_)answer($|_)/,
      /(^|_)message($|_)/,
      /(^|_)content($|_)/,
      /(^|_)chat($|_)/,
      /(^|_)conversation($|_)/,
      /(^|_)transcript($|_)/,
    ],
  },
  {
    level: "internal",
    patterns: [
      /(^|_)email($|_)/,
      /(^|_)phone($|_)/,
      /(^|_)telefono($|_)/,
      /(^|_)tel($|_)/,
      /(^|_)contact_id($|_)/,
      /(^|_)client_id($|_)/,
      /(^|_)service($|_)/,
      /(^|_)servicio($|_)/,
      /(^|_)recommended_service($|_)/,
      /(^|_)current_service($|_)/,
      /(^|_)stage($|_)/,
      /(^|_)pipeline($|_)/,
      /(^|_)etapa($|_)/,
      /(^|_)status($|_)/,
    ],
  },
  {
    level: "public_operational",
    patterns: [
      /(^|_)name($|_)/,
      /(^|_)nombre($|_)/,
      /(^|_)full_name($|_)/,
      /(^|_)contact_name($|_)/,
    ],
  },
];

export function classifyField(fieldName: string): DataSensitivityLevel {
  const normalized = normalizeFieldName(fieldName);

  if (!normalized) {
    return "internal";
  }

  if (SAFE_METADATA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "public_operational";
  }

  for (const rule of FIELD_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.level;
    }
  }

  return "internal";
}
