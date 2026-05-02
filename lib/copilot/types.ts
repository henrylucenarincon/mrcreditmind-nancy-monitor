export type CopilotRole = "user" | "assistant";

export type CopilotChatMessage = {
  role: CopilotRole;
  content: string;
};

export type CopilotChatRequest = {
  message: string;
  history?: CopilotChatMessage[];
  conversationId?: string;
};

export type CopilotIntent =
  | "client_lookup"
  | "onboarding_status"
  | "documents"
  | "funding"
  | "operational_search"
  | "general";

export type CopilotSource = {
  id: string;
  label: string;
  type: "mock" | "funnelup" | "drive" | "sheets" | "internal";
  status: "used" | "available" | "pending";
};

export type CopilotCard = {
  id: string;
  title: string;
  value: string;
  description?: string;
  tone: "info" | "success" | "warning" | "danger" | "neutral";
};

export type CopilotAction = {
  id: string;
  label: string;
  description: string;
  type: "draft_message" | "review_data" | "open_record" | "request_documents";
};

export type CopilotContextEntry = {
  label: string;
  value: string;
};

export type CopilotResponse = {
  answer: string;
  cards: CopilotCard[];
  actions: CopilotAction[];
  context: CopilotContextEntry[];
  sources: CopilotSource[];
  conversationId?: string;
};

export type CopilotToolResult<TData> = {
  tool: string;
  source: CopilotSource;
  data: TData;
};

export type ClientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  possibleMatches?: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>;
};

export type ClientSummary = {
  clientId: string;
  recommendedService: string;
  intentLevel: "low" | "medium" | "high";
  lastSignal: string;
  nextBestStep: string;
  name?: string;
  email?: string;
  phone?: string;
  contactUrl?: string;
  status?: string;
  tags?: string[];
  summaryFields?: Array<{
    label: string;
    value: string;
  }>;
  rawMetadata?: Record<string, string>;
  consolidated?: {
    identity?: {
      name?: string;
      email?: string;
      phone?: string;
      contactUrl?: string;
    };
    onboarding?: {
      status: string;
      missingItems: string[];
      notes: string[];
      source: string;
    };
    documents?: {
      found: string[];
      needsReview: string[];
      missing: string[];
      notes: string[];
      source: string;
    };
    funding?: {
      status: string;
      approvedAmount?: string;
      stage?: string;
      notes: string;
      blockers: string[];
      source: string;
    };
    operations?: {
      summary: string;
      matches: string[];
      notes: string[];
      source: string;
    };
    sources: string[];
    partialNotes: string[];
  };
};

export type OnboardingStatus = {
  clientId: string;
  status: "not_started" | "in_progress" | "complete";
  missingItems: string[];
  completedItems: string[];
  onboardingStatus?: string;
  isComplete?: boolean;
  missingDocuments?: string[];
  lastSubmissionAt?: string;
  notes?: string[];
  sourceUsed?: string;
  observedFields?: Array<{
    label: string;
    value: string;
    confidence: "clear" | "possible";
  }>;
};

export type ClientDocument = {
  id: string;
  name: string;
  type: "credit_report" | "id" | "income" | "agreement" | "other";
  status: "available" | "missing" | "needs_review";
  updatedAt: string;
  link?: string;
  mimeType?: string;
  folderId?: string;
  folderName?: string;
  sourceUsed?: string;
  notes?: string[];
};

export type DriveItem = {
  id: string;
  name: string;
  kind: "folder" | "file";
  path: string;
  link?: string;
  parentFolderName?: string;
  parentFolderId?: string;
  sourceUsed?: string;
  possibleMatches?: Array<{
    id: string;
    name: string;
    kind: "folder" | "file";
    path: string;
    link?: string;
  }>;
  notes?: string[];
};

export type FundingStatus = {
  clientId: string;
  eligibility: "unknown" | "review_needed" | "likely" | "not_ready";
  notes: string;
  blockers: string[];
  fundingStatus?: string;
  approvedAmount?: string;
  stage?: string;
  lastUpdatedAt?: string;
  sourceUsed?: string;
  matchedRow?: Record<string, string>;
  possibleMatches?: Array<{
    label: string;
    score: number;
  }>;
};

export type OperationalDataResult = {
  query: string;
  summary?: string;
  sourceUsed?: string;
  notes?: string[];
  matches: Array<{
    id: string;
    title: string;
    excerpt: string;
    source: string;
    score?: number;
    fields?: Array<{
      label: string;
      value: string;
    }>;
  }>;
};

export type CopilotOrchestratorInput = CopilotChatRequest;

export type CopilotOrchestratorResult = {
  intent: CopilotIntent;
  toolResults: Array<CopilotToolResult<unknown>>;
};
