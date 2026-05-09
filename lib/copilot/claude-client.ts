import Anthropic from "@anthropic-ai/sdk";
import { COPILOT_AGENT_INSTRUCTIONS } from "./prompts";
import { buildUserSystemContext, type TeamMember } from "./team";
import type {
  CopilotChatMessage,
  CopilotResponse,
  CopilotSource,
  CopilotToolResult,
} from "./types";
import { executeCopilotTool } from "./tool-executor";
import { ALL_COPILOT_ANTHROPIC_TOOLS } from "./tool-registry";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOOL_ROUNDS = 5;
const MAX_HISTORY_MESSAGES = 12;
const MAX_TOOL_RESULT_CHARS = 4000;

export type CopilotCallbacks = {
  onToolStart?: (name: string, input: Record<string, unknown>) => void;
  onToolEnd?: (name: string, ok: boolean) => void;
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY para Nancy Copilot.");
  return {
    client: new Anthropic({ apiKey }),
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
  };
}

type AnthropicMessage = Anthropic.Messages.MessageParam;

function buildMessages(
  history: CopilotChatMessage[] | undefined,
  message: string
): AnthropicMessage[] {
  const recentHistory = (history ?? []).slice(-MAX_HISTORY_MESSAGES);
  return [
    ...recentHistory.map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content,
    })),
    { role: "user" as const, content: message },
  ];
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function buildFinalResponse(
  answer: string,
  toolResults: Array<CopilotToolResult<unknown>>
): CopilotResponse {
  const toolSources: CopilotSource[] = toolResults.map((r) => r.source);
  const allSources: CopilotSource[] = [
    ...toolSources,
    { id: "claude-model", label: "Claude", type: "internal" as const, status: "used" as const },
  ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  return {
    answer: answer || "No pude generar una respuesta en este momento.",
    cards: [],
    actions: [],
    context: [],
    sources: allSources,
  };
}

export async function runClaudeCopilot(
  input: {
    message: string;
    history?: CopilotChatMessage[];
  },
  callbacks?: CopilotCallbacks,
  teamMember?: TeamMember
): Promise<CopilotResponse> {
  const { client, model } = getAnthropicClient();
  const messages = buildMessages(input.history, input.message);
  const systemPrompt = teamMember
    ? `${COPILOT_AGENT_INSTRUCTIONS}\n\n---\n${buildUserSystemContext(teamMember)}`
    : COPILOT_AGENT_INSTRUCTIONS;
  const toolResults: Array<CopilotToolResult<unknown>> = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model,
      system: systemPrompt,
      messages,
      tools: ALL_COPILOT_ANTHROPIC_TOOLS,
      max_tokens: 2048,
    });

    if (response.stop_reason === "end_turn") {
      return buildFinalResponse(extractText(response.content), toolResults);
    }

    if (response.stop_reason !== "tool_use") {
      return buildFinalResponse(extractText(response.content), toolResults);
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResultContents = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const blockInput = block.input as Record<string, unknown>;
        callbacks?.onToolStart?.(block.name, blockInput);
        let ok = true;
        try {
          const executed = await executeCopilotTool(block.name, blockInput);
          toolResults.push(executed.result);
          callbacks?.onToolEnd?.(block.name, true);
          const raw = JSON.stringify({ tool: executed.result.tool, source: executed.result.source, data: executed.result.data });
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: raw.length > MAX_TOOL_RESULT_CHARS ? raw.slice(0, MAX_TOOL_RESULT_CHARS) + "... [truncado]" : raw,
          };
        } catch (toolError) {
          ok = false;
          callbacks?.onToolEnd?.(block.name, false);
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify({ error: "Tool execution failed" }),
            is_error: true,
          };
        }
      })
    );

    messages.push({ role: "user", content: toolResultContents });
  }

  return buildFinalResponse(
    "Consulté varias fuentes pero no encontré los datos suficientes para darte una respuesta completa. Puede ser que la información no esté en FunnelUP ni en Drive en un formato que pueda consolidar directamente. ¿Puedes indicarme dónde está ese dato (un Sheet, una carpeta, un campo específico) y lo busco ahí?",
    toolResults
  );
}
