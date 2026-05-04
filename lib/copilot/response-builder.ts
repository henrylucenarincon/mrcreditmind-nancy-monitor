import type {
  ClientDocument,
  ClientRecord,
  ClientSummary,
  CopilotAction,
  CopilotCard,
  CopilotContextEntry,
  CopilotOrchestratorResult,
  CopilotResponse,
  CopilotSource,
  DriveItem,
  FundingStatus,
  OnboardingStatus,
  OperationalDataResult,
} from "./types";

function isClientRecord(value: unknown): value is ClientRecord {
  return typeof value === "object" && value !== null && "name" in value && "stage" in value;
}

function isClientSummary(value: unknown): value is ClientSummary {
  return typeof value === "object" && value !== null && "recommendedService" in value;
}

function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return typeof value === "object" && value !== null && "missingItems" in value;
}

function isDocumentList(value: unknown): value is ClientDocument[] {
  return Array.isArray(value) && value.every((item) => "status" in item && "name" in item);
}

function isDriveItemList(value: unknown): value is DriveItem[] {
  return Array.isArray(value) && value.every((item) => "kind" in item && "path" in item && "name" in item);
}

function isFundingStatus(value: unknown): value is FundingStatus {
  return typeof value === "object" && value !== null && "eligibility" in value;
}

function isOperationalData(value: unknown): value is OperationalDataResult {
  return typeof value === "object" && value !== null && "matches" in value;
}

function compactList(items: string[], limit = 3) {
  const unique = [...new Set(items.filter(Boolean))];
  if (unique.length <= limit) return unique.join(", ");
  return `${unique.slice(0, limit).join(", ")} y ${unique.length - limit} mas`;
}

function formatIntentLevel(level: ClientSummary["intentLevel"]) {
  if (level === "high") return "alta";
  if (level === "medium") return "media";
  return "baja";
}

function buildClientLine(data: ClientRecord) {
  if (data.id === "funnelup_no_match") {
    return "No encontre una coincidencia exacta de cliente en FunnelUp.";
  }

  if (data.id === "funnelup_unavailable") {
    return `FunnelUp no estuvo disponible para validar el cliente: ${data.stage}.`;
  }

  const contact = [data.email, data.phone].filter(Boolean).join(" / ");
  return `Encontre a ${data.name} en ${data.source}. Etapa actual: ${data.stage}${contact ? `. Contacto: ${contact}` : ""}.`;
}

function buildSummaryLines(data: ClientSummary) {
  const lines = [
    `Resumen del caso: servicio sugerido ${data.recommendedService}, intencion ${formatIntentLevel(data.intentLevel)}. ${data.lastSignal}`,
    `Siguiente paso recomendado: ${data.nextBestStep}`,
  ];

  if (data.consolidated?.onboarding) {
    const onboarding = data.consolidated.onboarding;
    lines.push(
      onboarding.missingItems.length
        ? `Onboarding: ${onboarding.status}. Pendiente: ${compactList(onboarding.missingItems)}.`
        : `Onboarding: ${onboarding.status}.`
    );
  }

  if (data.consolidated?.documents) {
    const documents = data.consolidated.documents;
    const found = documents.found.length;
    const review = documents.needsReview.length;
    const missing = documents.missing.length;
    lines.push(
      `Documentos: ${found} encontrados, ${review} por revisar y ${missing} faltantes.`
    );
  }

  if (data.consolidated?.funding) {
    const funding = data.consolidated.funding;
    const amount = funding.approvedAmount ? ` Monto aprobado: ${funding.approvedAmount}.` : "";
    const blockers = funding.blockers.length
      ? ` Bloqueos: ${compactList(funding.blockers)}.`
      : "";
    lines.push(`Funding: ${funding.status}.${amount}${blockers}`);
  }

  if (data.consolidated?.operations?.matches.length) {
    lines.push(`Datos operativos: ${compactList(data.consolidated.operations.matches, 2)}.`);
  }

  if (data.consolidated?.partialNotes.length) {
    lines.push(`Lectura parcial: ${compactList(data.consolidated.partialNotes, 2)}.`);
  }

  return lines;
}

function buildOnboardingLine(data: OnboardingStatus) {
  const status = data.onboardingStatus || data.status;
  const pending = [...data.missingItems, ...(data.missingDocuments ?? [])];
  if (pending.length === 0) {
    return `Onboarding: ${status}. No hay pendientes confirmados en la fuente disponible.`;
  }

  return `Onboarding: ${status}. Pendiente: ${compactList(pending)}.`;
}

function buildDocumentsLine(data: ClientDocument[]) {
  const available = data.filter((document) => document.status === "available");
  const review = data.filter((document) => document.status === "needs_review");
  const missing = data.filter((document) => document.status === "missing");
  const details = [
    available.length ? `encontrados: ${compactList(available.map((document) => document.name))}` : "",
    review.length ? `por revisar: ${compactList(review.map((document) => document.name))}` : "",
    missing.length ? `faltantes: ${compactList(missing.map((document) => document.name))}` : "",
  ].filter(Boolean);

  return details.length
    ? `Documentos: ${details.join("; ")}.`
    : "Documentos: no encontre documentos accionables en la fuente disponible.";
}

function buildDriveLine(data: DriveItem[]) {
  const found = data.filter((item) => item.id !== "google_drive_resource_pending");
  if (found.length === 0) {
    const notes = compactList(data.flatMap((item) => item.notes ?? []), 2);
    return notes
      ? `Drive: no encontre un recurso exacto. ${notes}.`
      : "Drive: no encontre un recurso exacto con la informacion disponible.";
  }

  return `Drive: ${compactList(found.map((item) => `${item.kind} ${item.name}`))}.`;
}

function buildFundingLine(data: FundingStatus) {
  const status = data.fundingStatus || data.eligibility;
  const parts = [`Funding: ${status}`];
  if (data.approvedAmount) parts.push(`monto aprobado ${data.approvedAmount}`);
  if (data.stage) parts.push(`etapa ${data.stage}`);
  if (data.blockers.length) parts.push(`bloqueos ${compactList(data.blockers)}`);
  if (data.notes) parts.push(data.notes);

  return `${parts.join(". ")}.`;
}

function buildOperationalLine(data: OperationalDataResult) {
  if (data.matches.length === 0) {
    return data.summary || "Datos operativos: no encontre coincidencias exactas.";
  }

  return `${data.summary || "Datos operativos encontrados."} Principal: ${compactList(
    data.matches.map((match) => `${match.title}: ${match.excerpt}`),
    2
  )}.`;
}

function buildAnswer(result: CopilotOrchestratorResult) {
  const lines: string[] = [];

  result.toolResults.forEach((toolResult) => {
    const { data } = toolResult;

    if (isClientRecord(data)) lines.push(buildClientLine(data));
    if (isClientSummary(data)) lines.push(...buildSummaryLines(data));
    if (isOnboardingStatus(data)) lines.push(buildOnboardingLine(data));
    if (isDocumentList(data)) lines.push(buildDocumentsLine(data));
    if (isDriveItemList(data)) lines.push(buildDriveLine(data));
    if (isFundingStatus(data)) lines.push(buildFundingLine(data));
    if (isOperationalData(data)) lines.push(buildOperationalLine(data));
  });

  const partialSources = result.toolResults
    .map((toolResult) => toolResult.source)
    .filter((source) => source.status !== "used")
    .map((source) => source.label);

  if (partialSources.length) {
    lines.push(
      `Algunas fuentes quedaron parciales o pendientes: ${compactList(partialSources)}. Respondo con la informacion disponible.`
    );
  }

  if (lines.length === 0) {
    return "No encontre datos suficientes para una revision especifica. Enviame un nombre, email, telefono, carpeta, documento o estado que quieras revisar y consulto las fuentes disponibles.";
  }

  return [...new Set(lines)].join("\n\n");
}

export function buildCopilotResponse(result: CopilotOrchestratorResult): CopilotResponse {
  const cards: CopilotCard[] = [];
  const actions: CopilotAction[] = [];
  const context: CopilotContextEntry[] = [];
  const sources: CopilotSource[] = result.toolResults.map((toolResult) => toolResult.source);

  result.toolResults.forEach((toolResult) => {
    const { data } = toolResult;

    if (isClientRecord(data)) {
      cards.push({
        id: "client-stage",
        title: "Etapa",
        value: data.stage,
        description: data.name,
        tone: "info",
      });
      context.push({ label: "Cliente", value: data.name });
      context.push({ label: "Fuente", value: data.source });
    }

    if (isClientSummary(data)) {
      cards.push({
        id: "intent-level",
        title: "Intencion",
        value: data.intentLevel === "high" ? "Alta" : data.intentLevel,
        description: data.lastSignal,
        tone: "success",
      });
      context.push({ label: "Servicio sugerido", value: data.recommendedService });
      if (data.email) context.push({ label: "Email", value: data.email });
      if (data.phone) context.push({ label: "Telefono", value: data.phone });
      if (data.status) context.push({ label: "Estado FunnelUp", value: data.status });
      if (data.tags?.length) context.push({ label: "Tags FunnelUp", value: data.tags.join(", ") });
      if (data.contactUrl) context.push({ label: "Link contacto", value: data.contactUrl });
      if (data.consolidated) {
        context.push({ label: "Fuentes resumen", value: data.consolidated.sources.join(", ") });
        data.consolidated.partialNotes.forEach((note, index) => {
          context.push({ label: `Resumen parcial ${index + 1}`, value: note });
        });
        if (data.consolidated.onboarding) {
          context.push({ label: "Resumen onboarding", value: data.consolidated.onboarding.status });
          if (data.consolidated.onboarding.missingItems.length) {
            context.push({ label: "Onboarding pendiente", value: data.consolidated.onboarding.missingItems.join(", ") });
          }
        }
        if (data.consolidated.documents) {
          if (data.consolidated.documents.found.length) {
            context.push({ label: "Resumen documentos", value: data.consolidated.documents.found.join(", ") });
          }
          if (data.consolidated.documents.needsReview.length) {
            context.push({ label: "Documentos por revisar", value: data.consolidated.documents.needsReview.join(", ") });
          }
          if (data.consolidated.documents.missing.length) {
            context.push({ label: "Documentos faltantes", value: data.consolidated.documents.missing.join(", ") });
          }
        }
        if (data.consolidated.funding) {
          context.push({ label: "Resumen funding", value: data.consolidated.funding.status });
          if (data.consolidated.funding.approvedAmount) {
            context.push({ label: "Monto aprobado", value: data.consolidated.funding.approvedAmount });
          }
          if (data.consolidated.funding.blockers.length) {
            context.push({ label: "Bloqueos funding", value: data.consolidated.funding.blockers.join(", ") });
          }
        }
        if (data.consolidated.operations?.matches.length) {
          context.push({ label: "Resumen operativo", value: data.consolidated.operations.matches.join(" | ") });
        }
      }
      data.summaryFields?.forEach((field) => {
        if (!context.some((item) => item.label === field.label && item.value === field.value)) {
          context.push(field);
        }
      });
      actions.push({
        id: "send-follow-up",
        label: "Preparar seguimiento",
        description: data.nextBestStep,
        type: "draft_message",
      });
    }

    if (isOnboardingStatus(data)) {
      const pendingCount = data.missingItems.length || data.missingDocuments?.length || 0;
      cards.push({
        id: "onboarding-status",
        title: "Onboarding",
        value: data.onboardingStatus || (data.status === "in_progress" ? "En progreso" : data.status),
        description: pendingCount ? `${pendingCount} items pendientes` : "Sin pendientes confirmados",
        tone: data.status === "complete" ? "success" : "warning",
      });
      context.push({ label: "Onboarding", value: data.onboardingStatus || data.status });
      context.push({ label: "Fuente onboarding", value: data.sourceUsed || "FunnelUp" });
      if (data.lastSubmissionAt) {
        context.push({ label: "Ultima submission", value: data.lastSubmissionAt });
      }
      if (data.missingItems.length > 0) {
        context.push({ label: "Pendientes onboarding", value: data.missingItems.join(", ") });
      }
      if (data.missingDocuments?.length) {
        context.push({ label: "Missing documents", value: data.missingDocuments.join(", ") });
      }
      data.notes?.forEach((note, index) => {
        context.push({ label: `Nota onboarding ${index + 1}`, value: note });
      });
      data.observedFields?.forEach((field) => {
        context.push({ label: `Campo onboarding (${field.confidence})`, value: `${field.label}: ${field.value}` });
      });
      actions.push({
        id: "request-onboarding-items",
        label: "Pedir documentos faltantes",
        description: data.missingItems.length
          ? data.missingItems.join(", ")
          : "Confirmar checklist de onboarding antes de pedir documentos.",
        type: "request_documents",
      });
    }

    if (isDocumentList(data)) {
      const missing = data.filter((document) => document.status === "missing");
      const available = data.filter((document) => document.status === "available");
      const review = data.filter((document) => document.status === "needs_review");
      cards.push({
        id: "documents",
        title: "Documentos",
        value: `${data.length} revisados`,
        description: missing.length ? `${missing.length} faltante` : "Sin faltantes confirmados",
        tone: missing.length ? "warning" : "success",
      });
      if (available.length > 0) {
        context.push({ label: "Documentos encontrados", value: available.map((document) => document.name).join(", ") });
      }
      if (review.length > 0) {
        context.push({ label: "Documentos por revisar", value: review.map((document) => document.name).join(", ") });
      }
      if (missing.length > 0) {
        context.push({ label: "Documentos faltantes", value: missing.map((document) => document.name).join(", ") });
      }
      data
        .filter((document) => document.link)
        .slice(0, 5)
        .forEach((document) => {
          context.push({ label: `Link documento`, value: `${document.name}: ${document.link}` });
        });
      data
        .flatMap((document) => document.notes ?? [])
        .forEach((note, index) => {
          context.push({ label: `Nota Drive ${index + 1}`, value: note });
        });
    }

    if (isDriveItemList(data)) {
      data.forEach((item) => {
        context.push({ label: "Drive recurso", value: `${item.kind}: ${item.name}` });
        if (item.path) context.push({ label: "Drive ubicacion", value: item.path });
        if (item.link) context.push({ label: "Drive link", value: item.link });
        if (item.parentFolderName) {
          context.push({ label: "Drive carpeta padre", value: item.parentFolderName });
        }
        item.possibleMatches?.forEach((match, index) => {
          context.push({ label: `Drive match ${index + 1}`, value: `${match.kind}: ${match.path}` });
        });
        item.notes?.forEach((note, index) => {
          context.push({ label: `Nota Drive search ${index + 1}`, value: note });
        });
      });
    }

    if (isFundingStatus(data)) {
      cards.push({
        id: "funding-status",
        title: "Funding",
        value: data.fundingStatus || (data.eligibility === "review_needed" ? "Requiere revision" : data.eligibility),
        description: data.notes,
        tone: "warning",
      });
      if (data.approvedAmount) context.push({ label: "Monto aprobado", value: data.approvedAmount });
      if (data.stage) context.push({ label: "Etapa funding", value: data.stage });
      if (data.lastUpdatedAt) context.push({ label: "Funding actualizado", value: data.lastUpdatedAt });
      if (data.sourceUsed) context.push({ label: "Fuente funding", value: data.sourceUsed });
      if (data.blockers.length > 0) {
        context.push({ label: "Bloqueos funding", value: data.blockers.join(", ") });
      }
      data.possibleMatches?.forEach((match, index) => {
        context.push({ label: `Funding match ${index + 1}`, value: `${match.label} (${match.score})` });
      });
      actions.push({
        id: "review-funding",
        label: "Revisar elegibilidad",
        description: "Validar ingresos, reporte y criterios de cualificacion.",
        type: "review_data",
      });
    }

    if (isOperationalData(data)) {
      cards.push({
        id: "ops-matches",
        title: "Datos operativos",
        value: `${data.matches.length} hallazgos`,
        description: data.summary || data.matches[0]?.title,
        tone: data.matches.length > 0 ? "neutral" : "warning",
      });
      context.push({ label: "Busqueda operativa", value: data.query });
      if (data.sourceUsed) context.push({ label: "Fuente operativa", value: data.sourceUsed });
      data.notes?.forEach((note, index) => {
        context.push({ label: `Nota operativa ${index + 1}`, value: note });
      });
      data.matches.forEach((match, index) => {
        context.push({ label: `Resultado operativo ${index + 1}`, value: `${match.title}: ${match.excerpt}` });
        if (match.score !== undefined) {
          context.push({ label: `Score operativo ${index + 1}`, value: String(match.score) });
        }
        match.fields?.slice(0, 4).forEach((field) => {
          context.push({ label: `Campo operativo`, value: `${field.label}: ${field.value}` });
        });
      });
    }
  });

  if (sources.length === 0) {
    sources.push({
      id: "nancy-copilot-default",
      label: "Nancy Copilot",
      type: "internal",
      status: "used",
    });
  }

  return {
    answer: buildAnswer(result),
    cards,
    actions,
    context,
    sources,
  };
}
