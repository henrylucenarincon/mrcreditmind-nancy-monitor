import type { CopilotToolResult, OnboardingStatus } from "../types";
import {
  getFunnelUpContactById,
  hasFunnelUpConfig,
} from "@/lib/funnelup/client";
import type { FunnelUpContact, FunnelUpCustomField } from "@/lib/funnelup/types";

const DOCUMENT_KEYWORDS = [
  "document",
  "documento",
  "docs",
  "reporte",
  "credit report",
  "credito",
  "crédito",
  "id",
  "identificacion",
  "identificación",
  "income",
  "ingreso",
  "paystub",
  "talonario",
  "autorizacion",
  "autorización",
  "agreement",
  "contrato",
];

const ONBOARDING_KEYWORDS = [
  "onboarding",
  "intake",
  "registro",
  "solicitud",
  "submission",
  "submitted",
  "enviado",
  "completo",
  "complete",
  "pendiente",
  "pending",
  "missing",
  "faltante",
];

export async function getClientOnboardingStatus(
  clientId: string
): Promise<CopilotToolResult<OnboardingStatus>> {
  if (!hasFunnelUpConfig() || clientId.startsWith("funnelup_")) {
    return buildPartialStatus(clientId, "FunnelUp pendiente de configuracion");
  }

  try {
    const contact = await getFunnelUpContactById(clientId);

    if (!contact) {
      return buildPartialStatus(clientId, "Contacto no encontrado en FunnelUp");
    }

    return {
      tool: "get-client-onboarding-status",
      source: {
        id: "funnelup-onboarding-status",
        label: "FunnelUp onboarding status",
        type: "funnelup",
        status: "used",
      },
      data: buildOnboardingStatusFromContact(contact),
    };
  } catch (error) {
    console.error(
      "Error leyendo onboarding desde FunnelUp:",
      error instanceof Error ? error.message : error
    );

    return buildPartialStatus(clientId, "No se pudo leer onboarding desde FunnelUp");
  }
}

function buildPartialStatus(clientId: string, note: string): CopilotToolResult<OnboardingStatus> {
  return {
    tool: "get-client-onboarding-status",
    source: {
      id: "funnelup-onboarding-status-pending",
      label: "FunnelUp onboarding status pending",
      type: "funnelup",
      status: "pending",
    },
    data: {
      clientId,
      status: "not_started",
      onboardingStatus: "No disponible",
      isComplete: false,
      completedItems: [],
      missingItems: [],
      missingDocuments: [],
      notes: [note, "Missing documents queda preparado para conectar Drive mas adelante."],
      sourceUsed: "FunnelUp",
      observedFields: [],
    },
  };
}

function buildOnboardingStatusFromContact(contact: FunnelUpContact): OnboardingStatus {
  const fields = contact.customFields ?? [];
  const relevantFields = findRelevantOnboardingFields(fields);
  const tagSignals = findRelevantTags(contact.tags ?? []);
  const observedFields = [
    ...relevantFields.map((field) => ({
      label: fieldLabel(field),
      value: field.value,
      confidence: isClearlyOnboardingField(field) ? "clear" as const : "possible" as const,
    })),
    ...tagSignals.map((tag) => ({
      label: "Tag FunnelUp",
      value: tag,
      confidence: "possible" as const,
    })),
  ];
  const haystack = observedFields.map((field) => `${field.label} ${field.value}`).join(" ");
  const status = inferOnboardingStatus(haystack);
  const missingDocuments = inferMissingDocuments(observedFields);
  const completedItems = inferCompletedItems(contact, observedFields);
  const missingItems = inferMissingItems(status, missingDocuments, observedFields);
  const lastSubmissionAt = inferLastSubmissionAt(contact, observedFields);

  return {
    clientId: contact.id,
    status,
    onboardingStatus: formatStatus(status),
    isComplete: status === "complete",
    completedItems,
    missingItems,
    missingDocuments,
    lastSubmissionAt,
    notes: buildNotes(contact, observedFields, missingDocuments),
    sourceUsed: "FunnelUp",
    observedFields,
  };
}

function fieldLabel(field: FunnelUpCustomField) {
  return field.name || field.key || field.id || "Campo personalizado";
}

function normalized(value: string) {
  return value.toLowerCase();
}

function hasAnyKeyword(value: string, keywords: string[]) {
  const text = normalized(value);
  return keywords.some((keyword) => text.includes(keyword));
}

function isClearlyOnboardingField(field: FunnelUpCustomField) {
  return hasAnyKeyword(fieldLabel(field), ONBOARDING_KEYWORDS);
}

function findRelevantOnboardingFields(fields: FunnelUpCustomField[]) {
  return fields.filter((field) => {
    const label = fieldLabel(field);
    const combined = `${label} ${field.value}`;

    return (
      hasAnyKeyword(label, ONBOARDING_KEYWORDS) ||
      hasAnyKeyword(label, DOCUMENT_KEYWORDS) ||
      hasAnyKeyword(combined, ["missing", "faltante", "pendiente", "complete", "completo"])
    );
  });
}

function findRelevantTags(tags: string[]) {
  return tags.filter((tag) => hasAnyKeyword(tag, [...ONBOARDING_KEYWORDS, ...DOCUMENT_KEYWORDS]));
}

function inferOnboardingStatus(text: string): OnboardingStatus["status"] {
  const value = normalized(text);

  if (/(complete|completo|completed|finalizado|terminado)/.test(value)) {
    return "complete";
  }

  if (/(in progress|progreso|pendiente|pending|missing|faltante|submitted|enviado)/.test(value)) {
    return "in_progress";
  }

  return "not_started";
}

function inferMissingDocuments(
  observedFields: OnboardingStatus["observedFields"]
) {
  if (!observedFields) return [];

  return observedFields
    .filter((field) => {
      const text = `${field.label} ${field.value}`;
      return hasAnyKeyword(text, DOCUMENT_KEYWORDS) && hasAnyKeyword(text, ["missing", "faltante", "pendiente", "pending"]);
    })
    .map((field) => field.value || field.label)
    .filter((value, index, list) => value && list.indexOf(value) === index);
}

function inferCompletedItems(
  contact: FunnelUpContact,
  observedFields: NonNullable<OnboardingStatus["observedFields"]>
) {
  const items: string[] = [];

  if (contact.email || contact.phone) {
    items.push("Contacto basico registrado");
  }

  observedFields.forEach((field) => {
    const text = `${field.label} ${field.value}`;
    if (hasAnyKeyword(text, ["complete", "completo", "completed", "finalizado", "submitted", "enviado"])) {
      items.push(field.label);
    }
  });

  return [...new Set(items)];
}

function inferMissingItems(
  status: OnboardingStatus["status"],
  missingDocuments: string[],
  observedFields: NonNullable<OnboardingStatus["observedFields"]>
) {
  const items = [...missingDocuments];

  observedFields.forEach((field) => {
    const text = `${field.label} ${field.value}`;
    if (hasAnyKeyword(text, ["missing", "faltante", "pendiente", "pending"])) {
      items.push(field.value || field.label);
    }
  });

  if (status !== "complete" && items.length === 0) {
    items.push("Validar checklist de onboarding");
  }

  return [...new Set(items)];
}

function inferLastSubmissionAt(
  contact: FunnelUpContact,
  observedFields: NonNullable<OnboardingStatus["observedFields"]>
) {
  const submissionField = observedFields.find((field) =>
    hasAnyKeyword(field.label, ["submission", "submitted", "enviado", "fecha"])
  );

  return submissionField?.value || contact.dateAdded || "";
}

function buildNotes(
  contact: FunnelUpContact,
  observedFields: NonNullable<OnboardingStatus["observedFields"]>,
  missingDocuments: string[]
) {
  const notes: string[] = [];

  if (observedFields.length === 0) {
    notes.push("No se encontraron campos o tags claros de onboarding en FunnelUp.");
  }

  const possibleFields = observedFields.filter((field) => field.confidence === "possible");
  if (possibleFields.length > 0) {
    notes.push("Algunas senales se detectaron por tags/campos relacionados y deben confirmarse.");
  }

  if (missingDocuments.length === 0) {
    notes.push("No hay missingDocuments reales; queda listo para alimentarse desde Drive o checklist externo.");
  }

  if (contact.dateAdded) {
    notes.push(`Contacto creado/registrado en FunnelUp: ${contact.dateAdded}.`);
  }

  return notes;
}

function formatStatus(status: OnboardingStatus["status"]) {
  if (status === "complete") return "Completo";
  if (status === "in_progress") return "En progreso";
  return "No iniciado";
}
