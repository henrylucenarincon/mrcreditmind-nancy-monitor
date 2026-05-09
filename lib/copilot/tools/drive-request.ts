import { hasGoogleDriveConfig, requestGoogleDriveApi } from "@/lib/google-drive/client";
import type { CopilotToolResult } from "../types";

const MAX_FILES = 15;

function limitFiles(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.files) && obj.files.length > MAX_FILES) {
    return { ...obj, files: obj.files.slice(0, MAX_FILES), files_total: obj.files.length };
  }
  return data;
}

export async function driveRequest(input: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  endpoint: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
}): Promise<CopilotToolResult<unknown>> {
  if (!hasGoogleDriveConfig()) {
    return {
      tool: "drive_request",
      source: { id: "drive-api", label: "Google Drive API", type: "drive", status: "pending" },
      data: { error: "Google Drive no configurado." },
    };
  }

  try {
    const result = await requestGoogleDriveApi(input);
    return {
      tool: "drive_request",
      source: {
        id: `drive-${input.method.toLowerCase()}-${input.endpoint.replace(/\//g, "-").replace(/^-|-$/g, "")}`,
        label: `Drive ${input.method} ${input.endpoint}`,
        type: "drive",
        status: result.ok ? "used" : "pending",
      },
      data: result.ok
        ? limitFiles(result.data)
        : { error: `Google Drive respondió ${result.status}`, details: result.data },
    };
  } catch (error) {
    return {
      tool: "drive_request",
      source: { id: "drive-api-error", label: "Google Drive API", type: "drive", status: "pending" },
      data: { error: error instanceof Error ? error.message : "Error inesperado." },
    };
  }
}
