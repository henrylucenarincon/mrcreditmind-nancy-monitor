import type {
  GoogleDriveConfig,
  GoogleDriveFile,
  GoogleDriveSearchMatch,
  GoogleDriveSearchResult,
  GoogleDriveWorkspace,
} from "./types";

const DEFAULT_BASE_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function uniqueTerms(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getGoogleDriveConfig(): GoogleDriveConfig {
  const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
  const baseUrl = process.env.GOOGLE_DRIVE_API_BASE_URL || DEFAULT_BASE_URL;

  if (!accessToken && (!clientEmail || !privateKey)) {
    throw new Error("Google Drive no esta configurado.");
  }

  return {
    accessToken,
    clientEmail,
    privateKey: privateKey ? normalizePrivateKey(privateKey) : undefined,
    rootFolderId,
    sharedDriveId,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
}

export function hasGoogleDriveConfig() {
  return Boolean(
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN ||
      (process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY)
  );
}

function normalizeDriveFile(value: unknown): GoogleDriveFile | null {
  if (!isObject(value)) return null;

  const id = getString(value.id);
  const name = getString(value.name);
  const mimeType = getString(value.mimeType);

  if (!id || !name || !mimeType) return null;

  return {
    id,
    name,
    mimeType,
    webViewLink: getString(value.webViewLink),
    modifiedTime: getString(value.modifiedTime),
    parents: getStringArray(value.parents),
  };
}

async function getServiceAccountAccessToken(config: GoogleDriveConfig) {
  if (!config.clientEmail || !config.privateKey) {
    throw new Error("Service account de Google Drive incompleta.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claims = {
    iss: config.clientEmail,
    scope: DRIVE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyToArrayBuffer(config.privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
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

async function getAccessToken(config: GoogleDriveConfig) {
  return config.accessToken || getServiceAccountAccessToken(config);
}

async function listDriveFiles(q: string, pageSize = 20): Promise<GoogleDriveFile[]> {
  const config = getGoogleDriveConfig();
  const token = await getAccessToken(config);
  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,parents)",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    spaces: "drive",
    orderBy: "modifiedTime desc,name",
  });

  if (config.sharedDriveId) {
    params.set("corpora", "drive");
    params.set("driveId", config.sharedDriveId);
  }

  const response = await fetch(`${config.baseUrl}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Drive respondio ${response.status}: ${errorText.slice(0, 240)}`
    );
  }

  const payload = (await response.json()) as unknown;
  if (!isObject(payload) || !Array.isArray(payload.files)) return [];

  return payload.files
    .map((item) => normalizeDriveFile(item))
    .filter((item): item is GoogleDriveFile => item !== null);
}

function folderQuery(terms: string[]) {
  const nameClauses = terms.map((term) => `name contains '${escapeDriveQueryValue(term)}'`);
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const parentClause = rootFolderId ? ` and '${escapeDriveQueryValue(rootFolderId)}' in parents` : "";

  return `mimeType = '${FOLDER_MIME_TYPE}' and trashed = false${parentClause} and (${nameClauses.join(" or ")})`;
}

function childrenQuery(folderId: string, foldersOnly: boolean) {
  const mimeClause = foldersOnly
    ? ` and mimeType = '${FOLDER_MIME_TYPE}'`
    : ` and mimeType != '${FOLDER_MIME_TYPE}'`;

  return `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false${mimeClause}`;
}

function resourceQuery(terms: string[], parentFolderId?: string) {
  const nameClauses = terms.map((term) => `name contains '${escapeDriveQueryValue(term)}'`);
  const rootFolderId = parentFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const parentClause = rootFolderId ? ` and '${escapeDriveQueryValue(rootFolderId)}' in parents` : "";

  return `trashed = false${parentClause} and (${nameClauses.join(" or ")})`;
}

function scoreFolder(folder: GoogleDriveFile, terms: string[]) {
  const folderName = normalizeSearchTerm(folder.name);

  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeSearchTerm(term);
    const termDigits = digitsOnly(term);

    if (!normalizedTerm) return score;
    if (folderName === normalizedTerm) return score + 100;
    if (folderName.includes(normalizedTerm)) return score + 45;
    if (termDigits && digitsOnly(folder.name).includes(termDigits)) return score + 35;
    return score;
  }, 0);
}

function scoreResource(file: GoogleDriveFile, terms: string[]) {
  const fileName = normalizeSearchTerm(file.name);

  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeSearchTerm(term);
    const termDigits = digitsOnly(term);

    if (!normalizedTerm) return score;
    if (fileName === normalizedTerm) return score + 110;
    if (fileName.includes(normalizedTerm)) return score + 50;
    if (termDigits && digitsOnly(file.name).includes(termDigits)) return score + 30;
    return score;
  }, 0);
}

function isFolder(file: GoogleDriveFile) {
  return file.mimeType === FOLDER_MIME_TYPE;
}

function findNamedFolder(folders: GoogleDriveFile[], keywords: string[]) {
  return (
    folders.find((folder) => {
      const name = normalizeSearchTerm(folder.name);
      return keywords.some((keyword) => name.includes(keyword));
    }) ?? null
  );
}

function buildSearchTerms(input: {
  clientId: string;
  name?: string;
  email?: string;
  phone?: string;
}) {
  return uniqueTerms([
    input.name || "",
    input.email || "",
    input.phone || "",
    digitsOnly(input.phone || ""),
    input.clientId,
  ]).slice(0, 6);
}

function buildGenericSearchTerms(query: string) {
  const words = query
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}@._+-]/gu, ""))
    .filter((word) => word.length >= 3);

  return uniqueTerms([query, ...words, digitsOnly(query)]).slice(0, 8);
}

export async function findClientDriveWorkspace(input: {
  clientId: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<GoogleDriveWorkspace> {
  const terms = buildSearchTerms(input);
  const possibleFolders = terms.length > 0 ? await listDriveFiles(folderQuery(terms), 10) : [];
  const sortedFolders = possibleFolders
    .map((folder) => ({ folder, score: scoreFolder(folder, terms) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.folder);
  const mainFolder = sortedFolders[0] ?? null;

  if (!mainFolder) {
    return {
      mainFolder: null,
      possibleFolders: sortedFolders,
      onboardingFolder: null,
      submissionFolder: null,
      documents: [],
      sourceUsed: "Google Drive",
      notes: ["No se pudo determinar una carpeta exacta del cliente en Google Drive."],
    };
  }

  const childFolders = await listDriveFiles(childrenQuery(mainFolder.id, true), 25);
  const onboardingFolder = findNamedFolder(childFolders, ["onboarding", "intake", "registro"]);
  const submissionFolder = findNamedFolder(childFolders, ["submission", "solicitud", "aplicacion", "application"]);
  const foldersToRead = [mainFolder, onboardingFolder, submissionFolder].filter(
    (folder): folder is GoogleDriveFile => folder !== null
  );
  const documentsByFolder = await Promise.all(
    foldersToRead.map(async (folder) => {
      const documents = await listDriveFiles(childrenQuery(folder.id, false), 50);
      return documents.map((document) => ({
        ...document,
        parents: document.parents?.length ? document.parents : [folder.id],
      }));
    })
  );

  return {
    mainFolder,
    possibleFolders: sortedFolders.slice(0, 5),
    onboardingFolder,
    submissionFolder,
    documents: documentsByFolder.flat(),
    sourceUsed: "Google Drive",
    notes: [],
  };
}

function matchPath(file: GoogleDriveFile, parentFolder?: GoogleDriveFile) {
  return parentFolder ? `${parentFolder.name}/${file.name}` : file.name;
}

function toSearchMatch(
  file: GoogleDriveFile,
  terms: string[],
  parentFolder?: GoogleDriveFile
): GoogleDriveSearchMatch {
  return {
    file,
    kind: isFolder(file) ? "folder" : "file",
    path: matchPath(file, parentFolder),
    parentFolder,
    score: scoreResource(file, terms),
  };
}

function sortMatches(matches: GoogleDriveSearchMatch[]) {
  return matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.file.modifiedTime || "").localeCompare(a.file.modifiedTime || "");
  });
}

export async function searchDriveFolderOrFile(input: {
  query: string;
  clientId?: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<GoogleDriveSearchResult> {
  const notes: string[] = [];
  const resourceTerms = buildGenericSearchTerms(input.query);
  const workspace = input.clientId
    ? await findClientDriveWorkspace({
        clientId: input.clientId,
        name: input.name,
        email: input.email,
        phone: input.phone,
      })
    : null;

  if (workspace?.mainFolder) {
    const foldersToSearch = [
      workspace.mainFolder,
      workspace.onboardingFolder,
      workspace.submissionFolder,
    ].filter((folder): folder is GoogleDriveFile => folder !== null);
    const scopedMatches = (
      await Promise.all(
        foldersToSearch.map(async (folder) => {
          const matches = await listDriveFiles(resourceQuery(resourceTerms, folder.id), 25);
          return matches.map((file) => toSearchMatch(file, resourceTerms, folder));
        })
      )
    ).flat();
    const workspaceFolders = foldersToSearch.map((folder) => toSearchMatch(folder, resourceTerms));
    const matches = sortMatches([...workspaceFolders, ...scopedMatches]).slice(0, 10);

    return {
      bestMatch: matches[0] ?? null,
      matches,
      sourceUsed: "Google Drive",
      notes,
    };
  }

  if (workspace && !workspace.mainFolder) {
    notes.push(...workspace.notes);
  }

  const globalMatches = resourceTerms.length > 0
    ? await listDriveFiles(resourceQuery(resourceTerms), 20)
    : [];
  const matches = sortMatches(globalMatches.map((file) => toSearchMatch(file, resourceTerms))).slice(0, 10);

  if (matches.length === 0) {
    notes.push("No se pudo identificar una carpeta o archivo exacto en Google Drive.");
  }

  return {
    bestMatch: matches[0] ?? null,
    matches,
    sourceUsed: "Google Drive",
    notes,
  };
}
