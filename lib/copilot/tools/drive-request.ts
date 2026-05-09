import { hasGoogleDriveConfig, requestGoogleDriveApi } from "@/lib/google-drive/client";
import type { CopilotToolResult } from "../types";

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
        ? result.data
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
