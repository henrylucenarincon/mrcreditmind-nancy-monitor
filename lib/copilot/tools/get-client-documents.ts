import type { ClientDocument, CopilotToolResult } from "../types";
import type { GoogleDriveFile, GoogleDriveWorkspace } from "@/lib/google-drive/types";

export async function getClientDocuments(
  clientId: string
): Promise<CopilotToolResult<ClientDocument[]>> {
  const [{ getFunnelUpContactById, hasFunnelUpConfig }, { findClientDriveWorkspace, hasGoogleDriveConfig }] =
    await Promise.all([import("@/lib/funnelup/client"), import("@/lib/google-drive/client")]);

  if (!hasGoogleDriveConfig() || clientId.startsWith("funnelup_")) {
    return buildPartialDocumentsResult("Google Drive pendiente de configuracion", []);
  }

  try {
    const contact = hasFunnelUpConfig() ? await getFunnelUpContactById(clientId) : null;
    const workspace = await findClientDriveWorkspace({
      clientId,
      name: contact?.name || `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim(),
      email: contact?.email,
      phone: contact?.phone,
    });

    if (!workspace.mainFolder) {
      return buildPartialDocumentsResult(
        "No se encontro carpeta exacta del cliente en Google Drive",
        workspace.notes
      );
    }

    return {
      tool: "get-client-documents",
      source: {
        id: "google-drive-client-documents",
        label: "Google Drive client documents",
        type: "drive",
        status: "used",
      },
      data: workspace.documents.map((document) => mapDriveFileToClientDocument(document, workspace)),
    };
  } catch (error) {
    console.error(
      "Error leyendo documentos desde Google Drive:",
      error instanceof Error ? error.message : error
    );

    return buildPartialDocumentsResult("No se pudo leer Google Drive", []);
  }
}

function buildPartialDocumentsResult(
  note: string,
  notes: string[]
): CopilotToolResult<ClientDocument[]> {
  return {
    tool: "get-client-documents",
    source: {
      id: "google-drive-client-documents-pending",
      label: "Google Drive client documents pending",
      type: "drive",
      status: "pending",
    },
    data: [
      {
        id: "google_drive_pending",
        name: "Google Drive no disponible",
        type: "other",
        status: "needs_review",
        updatedAt: "",
        sourceUsed: "Google Drive",
        notes: [note, ...notes],
      },
    ],
  };
}

function inferDocumentType(name: string): ClientDocument["type"] {
  const normalized = name.toLowerCase();

  if (/credit|credito|crédito|reporte/.test(normalized)) return "credit_report";
  if (/\bid\b|identificacion|identificación|licencia|license/.test(normalized)) return "id";
  if (/income|ingreso|paystub|talonario|w2|tax|taxes|planilla/.test(normalized)) return "income";
  if (/agreement|contrato|autorizacion|autorización|authorization/.test(normalized)) return "agreement";
  return "other";
}

function inferDocumentStatus(name: string): ClientDocument["status"] {
  const normalized = name.toLowerCase();

  if (/missing|faltante|pendiente|required/.test(normalized)) return "missing";
  if (/draft|borrador|review|revisar|incomplete|incompleto/.test(normalized)) return "needs_review";
  return "available";
}

function findFolderName(folderId: string | undefined, workspace: GoogleDriveWorkspace) {
  if (!folderId) return "";

  const folders = [
    workspace.mainFolder,
    workspace.onboardingFolder,
    workspace.submissionFolder,
  ].filter((folder): folder is GoogleDriveFile => folder !== null);

  return folders.find((folder) => folder.id === folderId)?.name || "";
}

function mapDriveFileToClientDocument(
  file: GoogleDriveFile,
  workspace: GoogleDriveWorkspace
): ClientDocument {
  const parentId = file.parents?.[0];

  return {
    id: file.id,
    name: file.name,
    type: inferDocumentType(file.name),
    status: inferDocumentStatus(file.name),
    updatedAt: file.modifiedTime || "",
    link: file.webViewLink,
    mimeType: file.mimeType,
    folderId: parentId,
    folderName: findFolderName(parentId, workspace),
    sourceUsed: workspace.sourceUsed,
    notes: workspace.notes,
  };
}
