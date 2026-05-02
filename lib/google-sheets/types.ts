export type GoogleSheetsConfig = {
  accessToken?: string;
  clientEmail?: string;
  privateKey?: string;
  spreadsheetId: string;
  fundingRange: string;
  operationalRanges: string[];
  baseUrl: string;
};

export type GoogleSheetsRow = {
  rowNumber: number;
  values: Record<string, string>;
  raw: string[];
};

export type GoogleSheetsFundingMatch = {
  row: GoogleSheetsRow;
  score: number;
  label: string;
};

export type GoogleSheetsFundingSearchResult = {
  bestMatch: GoogleSheetsFundingMatch | null;
  matches: GoogleSheetsFundingMatch[];
  sourceUsed: string;
  notes: string[];
};

export type GoogleSheetsOperationalMatch = {
  row: GoogleSheetsRow;
  score: number;
  title: string;
  excerpt: string;
  range: string;
  highlightedFields: Array<{
    label: string;
    value: string;
  }>;
};

export type GoogleSheetsOperationalSearchResult = {
  matches: GoogleSheetsOperationalMatch[];
  sourceUsed: string;
  notes: string[];
};
