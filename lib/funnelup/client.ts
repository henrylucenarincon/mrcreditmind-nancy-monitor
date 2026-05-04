import type {
  FunnelUpConfig,
  FunnelUpContact,
  FunnelUpCustomField,
  FunnelUpSearchResult,
} from "./types";

const DEFAULT_BASE_URL = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

type JsonObject = Record<string, unknown>;

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedString(value: JsonObject, keys: string[]) {
  for (const key of keys) {
    const direct = getString(value[key]);
    if (direct) return direct;
  }

  return "";
}

function normalizeCustomField(value: unknown): FunnelUpCustomField | null {
  if (!isObject(value)) return null;

  const rawValue =
    getString(value.value) ||
    getString(value.field_value) ||
    getString(value.fieldValue) ||
    getString(value.defaultValue);

  if (!rawValue) return null;

  return {
    id: getString(value.id),
    key: getString(value.key),
    name: getString(value.name) || getString(value.fieldName),
    value: rawValue,
  };
}

function normalizeCustomFields(value: unknown): FunnelUpCustomField[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeCustomField(item))
    .filter((item): item is FunnelUpCustomField => item !== null);
}

function getRawMetadata(value: JsonObject) {
  const metadataKeys = [
    "additionalEmails",
    "additionalPhones",
    "businessId",
    "city",
    "country",
    "postalCode",
    "state",
    "website",
  ];

  return metadataKeys.reduce<Record<string, string>>((acc, key) => {
    const entry = value[key];

    if (typeof entry === "string" && entry.trim()) {
      acc[key] = entry;
    }

    if (Array.isArray(entry) && entry.length > 0) {
      acc[key] = entry.join(", ");
    }

    return acc;
  }, {});
}

function normalizeContact(value: unknown): FunnelUpContact | null {
  if (!isObject(value)) return null;

  const id = getString(value.id) || getString(value.contactId);
  if (!id) return null;

  return {
    id,
    firstName: getString(value.firstName),
    lastName: getString(value.lastName),
    name: getString(value.name) || getString(value.fullName) || getString(value.contactName),
    email: getString(value.email),
    phone: getString(value.phone),
    source: getString(value.source),
    type: getString(value.type),
    tags: getStringArray(value.tags),
    dateAdded: getString(value.dateAdded) || getString(value.createdAt),
    companyName: getString(value.companyName),
    assignedTo: getNestedString(value, ["assignedTo", "assignedToName"]),
    customFields: normalizeCustomFields(value.customFields || value.customField),
    rawMetadata: getRawMetadata(value),
  };
}

function extractContacts(payload: unknown): FunnelUpContact[] {
  if (!isObject(payload)) return [];

  const candidates = [
    payload.contacts,
    payload.contact ? [payload.contact] : null,
    payload.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => normalizeContact(item))
        .filter((item): item is FunnelUpContact => item !== null);
    }
  }

  const single = normalizeContact(payload);
  return single ? [single] : [];
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function contactName(contact: FunnelUpContact) {
  const composed = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
  return contact.name || composed;
}

function scoreContact(contact: FunnelUpContact, query: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  const queryDigits = digitsOnly(query);
  const fields = [
    contact.id,
    contactName(contact),
    contact.email,
    contact.phone,
  ].map((value) => normalizeSearchTerm(value || ""));

  let score = 0;

  fields.forEach((field) => {
    if (!field) return;
    if (field === normalizedQuery) score += 100;
    if (field.includes(normalizedQuery)) score += 40;
  });

  if (queryDigits && digitsOnly(contact.phone || "").includes(queryDigits)) {
    score += 70;
  }

  if (contact.email && normalizedQuery.includes("@") && contact.email.toLowerCase() === normalizedQuery) {
    score += 90;
  }

  return score;
}

function getFunnelUpConfig(): FunnelUpConfig {
  const apiKey = process.env.FUNNELUP_API_KEY || process.env.LEADCONNECTOR_API_KEY;
  const locationId = process.env.FUNNELUP_LOCATION_ID || process.env.LEADCONNECTOR_LOCATION_ID;
  const baseUrl = process.env.FUNNELUP_API_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey || !locationId) {
    throw new Error("FunnelUp no esta configurado.");
  }

  return {
    apiKey,
    locationId,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
}

export function hasFunnelUpConfig() {
  return Boolean(
    (process.env.FUNNELUP_API_KEY || process.env.LEADCONNECTOR_API_KEY) &&
      (process.env.FUNNELUP_LOCATION_ID || process.env.LEADCONNECTOR_LOCATION_ID)
  );
}

export function getFunnelUpContactUrl(contactId: string) {
  if (!hasFunnelUpConfig()) return "";

  const config = getFunnelUpConfig();
  return `https://app.gohighlevel.com/v2/location/${config.locationId}/contacts/detail/${contactId}`;
}

async function requestFunnelUp(path: string, init?: RequestInit) {
  const config = getFunnelUpConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      Version: API_VERSION,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FunnelUp respondio ${response.status}.`);
  }

  return response.json() as Promise<unknown>;
}

function extractContactId(query: string) {
  const explicit = query.match(/(?:contactId|contact_id|id)\s*[:=]\s*([A-Za-z0-9_-]+)/i);
  if (explicit?.[1]) return explicit[1];

  const trimmed = query.trim();
  return /^[A-Za-z0-9_-]{12,}$/.test(trimmed) && !trimmed.includes("@") ? trimmed : "";
}

export async function getFunnelUpContactById(contactId: string): Promise<FunnelUpContact | null> {
  const payload = await requestFunnelUp(`/contacts/${encodeURIComponent(contactId)}`);
  return extractContacts(payload)[0] ?? null;
}

export async function searchFunnelUpContacts(query: string): Promise<FunnelUpSearchResult> {
  const contactId = extractContactId(query);

  if (contactId) {
    const contact = await getFunnelUpContactById(contactId);
    return {
      bestMatch: contact,
      matches: contact ? [contact] : [],
    };
  }

  const config = getFunnelUpConfig();
  const params = new URLSearchParams({
    locationId: config.locationId,
    query: query.trim(),
  });

  const payload = await requestFunnelUp(`/contacts/?${params.toString()}`);
  const matches = extractContacts(payload)
    .map((contact) => ({
      contact,
      score: scoreContact(contact, query),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.contact);

  return {
    bestMatch: matches[0] ?? null,
    matches,
  };
}

export function formatFunnelUpContactName(contact: FunnelUpContact) {
  return contactName(contact) || contact.email || contact.phone || contact.id;
}
