import { buildCopilotResponse } from "./response-builder";
import type {
  CopilotIntent,
  CopilotOrchestratorInput,
  CopilotOrchestratorResult,
  CopilotResponse,
  CopilotToolResult,
} from "./types";
import { INTENT_HINTS } from "./prompts";
import { findClient } from "./tools/find-client";
import { findDriveFolderOrFile } from "./tools/find-drive-folder-or-file";
import { getClientDocuments } from "./tools/get-client-documents";
import { getClientOnboardingStatus } from "./tools/get-client-onboarding-status";
import { getClientSummary } from "./tools/get-client-summary";
import { getFundingStatus } from "./tools/get-funding-status";
import { searchInternalOperationalData } from "./tools/search-internal-operational-data";

type RouteKey =
  | "summary"
  | "client"
  | "onboarding"
  | "documents"
  | "drive_search"
  | "funding"
  | "operational";

const ROUTE_RULES: Record<RouteKey, { phrases: string[]; keywords: string[] }> = {
  summary: {
    phrases: [
      "resumen completo",
      "resumen del caso",
      "resume el caso",
      "panorama completo",
      "estado completo",
      "proximo paso",
      "próximo paso",
      "que recomiendas",
      "qué recomiendas",
    ],
    keywords: ["resumen", "resume", "panorama", "caso"],
  },
  client: {
    phrases: ["busca el cliente", "buscar cliente", "busca a", "perfil del cliente"],
    keywords: [...INTENT_HINTS.client_lookup],
  },
  onboarding: {
    phrases: ["revisa onboarding", "estado onboarding", "que le falta", "qué le falta"],
    keywords: [...INTENT_HINTS.onboarding_status],
  },
  documents: {
    phrases: ["documentos del cliente", "que documentos", "qué documentos", "documentos faltantes"],
    keywords: ["documento", "documentos"],
  },
  drive_search: {
    phrases: ["busca en drive", "carpeta de drive", "archivo de drive", "busca la carpeta", "busca el archivo"],
    keywords: ["drive", "archivo", "folder", "carpeta"],
  },
  funding: {
    phrases: ["estado funding", "monto aprobado", "revisa funding", "cualifica para funding"],
    keywords: [...INTENT_HINTS.funding, "monto", "aprobado"],
  },
  operational: {
    phrases: ["datos operativos", "busca datos", "reglas internas", "procedimiento interno"],
    keywords: [...INTENT_HINTS.operational_search],
  },
};

function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasWord(message: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(message);
}

function scoreRoute(message: string, route: RouteKey) {
  const rules = ROUTE_RULES[route];
  const phraseScore = rules.phrases.reduce(
    (score, phrase) => score + (message.includes(normalizeMessage(phrase)) ? 4 : 0),
    0
  );
  const keywordScore = rules.keywords.reduce(
    (score, keyword) => score + (hasWord(message, normalizeMessage(keyword)) ? 1 : 0),
    0
  );

  return phraseScore + keywordScore;
}

function getRouteScores(message: string) {
  const normalized = normalizeMessage(message);
  const identityScore =
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(normalized) || /\+?\d[\d\s().-]{7,}/.test(normalized) || /contactid\s*[:=]/.test(normalized)
      ? 3
      : 0;

  const scores = (Object.keys(ROUTE_RULES) as RouteKey[])
    .map((route) => ({
      route,
      score: scoreRoute(normalized, route) + (route === "client" ? identityScore : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scores;
}

function selectPrimaryIntent(routes: RouteKey[]): CopilotIntent {
  if (routes.includes("summary")) return "client_lookup";
  if (routes.includes("funding")) return "funding";
  if (routes.includes("onboarding")) return "onboarding_status";
  if (routes.includes("documents") || routes.includes("drive_search")) return "documents";
  if (routes.includes("operational")) return "operational_search";
  if (routes.includes("client")) return "client_lookup";
  return "general";
}

export function detectIntent(message: string): CopilotIntent {
  return selectPrimaryIntent(getRouteScores(message).map((item) => item.route));
}

async function runTools(
  intent: CopilotIntent,
  message: string
): Promise<Array<CopilotToolResult<unknown>>> {
  const routeScores = getRouteScores(message);
  const routes = routeScores.map((item) => item.route);
  if (intent === "general") {
    return [];
  }

  const client = await findClient(message);
  const clientId = client.data.id;
  const toolResults: Array<CopilotToolResult<unknown>> = [client];
  const shouldSummarize =
    routes.includes("summary") ||
    (routes.includes("client") && routes.length === 1);

  if (shouldSummarize) {
    toolResults.push(await getClientSummary(clientId));
  }

  if (routes.includes("onboarding")) {
    toolResults.push(await getClientOnboardingStatus(clientId));
  }

  if (routes.includes("documents")) {
    toolResults.push(await getClientDocuments(clientId));
  }

  if (routes.includes("drive_search")) {
    toolResults.push(await findDriveFolderOrFile(message));
  }

  if (routes.includes("funding") && !shouldSummarize) {
    toolResults.push(await getFundingStatus(clientId));
  }

  if (routes.includes("operational")) {
    toolResults.push(await searchInternalOperationalData(message));
  }

  if (toolResults.length === 1) {
    toolResults.push(await getClientSummary(clientId));
  }

  return toolResults;
}

export async function runCopilotOrchestrator(
  input: CopilotOrchestratorInput
): Promise<CopilotResponse> {
  const intent = detectIntent(input.message);
  const toolResults = await runTools(intent, input.message);
  const result: CopilotOrchestratorResult = {
    intent,
    toolResults,
  };

  return buildCopilotResponse(result);
}
