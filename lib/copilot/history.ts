import { createClient, getSupabaseServer } from "@/lib/supabase-server";
import type { CopilotResponse, CopilotRole } from "./types";

export type CopilotConversationRecord = {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type CopilotMessageRecord = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: CopilotRole;
  content: string;
  response: CopilotResponse | null;
  created_at: string;
};

const CONVERSATIONS_TABLE = "nancy_copilot_conversations";
const MESSAGES_TABLE = "nancy_copilot_messages";

export async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Usuario no autenticado.");
  }

  return user.id;
}

export function buildConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Nueva conversacion";
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export async function listCopilotConversations(userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as CopilotConversationRecord[];
}

export async function createCopilotConversation(userId: string, title = "Nueva conversacion") {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .insert({ user_id: userId, title })
    .select("*")
    .single();

  if (error) throw error;
  return data as CopilotConversationRecord;
}

export async function getCopilotConversation(userId: string, conversationId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  return data as CopilotConversationRecord | null;
}

export async function ensureCopilotConversation(
  userId: string,
  conversationId: string | undefined,
  firstMessage: string
) {
  if (conversationId) {
    const existing = await getCopilotConversation(userId, conversationId);
    if (existing) return existing;
  }

  return createCopilotConversation(userId, buildConversationTitle(firstMessage));
}

export async function listCopilotMessages(userId: string, conversationId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CopilotMessageRecord[];
}

export async function appendCopilotMessage(input: {
  userId: string;
  conversationId: string;
  role: CopilotRole;
  content: string;
  response?: CopilotResponse | null;
}) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      response: input.response ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from(CONVERSATIONS_TABLE)
    .update({
      updated_at: new Date().toISOString(),
      summary: input.content.slice(0, 240),
    })
    .eq("id", input.conversationId)
    .eq("user_id", input.userId);

  return data as CopilotMessageRecord;
}
