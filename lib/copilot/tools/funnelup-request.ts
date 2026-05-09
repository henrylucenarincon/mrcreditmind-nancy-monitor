import { hasFunnelUpConfig, requestFunnelUpApi } from "@/lib/funnelup/client";
import type { CopilotToolResult } from "../types";

const MAX_ARRAY_ITEMS = 10;

function limitArrays(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  if (Array.isArray(data)) return data.slice(0, MAX_ARRAY_ITEMS);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > MAX_ARRAY_ITEMS) {
      result[key] = value.slice(0, MAX_ARRAY_ITEMS);
      result[`${key}_total`] = value.length;
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function funnelupRequest(input: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
}): Promise<CopilotToolResult<unknown>> {
  if (!hasFunnelUpConfig()) {
    return {
      tool: "funnelup_request",
      source: { id: "funnelup-api", label: "FunnelUP API", type: "funnelup", status: "pending" },
      data: { error: "FunnelUP no configurado." },
    };
  }

  try {
    const result = await requestFunnelUpApi(input);
    return {
      tool: "funnelup_request",
      source: {
        id: `funnelup-${input.method.toLowerCase()}-${input.path.replace(/\//g, "-").replace(/^-|-$/g, "")}`,
        label: `FunnelUP ${input.method} ${input.path}`,
        type: "funnelup",
        status: result.ok ? "used" : "pending",
      },
      data: result.ok
        ? limitArrays(result.data)
        : { error: `FunnelUP respondió ${result.status}`, details: result.data },
    };
  } catch (error) {
    return {
      tool: "funnelup_request",
      source: { id: "funnelup-api-error", label: "FunnelUP API", type: "funnelup", status: "pending" },
      data: { error: error instanceof Error ? error.message : "Error inesperado." },
    };
  }
}
