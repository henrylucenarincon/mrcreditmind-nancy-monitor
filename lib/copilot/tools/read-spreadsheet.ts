import * as XLSX from "xlsx";
import { downloadDriveFileBinary, hasGoogleDriveConfig, requestGoogleDriveApi } from "@/lib/google-drive/client";
import type { CopilotToolResult } from "../types";

const MAX_ROWS = 80;

function sheetsToText(workbook: XLSX.WorkBook): string {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
    const visible = rows.slice(0, MAX_ROWS);
    const text = visible.map((row) => row.join(" | ")).join("\n");
    return `## Hoja: ${name}\n${text}${rows.length > MAX_ROWS ? `\n... (${rows.length - MAX_ROWS} filas adicionales)` : ""}`;
  }).join("\n\n");
}

async function readExcel(fileId: string): Promise<string> {
  const buffer = await downloadDriveFileBinary(fileId);
  const wb = XLSX.read(buffer, { type: "buffer" });
  return sheetsToText(wb);
}

async function readGoogleSheet(fileId: string): Promise<string> {
  const result = await requestGoogleDriveApi({
    method: "GET",
    endpoint: `/files/${encodeURIComponent(fileId)}/export`,
    params: { mimeType: "text/csv" },
  });
  if (!result.ok) throw new Error(`Export falló: ${result.status}`);
  const content = (result.data as { content?: string }).content ?? "";
  const lines = content.split("\n").slice(0, MAX_ROWS);
  return lines.join("\n");
}

async function getFileMeta(fileId: string): Promise<{ name: string; mimeType: string }> {
  const result = await requestGoogleDriveApi({
    method: "GET",
    endpoint: `/files/${encodeURIComponent(fileId)}`,
    params: { fields: "id,name,mimeType", supportsAllDrives: "true" },
  });
  if (!result.ok || typeof result.data !== "object" || !result.data) {
    return { name: fileId, mimeType: "" };
  }
  const d = result.data as Record<string, unknown>;
  return {
    name: String(d.name ?? ""),
    mimeType: String(d.mimeType ?? ""),
  };
}

export async function readSpreadsheet(fileId: string): Promise<CopilotToolResult<unknown>> {
  if (!hasGoogleDriveConfig()) {
    return {
      tool: "read_spreadsheet",
      source: { id: "spreadsheet-read", label: "Leer tabla", type: "drive", status: "pending" },
      data: { error: "Google Drive no configurado." },
    };
  }

  try {
    const meta = await getFileMeta(fileId);
    const isGoogleSheet = meta.mimeType === "application/vnd.google-apps.spreadsheet";
    const isExcel =
      meta.mimeType.includes("spreadsheetml") ||
      meta.mimeType.includes("ms-excel") ||
      meta.name.endsWith(".xlsx") ||
      meta.name.endsWith(".xls");

    let content: string;
    if (isGoogleSheet) {
      content = await readGoogleSheet(fileId);
    } else if (isExcel) {
      content = await readExcel(fileId);
    } else {
      return {
        tool: "read_spreadsheet",
        source: { id: "spreadsheet-read", label: meta.name, type: "drive", status: "pending" },
        data: { error: `El archivo "${meta.name}" no es una hoja de cálculo reconocida (mimeType: ${meta.mimeType}).` },
      };
    }

    return {
      tool: "read_spreadsheet",
      source: {
        id: `spreadsheet-${fileId}`,
        label: meta.name || "Tabla",
        type: "drive",
        status: "used",
      },
      data: { fileName: meta.name, content },
    };
  } catch (error) {
    return {
      tool: "read_spreadsheet",
      source: { id: "spreadsheet-read-error", label: "Leer tabla", type: "drive", status: "pending" },
      data: { error: error instanceof Error ? error.message : "Error leyendo la tabla." },
    };
  }
}
