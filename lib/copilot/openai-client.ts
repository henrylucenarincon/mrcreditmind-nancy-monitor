import { COPILOT_AGENT_INSTRUCTIONS } from "./prompts";
import { buildCopilotResponse } from "./response-builder";
import type {
  CopilotChatMessage,
  CopilotOrchestratorResult,
  CopilotResponse,
  CopilotToolResult,
} from "./types";
import { executeCopilotTool } from "./tool-executor";
import { COPILOT_OPENAI_TOOLS } from "./tool-registry";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";
const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY_MESSAGES = 12;

type OpenAIInputItem = Record<string, unknown>;

type OpenAIResponse = {
  output?: OpenAIInputItem[];
  output_text?: string;
};

type OpenAIFunctionCall = {
  type: "function_call";
  name: string;
  call_id: string;
  arguments: string;
};

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY para Nancy Copilot.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  };
}

function buildInput(
  history: CopilotChatMessage[] | undefined,
  message: string
): OpenAIInputItem[] {
  const recentHistory = (history ?? []).slice(-MAX_HISTORY_MESSAGES);

  return [
    ...recentHistory.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: message,
    },
  ];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFunctionCall(item: OpenAIInputItem): item is OpenAIFunctionCall {
  return (
    item.type === "function_call" &&
    typeof item.name === "string" &&
    typeof item.call_id === "string" &&
    typeof item.arguments === "string"
  );
}

function parseArguments(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractOutputText(response: OpenAIResponse) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    const content = item.content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (isObject(part) && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function createResponse(input: OpenAIInputItem[], model: string, apiKey: string) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: COPILOT_AGENT_INSTRUCTIONS,
      input,
      tools: COPILOT_OPENAI_TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI Responses API fallo (${response.status}): ${errorText.slice(0, 500)}`
    );
  }

  return (await response.json()) as OpenAIResponse;
}

function buildResponseFromModelAnswer(
  answer: string,
  toolResults: Array<CopilotToolResult<unknown>>
): CopilotResponse {
  const result: CopilotOrchestratorResult = {
    intent: "general",
    toolResults,
  };
  const structured = buildCopilotResponse(result);
  const sources = [
    ...structured.sources,
    {
      id: "openai-conversational-model",
      label: "OpenAI conversational model",
      type: "internal" as const,
      status: "used" as const,
    },
  ];

  return {
    ...structured,
    answer: answer || structured.answer,
    sources: sources.filter(
      (source, index, list) => list.findIndex((item) => item.id === source.id) === index
    ),
  };
}

export async function runOpenAICopilot(input: {
  message: string;
  history?: CopilotChatMessage[];
}): Promise<CopilotResponse> {
  const { apiKey, model } = getOpenAIConfig();
  const conversationInput = buildInput(input.history, input.message);
  const toolResults: Array<CopilotToolResult<unknown>> = [];
  let response = await createResponse(conversationInput, model, apiKey);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const output = response.output ?? [];
    const functionCalls = output.filter(isFunctionCall);

    conversationInput.push(...output);

    if (functionCalls.length === 0) {
      return buildResponseFromModelAnswer(extractOutputText(response), toolResults);
    }

    const executedTools = await Promise.all(
      functionCalls.map(async (call) => {
        const executed = await executeCopilotTool(call.name, parseArguments(call.arguments));
        return {
          call,
          executed,
        };
      })
    );

    executedTools.forEach(({ call, executed }) => {
      toolResults.push(executed.result);
      conversationInput.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify({
          tool: executed.result.tool,
          source: executed.result.source,
          data: executed.result.data,
        }),
      });
    });

    response = await createResponse(conversationInput, model, apiKey);
  }

  return buildResponseFromModelAnswer(
    "Revise varias fuentes, pero no pude cerrar una respuesta final completa dentro del limite de herramientas. Te dejo el contexto disponible y recomiendo intentar con una pregunta mas especifica.",
    toolResults
  );
}
