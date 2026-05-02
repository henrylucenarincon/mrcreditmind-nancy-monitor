import type {
  GoogleSheetsConfig,
  GoogleSheetsFundingMatch,
  GoogleSheetsFundingSearchResult,
  GoogleSheetsOperationalMatch,
  GoogleSheetsOperationalSearchResult,
  GoogleSheetsRow,
} from "./types";

const DEFAULT_BASE_URL = "https://sheets.googleapis.com/v4";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const DEFAULT_FUNDING_RANGE = "Funding!A:Z";
const DEFAULT_OPERATIONAL_RANGES = "Operational!A:Z";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function base64Url(value: string | Uint8Array) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function privateKeyToArrayBuffer(privateKey: string) {
  const base64 = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  return Uint8Array.from(Buffer.from(base64, "base64")).buffer;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function getGoogleSheetsConfig(): GoogleSheetsConfig {
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN || process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  const clientEmail =
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey =
    process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_FUNDING_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const fundingRange = process.env.GOOGLE_SHEETS_FUNDING_RANGE || DEFAULT_FUNDING_RANGE;
  const operationalRanges = (process.env.GOOGLE_SHEETS_OPERATIONAL_RANGES || DEFAULT_OPERATIONAL_RANGES)
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean);
  const baseUrl = process.env.GOOGLE_SHEETS_API_BASE_URL || DEFAULT_BASE_URL;

  if (!spreadsheetId || (!accessToken && (!clientEmail || !privateKey))) {
    throw new Error("Google Sheets no esta configurado.");
  }

  return {
    accessToken,
    clientEmail,
    privateKey: privateKey ? normalizePrivateKey(privateKey) : undefined,
    spreadsheetId,
    fundingRange,
    operationalRanges,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
}

export function hasGoogleSheetsConfig() {
  return Boolean(
    (process.env.GOOGLE_SHEETS_FUNDING_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID) &&
      (process.env.GOOGLE_SHEETS_ACCESS_TOKEN ||
        process.env.GOOGLE_DRIVE_ACCESS_TOKEN ||
        ((process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_DRIVE_CLIENT_EMAIL) &&
          (process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY)))
  );
}

async function getServiceAccountAccessToken(config: GoogleSheetsConfig) {
  if (!config.clientEmail || !config.privateKey) {
    throw new Error("Service account de Google Sheets incompleta.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: config.clientEmail,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyToArrayBuffer(config.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  const assertion = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google OAuth respondio ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  if (!isObject(payload) || typeof payload.access_token !== "string") {
    throw new Error("Google OAuth no devolvio access_token.");
  }

  return payload.access_token;
}

async function getAccessToken(config: GoogleSheetsConfig) {
  return config.accessToken || getServiceAccountAccessToken(config);
}

async function getValues(range: string) {
  const config = getGoogleSheetsConfig();
  const token = await getAccessToken(config);
  const encodedRange = encodeURIComponent(range);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const response = await fetch(
    `${config.baseUrl}/spreadsheets/${config.spreadsheetId}/values/${encodedRange}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets respondio ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  if (!isObject(payload) || !Array.isArray(payload.values)) return [];

  return payload.values.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []
  );
}

function rowsFromValues(values: string[][]): GoogleSheetsRow[] {
  const [headersRow, ...dataRows] = values;
  if (!headersRow) return [];

  const headers = headersRow.map((header, index) => normalizeHeader(header) || `column_${index + 1}`);

  return dataRows.map((row, index) => {
    const record = headers.reduce<Record<string, string>>((acc, header, cellIndex) => {
      acc[header] = row[cellIndex] || "";
      return acc;
    }, {});

    return {
      rowNumber: index + 2,
      values: record,
      raw: row,
    };
  });
}

function getByAliases(row: GoogleSheetsRow, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const exact = row.values[normalizedAlias];
    if (exact) return exact;

    const fuzzyKey = Object.keys(row.values).find((key) => key.includes(normalizedAlias));
    if (fuzzyKey && row.values[fuzzyKey]) return row.values[fuzzyKey];
  }

  return "";
}

function scoreRow(row: GoogleSheetsRow, input: {
  clientId?: string;
  name?: string;
  email?: string;
  phone?: string;
}) {
  const values = Object.values(row.values).join(" ").toLowerCase();
  const rowDigits = digitsOnly(values);
  let score = 0;

  if (input.clientId && values.includes(input.clientId.toLowerCase())) score += 100;
  if (input.email && values.includes(input.email.toLowerCase())) score += 90;
  if (input.phone && digitsOnly(input.phone) && rowDigits.includes(digitsOnly(input.phone))) score += 80;

  if (input.name) {
    const name = normalizeSearchTerm(input.name);
    if (values.includes(name)) score += 70;
    name.split(/\s+/).forEach((part) => {
      if (part.length >= 3 && values.includes(part)) score += 12;
    });
  }

  return score;
}

function scoreRowByTerms(row: GoogleSheetsRow, terms: string[]) {
  const values = Object.values(row.values).join(" ").toLowerCase();
  const rowDigits = digitsOnly(values);

  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeSearchTerm(term);
    const termDigits = digitsOnly(term);

    if (!normalizedTerm) return score;
    if (values.includes(normalizedTerm)) score += normalizedTerm.length > 8 ? 45 : 25;
    if (termDigits && rowDigits.includes(termDigits)) score += 50;

    normalizedTerm.split(/\s+/).forEach((part) => {
      if (part.length >= 4 && values.includes(part)) score += 8;
    });

    return score;
  }, 0);
}

function matchLabel(row: GoogleSheetsRow) {
  return (
    getByAliases(row, ["name", "client", "cliente", "lead", "full name"]) ||
    getByAliases(row, ["email", "correo"]) ||
    getByAliases(row, ["phone", "telefono", "teléfono"]) ||
    `Fila ${row.rowNumber}`
  );
}

export function getFundingField(row: GoogleSheetsRow, aliases: string[]) {
  return getByAliases(row, aliases);
}

function importantFields(row: GoogleSheetsRow) {
  const preferredKeys = [
    "name",
    "client",
    "cliente",
    "lead",
    "email",
    "phone",
    "telefono",
    "status",
    "estado",
    "stage",
    "etapa",
    "service",
    "servicio",
    "notes",
    "observaciones",
    "comentarios",
  ];
  const entries = Object.entries(row.values).filter(([, value]) => value.trim());
  const preferred = entries.filter(([key]) => preferredKeys.some((preferredKey) => key.includes(preferredKey)));
  const selected = preferred.length > 0 ? preferred : entries.slice(0, 6);

  return selected.slice(0, 8).map(([label, value]) => ({
    label,
    value,
  }));
}

function operationalTitle(row: GoogleSheetsRow) {
  return (
    getByAliases(row, ["title", "titulo", "name", "client", "cliente", "lead", "topic", "tema"]) ||
    `Fila ${row.rowNumber}`
  );
}

function operationalExcerpt(row: GoogleSheetsRow) {
  return (
    getByAliases(row, ["summary", "resumen", "notes", "observaciones", "comentarios", "description", "descripcion", "descripción"]) ||
    importantFields(row)
      .slice(0, 3)
      .map((field) => `${field.label}: ${field.value}`)
      .join(" | ")
  );
}

function uniqueTerms(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function searchFundingRows(input: {
  clientId?: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<GoogleSheetsFundingSearchResult> {
  const config = getGoogleSheetsConfig();
  const values = await getValues(config.fundingRange);
  const rows = rowsFromValues(values);
  const matches: GoogleSheetsFundingMatch[] = rows
    .map((row) => ({
      row,
      score: scoreRow(row, input),
      label: matchLabel(row),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    bestMatch: matches[0] ?? null,
    matches,
    sourceUsed: `Google Sheets: ${config.fundingRange}`,
    notes: matches.length ? [] : ["No se encontro coincidencia exacta en la hoja de funding."],
  };
}

export async function searchOperationalRows(input: {
  query: string;
  extraTerms?: string[];
}): Promise<GoogleSheetsOperationalSearchResult> {
  const config = getGoogleSheetsConfig();
  const terms = uniqueTerms([input.query, ...(input.extraTerms ?? [])]);
  const rowsByRange = await Promise.all(
    config.operationalRanges.map(async (range) => {
      const values = await getValues(range);
      return {
        range,
        rows: rowsFromValues(values),
      };
    })
  );
  const matches: GoogleSheetsOperationalMatch[] = rowsByRange
    .flatMap(({ range, rows }) =>
      rows.map((row) => ({
        row,
        range,
        score: scoreRowByTerms(row, terms),
        title: operationalTitle(row),
        excerpt: operationalExcerpt(row),
        highlightedFields: importantFields(row),
      }))
    )
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    matches,
    sourceUsed: `Google Sheets: ${config.operationalRanges.join(", ")}`,
    notes: matches.length ? [] : ["No se encontraron coincidencias operativas en Google Sheets."],
  };
}
