import Anthropic from "@anthropic-ai/sdk";
import { COPILOT_AGENT_INSTRUCTIONS } from "./prompts";
import type {
  CopilotChatMessage,
  CopilotResponse,
  CopilotSource,
  CopilotToolResult,
} from "./types";
import { executeCopilotTool } from "./tool-executor";
import { COPILOT_ANTHROPIC_TOOLS } from "./tool-registry";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOOL_ROUNDS = 8;
const MAX_HISTORY_MESSAGES = 20;

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

export async function runClaudeCopilot(input: {
  message: string;
  history?: CopilotChatMessage[];
}): Promise<CopilotResponse> {
  const { client, model } = getAnthropicClient();
  const messages = buildMessages(input.history, input.message);
  const toolResults: Array<CopilotToolResult<unknown>> = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model,
      system: COPILOT_AGENT_INSTRUCTIONS,
      messages,
      tools: COPILOT_ANTHROPIC_TOOLS,
      max_tokens: 4096,
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
        const executed = await executeCopilotTool(
          block.name,
          block.input as Record<string, unknown>
        );
        toolResults.push(executed.result);
        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify({
            tool: executed.result.tool,
            source: executed.result.source,
            data: executed.result.data,
          }),
        };
      })
    );

    messages.push({ role: "user", content: toolResultContents });
  }

  return buildFinalResponse(
    "Revisé varias fuentes pero no pude cerrar una respuesta final dentro del límite de herramientas. Te dejo el contexto disponible — intenta con una pregunta más específica.",
    toolResults
  );
}
