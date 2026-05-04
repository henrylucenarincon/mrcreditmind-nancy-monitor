export const COPILOT_TOOL_NAMES = [
  "find_client",
  "get_client_summary",
  "get_client_onboarding_status",
  "get_client_documents",
  "find_drive_folder_or_file",
  "get_funding_status",
  "search_internal_operational_data",
] as const;

export type CopilotToolName = (typeof COPILOT_TOOL_NAMES)[number];

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export type OpenAIFunctionTool = {
  type: "function";
  name: CopilotToolName;
  description: string;
  parameters: JsonSchema;
  strict: true;
};

function querySchema(description: string): JsonSchema {
  return {
    type: "object",
    properties: {
      query: {
        type: "string",
        description,
      },
    },
    required: ["query"],
    additionalProperties: false,
  };
}

function clientIdSchema(description: string): JsonSchema {
  return {
    type: "object",
    properties: {
      clientId: {
        type: "string",
        description,
      },
    },
    required: ["clientId"],
    additionalProperties: false,
  };
}

export const COPILOT_OPENAI_TOOLS: OpenAIFunctionTool[] = [
  {
    type: "function",
    name: "find_client",
    description:
      "Busca un lead o cliente en FunnelUp usando nombre, email, telefono, contactId o texto del usuario. Usala antes de herramientas que requieren clientId.",
    parameters: querySchema("Nombre, email, telefono, contactId o texto de busqueda del cliente."),
    strict: true,
  },
  {
    type: "function",
    name: "get_client_summary",
    description:
      "Obtiene un resumen consolidado del cliente e intenta agregar onboarding, documentos, funding y datos operativos cuando las fuentes estan disponibles.",
    parameters: clientIdSchema("ID del cliente encontrado previamente en FunnelUp."),
    strict: true,
  },
  {
    type: "function",
    name: "get_client_onboarding_status",
    description:
      "Revisa el estado de onboarding, items pendientes y documentos faltantes de un cliente.",
    parameters: clientIdSchema("ID del cliente encontrado previamente en FunnelUp."),
    strict: true,
  },
  {
    type: "function",
    name: "get_client_documents",
    description:
      "Busca documentos del cliente en Google Drive, incluyendo disponibles, faltantes o por revisar.",
    parameters: clientIdSchema("ID del cliente encontrado previamente en FunnelUp."),
    strict: true,
  },
  {
    type: "function",
    name: "find_drive_folder_or_file",
    description:
      "Busca carpetas o archivos en Google Drive a partir del texto del usuario, nombre del cliente, email o descripcion del recurso.",
    parameters: querySchema("Texto de busqueda para Google Drive."),
    strict: true,
  },
  {
    type: "function",
    name: "get_funding_status",
    description:
      "Busca el estado de funding del cliente en Google Sheets, incluyendo monto, etapa, notas y bloqueos.",
    parameters: clientIdSchema("ID del cliente encontrado previamente en FunnelUp."),
    strict: true,
  },
  {
    type: "function",
    name: "search_internal_operational_data",
    description:
      "Busca datos operativos internos en Google Sheets cuando el usuario pregunta por reglas, reportes, procesos, estado operativo o informacion cruzada.",
    parameters: querySchema("Texto de busqueda operativa."),
    strict: true,
  },
];

export function isCopilotToolName(value: string): value is CopilotToolName {
  return COPILOT_TOOL_NAMES.includes(value as CopilotToolName);
}
