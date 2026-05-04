import type { CopilotSource, CopilotToolResult } from "./types";
import { findClient } from "./tools/find-client";
import { findDriveFolderOrFile } from "./tools/find-drive-folder-or-file";
import { getClientDocuments } from "./tools/get-client-documents";
import { getClientOnboardingStatus } from "./tools/get-client-onboarding-status";
import { getClientSummary } from "./tools/get-client-summary";
import { getFundingStatus } from "./tools/get-funding-status";
import { searchInternalOperationalData } from "./tools/search-internal-operational-data";
import { isCopilotToolName, type CopilotToolName } from "./tool-registry";

type ToolArguments = Record<string, unknown>;

export type ExecutedCopilotTool = {
  name: string;
  result: CopilotToolResult<unknown>;
};

function getStringArg(args: ToolArguments, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function buildToolErrorResult(tool: string, message: string): CopilotToolResult<{ error: string }> {
  const source: CopilotSource = {
    id: `${tool.replace(/_/g, "-")}-error`,
    label: `${tool} error`,
    type: "internal",
    status: "pending",
  };

  return {
    tool,
    source,
    data: { error: message },
  };
}

async function executeKnownTool(
  name: CopilotToolName,
  args: ToolArguments
): Promise<CopilotToolResult<unknown>> {
  if (name === "find_client") {
    const query = getStringArg(args, "query");
    if (!query) return buildToolErrorResult(name, "Falta query para buscar el cliente.");
    return findClient(query);
  }

  if (name === "get_client_summary") {
    const clientId = getStringArg(args, "clientId");
    if (!clientId) return buildToolErrorResult(name, "Falta clientId para resumir el cliente.");
    return getClientSummary(clientId);
  }

  if (name === "get_client_onboarding_status") {
    const clientId = getStringArg(args, "clientId");
    if (!clientId) return buildToolErrorResult(name, "Falta clientId para revisar onboarding.");
    return getClientOnboardingStatus(clientId);
  }

  if (name === "get_client_documents") {
    const clientId = getStringArg(args, "clientId");
    if (!clientId) return buildToolErrorResult(name, "Falta clientId para buscar documentos.");
    return getClientDocuments(clientId);
  }

  if (name === "find_drive_folder_or_file") {
    const query = getStringArg(args, "query");
    if (!query) return buildToolErrorResult(name, "Falta query para buscar en Drive.");
    return findDriveFolderOrFile(query);
  }

  if (name === "get_funding_status") {
    const clientId = getStringArg(args, "clientId");
    if (!clientId) return buildToolErrorResult(name, "Falta clientId para revisar funding.");
    return getFundingStatus(clientId);
  }

  const query = getStringArg(args, "query");
  if (!query) return buildToolErrorResult(name, "Falta query para buscar datos operativos.");
  return searchInternalOperationalData(query);
}

export async function executeCopilotTool(
  name: string,
  args: ToolArguments
): Promise<ExecutedCopilotTool> {
  if (!isCopilotToolName(name)) {
    return {
      name,
      result: buildToolErrorResult(name, "La herramienta solicitada no existe."),
    };
  }

  try {
    return {
      name,
      result: await executeKnownTool(name, args),
    };
  } catch (error) {
    console.error(
      `Error ejecutando tool ${name}:`,
      error instanceof Error ? error.message : error
    );

    return {
      name,
      result: buildToolErrorResult(
        name,
        error instanceof Error ? error.message : "La herramienta fallo de forma inesperada."
      ),
    };
  }
}
