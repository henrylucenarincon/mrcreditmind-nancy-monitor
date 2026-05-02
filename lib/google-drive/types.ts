export type GoogleDriveConfig = {
  accessToken?: string;
  clientEmail?: string;
  privateKey?: string;
  rootFolderId?: string;
  sharedDriveId?: string;
  baseUrl: string;
};

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  parents?: string[];
};

export type GoogleDriveWorkspace = {
  mainFolder: GoogleDriveFile | null;
  possibleFolders: GoogleDriveFile[];
  onboardingFolder: GoogleDriveFile | null;
  submissionFolder: GoogleDriveFile | null;
  documents: GoogleDriveFile[];
  sourceUsed: string;
  notes: string[];
};

export type GoogleDriveSearchMatch = {
  file: GoogleDriveFile;
  kind: "folder" | "file";
  path: string;
  parentFolder?: GoogleDriveFile;
  score: number;
};

export type GoogleDriveSearchResult = {
  bestMatch: GoogleDriveSearchMatch | null;
  matches: GoogleDriveSearchMatch[];
  sourceUsed: string;
  notes: string[];
};
