import type { CopilotToolResult, OperationalDataResult } from "../types";

export async function searchInternalOperationalData(
  query: string
): Promise<CopilotToolResult<OperationalDataResult>> {
  const [{ findClient }, { hasGoogleSheetsConfig, searchOperationalRows }] = await Promise.all([
    import("./find-client"),
    import("@/lib/google-sheets/client"),
  ]);

  if (!hasGoogleSheetsConfig()) {
    return buildPartialResult(query, "Google Sheets pendiente de configuracion");
  }

  try {
    const client = await findClient(query);
    const hasClient = client.source.status === "used" && !client.data.id.startsWith("funnelup_");
    const result = await searchOperationalRows({
      query,
      extraTerms: hasClient
        ? [client.data.id, client.data.name, client.data.email, client.data.phone]
        : [],
    });

    return {
      tool: "search-internal-operational-data",
      source: {
        id: "google-sheets-operational-search",
        label: "Google Sheets operational search",
        type: "sheets",
        status: "used",
      },
      data: {
        query,
        summary: result.matches.length
          ? `Se encontraron ${result.matches.length} coincidencias operativas.`
          : "No se encontraron coincidencias operativas exactas.",
        sourceUsed: result.sourceUsed,
        notes: result.notes,
        matches: result.matches.map((match) => ({
          id: `ops_${match.range}_${match.row.rowNumber}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
          title: match.title,
          excerpt: match.excerpt,
          source: `${match.range} fila ${match.row.rowNumber}`,
          score: match.score,
          fields: match.highlightedFields,
        })),
      },
    };
  } catch (error) {
    console.error(
      "Error buscando datos operativos en Google Sheets:",
      error instanceof Error ? error.message : error
    );

    return buildPartialResult(query, "No se pudo leer Google Sheets");
  }
}

function buildPartialResult(query: string, note: string): CopilotToolResult<OperationalDataResult> {
  return {
    tool: "search-internal-operational-data",
    source: {
      id: "google-sheets-operational-search-pending",
      label: "Google Sheets operational search pending",
      type: "sheets",
      status: "pending",
    },
    data: {
      query,
      summary: "Busqueda operativa parcial.",
      sourceUsed: "Google Sheets",
      notes: [note],
      matches: [],
    },
  };
}
