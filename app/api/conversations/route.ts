import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("conversations_summary")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Supabase error /api/conversations:", error);
      return NextResponse.json(
        { error: "Error cargando conversaciones." },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: data ?? [] });
  } catch (error) {
    console.error("Server error /api/conversations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}