export const COPILOT_TOOL_NAMES = [
  "funnelup_request",
  "drive_request",
] as const;

export type CopilotToolName = (typeof COPILOT_TOOL_NAMES)[number];

export type AnthropicTool = {
  name: CopilotToolName;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
};

export const COPILOT_ANTHROPIC_TOOLS: AnthropicTool[] = [
  {
    name: "funnelup_request",
    description:
      "Llama cualquier endpoint de la API de FunnelUP / LeadConnector. Usa GET para leer contactos, conversaciones, oportunidades, pipelines, notas y tareas. Usa POST/PUT/PATCH para crear o actualizar. El locationId se inyecta automaticamente.",
    input_schema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          description: "Metodo HTTP.",
        },
        path: {
          type: "string",
          description:
            "Ruta del endpoint. Ejemplos: /contacts/, /contacts/{id}, /contacts/{id}/notes, /conversations/, /opportunities/search/, /opportunities/pipelines/",
        },
        params: {
          type: "object",
          description: "Query params opcionales como strings. El locationId se agrega automaticamente en GET.",
          additionalProperties: { type: "string" },
        },
        body: {
          type: "object",
          description: "Body para POST/PUT/PATCH como objeto JSON.",
          additionalProperties: true,
        },
      },
      required: ["method", "path"],
    },
  },
  {
    name: "drive_request",
    description:
      "Llama la API de Google Drive. Lista, busca, lee y crea archivos y carpetas. Para leer contenido de un archivo usa GET /files/{id} con params alt=media. Para exportar un Google Doc como texto usa GET /files/{id}/export con params mimeType=text/plain.",
    input_schema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PATCH", "DELETE"],
          description: "Metodo HTTP.",
        },
        endpoint: {
          type: "string",
          description:
            "Endpoint de la API de Drive. Ejemplos: /files, /files/{id}, /files/{id}/export, /files/{id}/permissions",
        },
        params: {
          type: "object",
          description:
            "Query params como strings. Ejemplos: q para buscar, fields para proyectar campos, alt=media para descargar contenido, mimeType para exportar.",
          additionalProperties: { type: "string" },
        },
        body: {
          type: "object",
          description: "Body para POST/PATCH.",
          additionalProperties: true,
        },
      },
      required: ["method", "endpoint"],
    },
  },
];

export function isCopilotToolName(value: string): value is CopilotToolName {
  return COPILOT_TOOL_NAMES.includes(value as CopilotToolName);
}
