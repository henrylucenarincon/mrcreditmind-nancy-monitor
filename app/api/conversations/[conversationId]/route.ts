import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type Params = Promise<{ conversationId: string }>;

export async function GET(
  _request: NextRequest,
  context: { params: Params }
) {
  try {
    const { conversationId } = await context.params;
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("conversations_log")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("message_timestamp", { ascending: true });

    if (error) {
      console.error("Supabase error /api/conversations/[conversationId]:", error);
      return NextResponse.json(
        { error: "Error cargando mensajes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch (error) {
    console.error("Server error /api/conversations/[conversationId]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}