import type { ClientRecord, CopilotToolResult } from "../types";
import {
  formatFunnelUpContactName,
  hasFunnelUpConfig,
  searchFunnelUpContacts,
} from "@/lib/funnelup/client";
import type { FunnelUpContact } from "@/lib/funnelup/types";

export async function findClient(query: string): Promise<CopilotToolResult<ClientRecord>> {
  if (!hasFunnelUpConfig()) {
    return buildUnavailableResult("Configurar credenciales de FunnelUp");
  }

  try {
    const result = await searchFunnelUpContacts(query);
    const contact = result.bestMatch;

    if (!contact) {
      return {
        tool: "find-client",
        source: {
          id: "funnelup-client-search",
          label: "FunnelUp client search",
          type: "funnelup",
          status: "used",
        },
        data: {
          id: "funnelup_no_match",
          name: "Cliente no encontrado",
          email: "",
          phone: "",
          source: "FunnelUp",
          stage: "Sin coincidencias",
          possibleMatches: [],
        },
      };
    }

    return {
      tool: "find-client",
      source: {
        id: "funnelup-client-search",
        label: "FunnelUp client search",
        type: "funnelup",
        status: "used",
      },
      data: mapFunnelUpContactToClientRecord(contact, result.matches),
    };
  } catch (error) {
    console.error(
      "Error buscando cliente en FunnelUp:",
      error instanceof Error ? error.message : error
    );

    return buildUnavailableResult("Revisar API de FunnelUp");
  }
}

function buildUnavailableResult(stage: string): CopilotToolResult<ClientRecord> {
  return {
    tool: "find-client",
    source: {
      id: "funnelup-client-search-unavailable",
      label: "FunnelUp client search unavailable",
      type: "funnelup",
      status: "pending",
    },
    data: {
      id: "funnelup_unavailable",
      name: "FunnelUp no disponible",
      email: "",
      phone: "",
      source: "FunnelUp",
      stage,
      possibleMatches: [],
    },
  };
}

function mapFunnelUpContactToClientRecord(
  contact: FunnelUpContact,
  matches: FunnelUpContact[]
): ClientRecord {
  return {
    id: contact.id,
    name: formatFunnelUpContactName(contact),
    email: contact.email || "",
    phone: contact.phone || "",
    source: contact.source || "FunnelUp",
    stage: contact.type || contact.tags?.[0] || "Contacto FunnelUp",
    possibleMatches: matches.slice(0, 5).map((match) => ({
      id: match.id,
      name: formatFunnelUpContactName(match),
      email: match.email || "",
      phone: match.phone || "",
    })),
  };
}
