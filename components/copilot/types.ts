import type { ReactNode } from "react";
import type { CopilotResponse } from "@/lib/copilot/types";

export type CopilotHistoryItem = {
  id: string;
  title: string;
  source: string;
  status: "Activo" | "Pendiente" | "Cerrado";
  time: string;
  summary: string;
};

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  author: string;
  time: string;
  content: string;
  response?: CopilotResponse;
};

export type CopilotContextMetric = {
  label: string;
  value: string;
  tone: "info" | "success" | "warning";
};

export type CopilotContextItem = {
  label: string;
  value: string;
  icon?: ReactNode;
};

export type CopilotAction = {
  id: string;
  label: string;
  detail: string;
  status: "Listo" | "Revisar" | "Borrador";
};
