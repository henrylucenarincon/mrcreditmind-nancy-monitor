import { NextResponse } from "next/server";
import {
  createCopilotConversation,
  getCurrentUserId,
  listCopilotConversations,
} from "@/lib/copilot/history";

function isAuthError(error: unknown) {
  return error instanceof Error && error.message.includes("Usuario no autenticado");
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const conversations = await listCopilotConversations(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error listando conversaciones Copilot:", error);

    if (isAuthError(error)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "No pudimos cargar el historial." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const conversation = await createCopilotConversation(userId);
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creando conversacion Copilot:", error);

    if (isAuthError(error)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "No pudimos crear la conversacion." },
      { status: 500 }
    );
  }
}
