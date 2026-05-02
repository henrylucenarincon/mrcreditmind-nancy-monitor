export type FunnelUpConfig = {
  apiKey: string;
  locationId: string;
  baseUrl: string;
};

export type FunnelUpCustomField = {
  id?: string;
  key?: string;
  name?: string;
  value: string;
};

export type FunnelUpContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  type?: string;
  tags?: string[];
  dateAdded?: string;
  companyName?: string;
  assignedTo?: string;
  customFields?: FunnelUpCustomField[];
  rawMetadata?: Record<string, string>;
};

export type FunnelUpSearchResult = {
  bestMatch: FunnelUpContact | null;
  matches: FunnelUpContact[];
};
