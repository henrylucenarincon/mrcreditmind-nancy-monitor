import { NextResponse } from "next/server";
import {
  createCopilotConversation,
  getCurrentUserId,
  listCopilotConversations,
} from "@/lib/copilot/history";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const conversations = await listCopilotConversations(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error listando conversaciones Copilot:", error);
    return NextResponse.json({ conversations: [], setupRequired: true });
  }
}

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const conversation = await createCopilotConversation(userId);
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creando conversacion Copilot:", error);
    return NextResponse.json(
      { error: "No pudimos crear la conversacion." },
      { status: 500 }
    );
  }
}
