import type { Metadata } from "next";
import { CopilotShell } from "@/components/copilot/CopilotShell";

export const metadata: Metadata = {
  title: "Nancy Copilot | Mr.CREDITMIND",
  description:
    "Base visual de Nancy Copilot para asistencia comercial interna de Mr.CREDITMIND.",
};

export default function CopilotPage() {
  return <CopilotShell />;
}
