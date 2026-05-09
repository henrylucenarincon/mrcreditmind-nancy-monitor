import type { CopilotToolResult } from "./types";
import { funnelupRequest } from "./tools/funnelup-request";
import { driveRequest } from "./tools/drive-request";
import { readSpreadsheet } from "./tools/read-spreadsheet";
import { isCopilotToolName, type CopilotToolName } from "./tool-registry";
import { sanitizeErrorForLog } from "@/lib/security/masking";

type ToolArguments = Record<string, unknown>;

export type ExecutedCopilotTool = {
  name: string;
  result: CopilotToolResult<unknown>;
};

function getString(args: ToolArguments, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function getObject(args: ToolArguments, key: string): Record<string, unknown> | undefined {
  const value = args[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getStringRecord(args: ToolArguments, key: string): Record<string, string> | undefined {
  const value = getObject(args, key);
  if (!value) return undefined;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") result[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") result[k] = String(v);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function buildErrorResult(tool: string, message: string): CopilotToolResult<{ error: string }> {
  return {
    tool,
    source: { id: `${tool}-error`, label: tool, type: "internal", status: "pending" },
    data: { error: message },
  };
}

async function executeKnownTool(
  name: CopilotToolName,
  args: ToolArguments
): Promise<CopilotToolResult<unknown>> {
  if (name === "funnelup_request") {
    const method = getString(args, "method") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const path = getString(args, "path");
    if (!method || !path) return buildErrorResult(name, "Faltan method y path.");
    return funnelupRequest({ method, path, params: getStringRecord(args, "params"), body: getObject(args, "body") });
  }

  if (name === "drive_request") {
    const method = getString(args, "method") as "GET" | "POST" | "PATCH" | "DELETE";
    const endpoint = getString(args, "endpoint");
    if (!method || !endpoint) return buildErrorResult(name, "Faltan method y endpoint.");
    return driveRequest({ method, endpoint, params: getStringRecord(args, "params"), body: getObject(args, "body") });
  }

  if (name === "read_spreadsheet") {
    const fileId = getString(args, "fileId");
    if (!fileId) return buildErrorResult(name, "Falta fileId.");
    return readSpreadsheet(fileId);
  }

  return buildErrorResult(name, "Herramienta no reconocida.");
}

export async function executeCopilotTool(
  name: string,
  args: ToolArguments
): Promise<ExecutedCopilotTool> {
  if (!isCopilotToolName(name)) {
    return { name, result: buildErrorResult(name, "La herramienta solicitada no existe.") };
  }

  try {
    return { name, result: await executeKnownTool(name, args) };
  } catch (error) {
    console.error(`Error ejecutando tool ${name}:`, sanitizeErrorForLog(error));
    return {
      name,
      result: buildErrorResult(name, error instanceof Error ? error.message : "La herramienta falló inesperadamente."),
    };
  }
}
