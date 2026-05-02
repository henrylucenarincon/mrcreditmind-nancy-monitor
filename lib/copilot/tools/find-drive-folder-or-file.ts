import type { CopilotToolResult, DriveItem } from "../types";
import type { GoogleDriveSearchMatch, GoogleDriveSearchResult } from "@/lib/google-drive/types";

export async function findDriveFolderOrFile(
  query: string
): Promise<CopilotToolResult<DriveItem[]>> {
  const [{ findClient }, { hasGoogleDriveConfig, searchDriveFolderOrFile }] =
    await Promise.all([import("./find-client"), import("@/lib/google-drive/client")]);

  if (!hasGoogleDriveConfig()) {
    return buildPartialResult("Google Drive pendiente de configuracion");
  }

  try {
    const client = await findClient(query);
    const hasClient = client.source.status === "used" && !client.data.id.startsWith("funnelup_");
    const result = await searchDriveFolderOrFile({
      query,
      clientId: hasClient ? client.data.id : undefined,
      name: hasClient ? client.data.name : undefined,
      email: hasClient ? client.data.email : undefined,
      phone: hasClient ? client.data.phone : undefined,
    });

    if (!result.bestMatch) {
      return buildPartialResult(result.notes[0] || "No se encontro recurso exacto en Google Drive");
    }

    return {
      tool: "find-drive-folder-or-file",
      source: {
        id: "google-drive-resource-search",
        label: "Google Drive resource search",
        type: "drive",
        status: "used",
      },
      data: [mapSearchResultToDriveItem(result)],
    };
  } catch (error) {
    console.error(
      "Error buscando carpeta o archivo en Google Drive:",
      error instanceof Error ? error.message : error
    );

    return buildPartialResult("No se pudo buscar en Google Drive");
  }
}

function buildPartialResult(note: string): CopilotToolResult<DriveItem[]> {
  return {
    tool: "find-drive-folder-or-file",
    source: {
      id: "google-drive-resource-search-pending",
      label: "Google Drive resource search pending",
      type: "drive",
      status: "pending",
    },
    data: [
      {
        id: "google_drive_resource_pending",
        name: "Google Drive no disponible",
        kind: "folder",
        path: "",
        sourceUsed: "Google Drive",
        possibleMatches: [],
        notes: [note],
      },
    ],
  };
}

function mapMatch(match: GoogleDriveSearchMatch) {
  return {
    id: match.file.id,
    name: match.file.name,
    kind: match.kind,
    path: match.path,
    link: match.file.webViewLink,
  };
}

function mapSearchResultToDriveItem(result: GoogleDriveSearchResult): DriveItem {
  const bestMatch = result.bestMatch;

  if (!bestMatch) {
    return {
      id: "google_drive_resource_pending",
      name: "Google Drive no disponible",
      kind: "folder",
      path: "",
      sourceUsed: result.sourceUsed,
      possibleMatches: [],
      notes: result.notes,
    };
  }

  return {
    ...mapMatch(bestMatch),
    parentFolderName: bestMatch.parentFolder?.name,
    parentFolderId: bestMatch.parentFolder?.id,
    sourceUsed: result.sourceUsed,
    possibleMatches: result.matches.filter((match) => match.file.id !== bestMatch.file.id).slice(0, 5).map(mapMatch),
    notes: result.notes,
  };
}
