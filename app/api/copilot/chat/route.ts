import { NextRequest, NextResponse } from "next/server";
import {
  appendCopilotMessage,
  ensureCopilotConversation,
  getCurrentUserId,
} from "@/lib/copilot/history";
import { runCopilotOrchestrator } from "@/lib/copilot/orchestrator";
import type { CopilotChatMessage, CopilotChatRequest } from "@/lib/copilot/types";

function isHistory(value: unknown): value is CopilotChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        "content" in item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
  );
}

function parseRequestBody(body: unknown): CopilotChatRequest | null {
  if (typeof body !== "object" || body === null || !("message" in body)) {
    return null;
  }

  const message = body.message;

  if (typeof message !== "string" || message.trim().length === 0) {
    return null;
  }

  const history = "history" in body ? body.history : undefined;
  const conversationId = "conversationId" in body ? body.conversationId : undefined;

  if (history !== undefined && !isHistory(history)) {
    return null;
  }

  if (conversationId !== undefined && typeof conversationId !== "string") {
    return null;
  }

  return {
    message: message.trim(),
    history,
    conversationId,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = parseRequestBody(body);

    if (!input) {
      return NextResponse.json(
        { error: "El body debe incluir message y un history opcional valido." },
        { status: 400 }
      );
    }

    let conversationId = input.conversationId;
    let userId: string;

    try {
      userId = await getCurrentUserId();
    } catch (authError) {
      console.error("Usuario no autenticado en /api/copilot/chat:", authError);
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    try {
      const conversation = await ensureCopilotConversation(
        userId,
        conversationId,
        input.message
      );
      conversationId = conversation.id;

      await appendCopilotMessage({
        userId,
        conversationId,
        role: "user",
        content: input.message,
      });
    } catch (storageError) {
      console.error("No pudimos persistir mensaje de usuario Copilot:", storageError);
    }

    const response = await runCopilotOrchestrator(input);
    const responseWithConversation = {
      ...response,
      conversationId,
    };

    if (conversationId) {
      try {
        await appendCopilotMessage({
          userId,
          conversationId,
          role: "assistant",
          content: response.answer,
          response: responseWithConversation,
        });
      } catch (storageError) {
        console.error("No pudimos persistir respuesta Copilot:", storageError);
      }
    }

    return NextResponse.json(responseWithConversation);
  } catch (error) {
    console.error("Error en /api/copilot/chat:", error);
    return NextResponse.json(
      { error: "Error interno generando respuesta mock de Copilot." },
      { status: 500 }
    );
  }
}
