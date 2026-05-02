import { NextRequest, NextResponse } from "next/server";
import {
  getCopilotConversation,
  getCurrentUserId,
  listCopilotMessages,
} from "@/lib/copilot/history";

type Params = Promise<{ conversationId: string }>;

function isAuthError(error: unknown) {
  return error instanceof Error && error.message.includes("Usuario no autenticado");
}

export async function GET(_request: NextRequest, context: { params: Params }) {
  try {
    const { conversationId } = await context.params;
    const userId = await getCurrentUserId();
    const conversation = await getCopilotConversation(userId, conversationId);

    if (!conversation) {
      return NextResponse.json({ error: "Conversacion no encontrada." }, { status: 404 });
    }

    const messages = await listCopilotMessages(userId, conversationId);
    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error("Error cargando mensajes Copilot:", error);

    if (isAuthError(error)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "No pudimos cargar la conversacion." },
      { status: 500 }
    );
  }
}
