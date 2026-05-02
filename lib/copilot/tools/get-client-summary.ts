import type {
  ClientDocument,
  ClientSummary,
  CopilotSource,
  CopilotToolResult,
  FundingStatus,
  OnboardingStatus,
  OperationalDataResult,
} from "../types";
import {
  formatFunnelUpContactName,
  getFunnelUpContactById,
  getFunnelUpContactUrl,
  hasFunnelUpConfig,
} from "@/lib/funnelup/client";
import type { FunnelUpContact, FunnelUpCustomField } from "@/lib/funnelup/types";

export async function getClientSummary(
  clientId: string
): Promise<CopilotToolResult<ClientSummary>> {
  if (!hasFunnelUpConfig() || clientId.startsWith("funnelup_")) {
    return buildPendingSummary(clientId, "FunnelUp pendiente de configuracion");
  }

  try {
    const contact = await getFunnelUpContactById(clientId);

    if (!contact) {
      return buildPendingSummary(clientId, "Contacto no encontrado en FunnelUp");
    }

    const summary = buildSummaryFromContact(contact);
    const consolidated = await buildConsolidatedSummary(clientId, summary);

    return {
      tool: "get-client-summary",
      source: {
        id: "consolidated-client-summary",
        label: "Consolidated client summary",
        type: "internal",
        status: "used",
      },
      data: {
        ...summary,
        consolidated,
        nextBestStep: buildConsolidatedNextStep(summary, consolidated),
        lastSignal: buildConsolidatedLastSignal(summary, consolidated),
      },
    };
  } catch (error) {
    console.error(
      "Error construyendo resumen de FunnelUp:",
      error instanceof Error ? error.message : error
    );

    return buildPendingSummary(clientId, "No se pudo leer el resumen de FunnelUp");
  }
}

function buildPendingSummary(clientId: string, reason: string): CopilotToolResult<ClientSummary> {
  return {
    tool: "get-client-summary",
    source: {
      id: "funnelup-client-summary-pending",
      label: "FunnelUp client summary pending",
      type: "funnelup",
      status: "pending",
    },
    data: {
      clientId,
      recommendedService: "No definido",
      intentLevel: "medium",
      lastSignal: reason,
      nextBestStep: "Validar conexion de FunnelUp y volver a consultar el cliente.",
      status: reason,
      consolidated: {
        sources: ["FunnelUp"],
        partialNotes: [reason],
      },
    },
  };
}

async function safeTool<T>(
  label: string,
  run: () => Promise<CopilotToolResult<T>>
): Promise<CopilotToolResult<T> | null> {
  try {
    return await run();
  } catch (error) {
    console.error(
      `Error consolidando ${label}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function buildConsolidatedSummary(
  clientId: string,
  baseSummary: ClientSummary
): Promise<NonNullable<ClientSummary["consolidated"]>> {
  const [
    { getClientOnboardingStatus },
    { getClientDocuments },
    { getFundingStatus },
    { searchInternalOperationalData },
  ] = await Promise.all([
    import("./get-client-onboarding-status"),
    import("./get-client-documents"),
    import("./get-funding-status"),
    import("./search-internal-operational-data"),
  ]);
  const [onboardingResult, documentsResult, fundingResult, operationsResult] =
    await Promise.all([
      safeTool("onboarding", () => getClientOnboardingStatus(clientId)),
      safeTool("documentos", () => getClientDocuments(clientId)),
      safeTool("funding", () => getFundingStatus(clientId)),
      safeTool("operaciones", () =>
        searchInternalOperationalData(
          [
            baseSummary.name,
            baseSummary.email,
            baseSummary.phone,
            clientId,
            baseSummary.recommendedService,
          ]
            .filter(Boolean)
            .join(" ")
        )
      ),
    ]);

  const sources = [
    "FunnelUp",
    sourceLabel(onboardingResult?.source),
    sourceLabel(documentsResult?.source),
    sourceLabel(fundingResult?.source),
    sourceLabel(operationsResult?.source),
  ].filter((source): source is string => Boolean(source));
  const partialNotes = [
    ...partialSourceNote(onboardingResult?.source, "Onboarding parcial o no disponible"),
    ...partialSourceNote(documentsResult?.source, "Documentos parciales o no disponibles"),
    ...partialSourceNote(fundingResult?.source, "Funding parcial o no disponible"),
    ...partialSourceNote(operationsResult?.source, "Datos operativos parciales o no disponibles"),
  ];

  return {
    identity: {
      name: baseSummary.name,
      email: baseSummary.email,
      phone: baseSummary.phone,
      contactUrl: baseSummary.contactUrl,
    },
    onboarding: onboardingResult
      ? mapOnboarding(onboardingResult.data)
      : undefined,
    documents: documentsResult
      ? mapDocuments(documentsResult.data)
      : undefined,
    funding: fundingResult
      ? mapFunding(fundingResult.data)
      : undefined,
    operations: operationsResult
      ? mapOperations(operationsResult.data)
      : undefined,
    sources: [...new Set(sources)],
    partialNotes,
  };
}

function sourceLabel(source: CopilotSource | undefined) {
  if (!source) return "";
  return source.label;
}

function partialSourceNote(source: CopilotSource | undefined, note: string) {
  if (!source || source.status === "used") return [];
  return [note];
}

function mapOnboarding(data: OnboardingStatus): NonNullable<NonNullable<ClientSummary["consolidated"]>["onboarding"]> {
  return {
    status: data.onboardingStatus || data.status,
    missingItems: data.missingItems,
    notes: data.notes ?? [],
    source: data.sourceUsed || "FunnelUp",
  };
}

function mapDocuments(data: ClientDocument[]): NonNullable<NonNullable<ClientSummary["consolidated"]>["documents"]> {
  return {
    found: data.filter((item) => item.status === "available").map((item) => item.name),
    needsReview: data.filter((item) => item.status === "needs_review").map((item) => item.name),
    missing: data.filter((item) => item.status === "missing").map((item) => item.name),
    notes: data.flatMap((item) => item.notes ?? []),
    source: data[0]?.sourceUsed || "Google Drive",
  };
}

function mapFunding(data: FundingStatus): NonNullable<NonNullable<ClientSummary["consolidated"]>["funding"]> {
  return {
    status: data.fundingStatus || data.eligibility,
    approvedAmount: data.approvedAmount,
    stage: data.stage,
    notes: data.notes,
    blockers: data.blockers,
    source: data.sourceUsed || "Google Sheets",
  };
}

function mapOperations(data: OperationalDataResult): NonNullable<NonNullable<ClientSummary["consolidated"]>["operations"]> {
  return {
    summary: data.summary || `${data.matches.length} hallazgos operativos`,
    matches: data.matches.slice(0, 5).map((match) => `${match.title}: ${match.excerpt}`),
    notes: data.notes ?? [],
    source: data.sourceUsed || "Google Sheets",
  };
}

function buildConsolidatedLastSignal(
  baseSummary: ClientSummary,
  consolidated: NonNullable<ClientSummary["consolidated"]>
) {
  if (consolidated.funding?.status && consolidated.funding.status !== "No disponible") {
    return `Funding: ${consolidated.funding.status}`;
  }

  if (consolidated.onboarding?.status && consolidated.onboarding.status !== "No disponible") {
    return `Onboarding: ${consolidated.onboarding.status}`;
  }

  return baseSummary.lastSignal;
}

function buildConsolidatedNextStep(
  baseSummary: ClientSummary,
  consolidated: NonNullable<ClientSummary["consolidated"]>
) {
  if (consolidated.documents?.missing.length) {
    return `Pedir documentos faltantes: ${consolidated.documents.missing.join(", ")}.`;
  }

  if (consolidated.onboarding?.missingItems.length) {
    return `Completar onboarding: ${consolidated.onboarding.missingItems.join(", ")}.`;
  }

  if (consolidated.funding?.blockers.length) {
    return `Revisar funding: ${consolidated.funding.blockers.join(", ")}.`;
  }

  return baseSummary.nextBestStep;
}

function buildSummaryFromContact(contact: FunnelUpContact): ClientSummary {
  const tags = contact.tags ?? [];
  const relevantFields = getRelevantCustomFields(contact.customFields ?? []);
  const recommendedService = getRecommendedService(contact, relevantFields);
  const status = getStatus(contact, relevantFields);

  return {
    clientId: contact.id,
    name: formatFunnelUpContactName(contact),
    email: contact.email || "",
    phone: contact.phone || "",
    contactUrl: getFunnelUpContactUrl(contact.id),
    status,
    tags,
    recommendedService,
    intentLevel: inferIntentLevel(tags, relevantFields),
    lastSignal: buildLastSignal(contact, status, relevantFields),
    nextBestStep: buildNextBestStep(contact, recommendedService),
    summaryFields: [
      { label: "Nombre", value: formatFunnelUpContactName(contact) },
      { label: "Email", value: contact.email || "No disponible" },
      { label: "Telefono", value: contact.phone || "No disponible" },
      { label: "Contact ID", value: contact.id },
      { label: "Estado", value: status },
      { label: "Tags", value: tags.length ? tags.join(", ") : "Sin tags" },
      ...relevantFields,
    ],
    rawMetadata: contact.rawMetadata,
  };
}

function fieldLabel(field: FunnelUpCustomField) {
  return field.name || field.key || field.id || "Campo personalizado";
}

function getRelevantCustomFields(fields: FunnelUpCustomField[]) {
  const keywords = [
    "servicio",
    "service",
    "status",
    "estado",
    "stage",
    "etapa",
    "intent",
    "intencion",
    "intención",
    "producto",
    "plan",
    "pipeline",
  ];

  const relevant = fields.filter((field) => {
    const label = fieldLabel(field).toLowerCase();
    return keywords.some((keyword) => label.includes(keyword));
  });

  const selected = relevant.length > 0 ? relevant : fields.slice(0, 6);

  return selected.map((field) => ({
    label: fieldLabel(field),
    value: field.value,
  }));
}

function findSummaryField(fields: Array<{ label: string; value: string }>, keywords: string[]) {
  return fields.find((field) => {
    const label = field.label.toLowerCase();
    return keywords.some((keyword) => label.includes(keyword));
  });
}

function getRecommendedService(
  contact: FunnelUpContact,
  fields: Array<{ label: string; value: string }>
) {
  const serviceField = findSummaryField(fields, ["servicio", "service", "producto", "plan"]);
  const serviceTag = contact.tags?.find((tag) =>
    /credito|credit|reparacion|funding|hipoteca|mortgage|tax/i.test(tag)
  );

  return serviceField?.value || serviceTag || contact.type || "No definido";
}

function getStatus(contact: FunnelUpContact, fields: Array<{ label: string; value: string }>) {
  const statusField = findSummaryField(fields, ["status", "estado", "stage", "etapa", "pipeline"]);
  return statusField?.value || contact.type || "Contacto FunnelUp";
}

function inferIntentLevel(
  tags: string[],
  fields: Array<{ label: string; value: string }>
): ClientSummary["intentLevel"] {
  const haystack = [...tags, ...fields.map((field) => `${field.label} ${field.value}`)]
    .join(" ")
    .toLowerCase();

  if (/hot|alta|alto|high|urgent|urgente|ready|listo/.test(haystack)) return "high";
  if (/low|baja|bajo|cold|frio|frío/.test(haystack)) return "low";
  return "medium";
}

function buildLastSignal(
  contact: FunnelUpContact,
  status: string,
  fields: Array<{ label: string; value: string }>
) {
  const intentField = findSummaryField(fields, ["intent", "intencion", "intención"]);

  if (intentField) {
    return `${intentField.label}: ${intentField.value}`;
  }

  if (contact.tags?.length) {
    return `Tags activos: ${contact.tags.slice(0, 4).join(", ")}`;
  }

  return `Estado actual en FunnelUp: ${status}`;
}

function buildNextBestStep(contact: FunnelUpContact, recommendedService: string) {
  if (!contact.email && !contact.phone) {
    return "Completar email o telefono antes de preparar seguimiento.";
  }

  if (recommendedService !== "No definido") {
    return `Preparar seguimiento sobre ${recommendedService} y confirmar proximo paso.`;
  }

  return "Revisar el perfil en FunnelUp y confirmar servicio de interes.";
}
