import type { CopilotToolResult, FundingStatus } from "../types";

export async function getFundingStatus(
  clientId: string
): Promise<CopilotToolResult<FundingStatus>> {
  const [
    { getFunnelUpContactById, hasFunnelUpConfig, formatFunnelUpContactName },
    { getFundingField, hasGoogleSheetsConfig, searchFundingRows },
  ] = await Promise.all([
    import("@/lib/funnelup/client"),
    import("@/lib/google-sheets/client"),
  ]);

  if (!hasGoogleSheetsConfig() || clientId.startsWith("funnelup_")) {
    return buildPartialFundingStatus(clientId, "Google Sheets pendiente de configuracion");
  }

  try {
    const contact = hasFunnelUpConfig() ? await getFunnelUpContactById(clientId) : null;
    const result = await searchFundingRows({
      clientId,
      name: contact ? formatFunnelUpContactName(contact) : undefined,
      email: contact?.email,
      phone: contact?.phone,
    });

    if (!result.bestMatch) {
      return buildPartialFundingStatus(
        clientId,
        result.notes[0] || "No se encontro funding para el cliente"
      );
    }

    const row = result.bestMatch.row;
    const fundingStatus = getFundingField(row, [
      "funding status",
      "funding",
      "status",
      "estado funding",
      "estado",
      "eligibility",
      "cualificacion",
      "cualificación",
    ]);
    const approvedAmount = getFundingField(row, [
      "approved amount",
      "approval amount",
      "amount",
      "monto aprobado",
      "monto",
      "loan amount",
    ]);
    const stage = getFundingField(row, [
      "stage",
      "etapa",
      "pipeline stage",
      "estado operativo",
      "operational status",
    ]);
    const notes = getFundingField(row, [
      "notes",
      "observaciones",
      "comentarios",
      "comment",
      "nota",
    ]);
    const lastUpdatedAt = getFundingField(row, [
      "last updated",
      "updated at",
      "ultima actualizacion",
      "última actualización",
      "fecha",
      "date",
    ]);

    return {
      tool: "get-funding-status",
      source: {
        id: "google-sheets-funding-status",
        label: "Google Sheets funding status",
        type: "sheets",
        status: "used",
      },
      data: {
        clientId,
        eligibility: inferEligibility(fundingStatus, stage),
        fundingStatus: fundingStatus || "No definido",
        approvedAmount,
        stage,
        notes: notes || fundingStatus || stage || "Funding encontrado en Google Sheets.",
        blockers: inferBlockers(fundingStatus, notes),
        lastUpdatedAt,
        sourceUsed: result.sourceUsed,
        matchedRow: row.values,
        possibleMatches: result.matches.slice(1, 6).map((match) => ({
          label: match.label,
          score: match.score,
        })),
      },
    };
  } catch (error) {
    console.error(
      "Error leyendo funding desde Google Sheets:",
      error instanceof Error ? error.message : error
    );

    return buildPartialFundingStatus(clientId, "No se pudo leer Google Sheets");
  }
}

function buildPartialFundingStatus(
  clientId: string,
  note: string
): CopilotToolResult<FundingStatus> {
  return {
    tool: "get-funding-status",
    source: {
      id: "google-sheets-funding-status-pending",
      label: "Google Sheets funding status pending",
      type: "sheets",
      status: "pending",
    },
    data: {
      clientId,
      eligibility: "unknown",
      fundingStatus: "No disponible",
      notes: note,
      blockers: [],
      sourceUsed: "Google Sheets",
    },
  };
}

function inferEligibility(status: string, stage: string): FundingStatus["eligibility"] {
  const text = `${status} ${stage}`.toLowerCase();

  if (/approved|aprobado|eligible|likely|pre.?approved|preaprobado/.test(text)) return "likely";
  if (/denied|declined|rechazado|not ready|no listo|no cualifica/.test(text)) return "not_ready";
  if (/review|revision|revisión|pending|pendiente|processing|proceso/.test(text)) return "review_needed";
  return "unknown";
}

function inferBlockers(status: string, notes: string) {
  const text = `${status} ${notes}`.toLowerCase();
  const blockers: string[] = [];

  if (/income|ingreso/.test(text)) blockers.push("Ingreso pendiente o por validar");
  if (/credit|credito|crédito|score/.test(text)) blockers.push("Credito pendiente o por validar");
  if (/document|documento|docs/.test(text)) blockers.push("Documentos pendientes");
  if (/pending|pendiente|review|revision|revisión/.test(text) && blockers.length === 0) {
    blockers.push("Requiere revision operativa");
  }

  return blockers;
}
