


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Layers3,
  LogOut,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

type ConversationSummary = {
  conversation_id: string;
  channel: string | null;
  contact_id: string | null;
  contact_name: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_direction: string | null;
  total_messages: number | null;
};

type ConversationMessage = {
  id: string;
  conversation_id: string;
  contact_name: string | null;
  contact_id: string | null;
  channel: string | null;
  direction: string | null;
  message_text: string | null;
  message_timestamp: string | null;
  message_type: string | null;
  recommended_service: string | null;
  buying_intent: string | null;
  wants_human: string | null;
  wants_callback: string | null;
};

type LeadSummary = {
  name: string;
  phone: string;
  channel: string;
  totalMessages: number;
  recommendedService: string;
  buyingIntent: string;
  wantsHuman: string;
  wantsCallback: string;
  lastMessageAt: string;
};

const PUERTO_RICO_TIMEZONE = "America/Puerto_Rico";
const COLORS = {
  pageBg: "#141214",
  panelBg: "#1A191B",
  panelBgSoft: "#201F21",
  cardBg: "#151416",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(184,161,127,0.18)",
  gold: "#B8A17F",
  goldSoft: "#DCD1BF",
  cream: "#F0EBE5",
  muted: "#B8B0A5",
  textSoft: "#DCD1BF",
  blue: "#2A4059",
  blueSoft: "#4B5F82",
  dark: "#2A2829",
};

function truncateText(text: string | null, max = 72) {
  if (!text) return "Sin mensaje";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function formatDirection(direction: string | null) {
  if (!direction) return "sin dirección";
  if (direction === "inbound") return "recibido";
  if (direction === "outbound") return "enviado";
  return direction;
}

function formatDateInPR(
  value: string | null,
  options: Intl.DateTimeFormatOptions
) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("es-PR", {
      timeZone: PUERTO_RICO_TIMEZONE,
      ...options,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatSidebarDate(value: string | null) {
  return formatDateInPR(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMessageDate(value: string | null) {
  return formatDateInPR(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getDisplayName(name: string | null, contactId: string | null) {
  return name?.trim() || contactId?.trim() || "Sin nombre";
}

function getDisplayContact(contactId: string | null) {
  return contactId?.trim() || "Sin contacto";
}

function getChannelLabel(channel: string | null) {
  return channel?.trim() || "canal";
}

function getMessageRoleLabel(isOutbound: boolean, contactName: string | null) {
  return isOutbound ? "Nancy" : contactName?.trim() || "Lead";
}

function formatLabel(value: string | null | undefined, fallback = "No definido") {
  if (!value || value.trim() === "") return fallback;
  return value;
}

function normalizeYesNo(value: string | null | undefined) {
  const v = (value || "").trim().toLowerCase();

  if (!v) return "No definido";
  if (["sí", "si", "yes"].includes(v)) return "Sí";
  if (["no"].includes(v)) return "No";

  return value || "No definido";
}

function getBuyingIntentTone(value: string | null | undefined) {
  const v = (value || "").trim().toLowerCase();

  if (v === "alto") {
    return "border-[rgba(184,161,127,0.38)] bg-[rgba(184,161,127,0.14)] text-[#F0EBE5]";
  }

  if (v === "medio") {
    return "border-[rgba(75,95,130,0.38)] bg-[rgba(75,95,130,0.18)] text-[#DCD1BF]";
  }

  if (v === "bajo") {
    return "border-white/10 bg-white/5 text-[#DCD1BF]";
  }

  return "border-white/10 bg-white/5 text-[#DCD1BF]";
}

function getYesNoTone(value: string | null | undefined) {
  const normalized = normalizeYesNo(value);

  if (normalized === "Sí") {
    return "border-[rgba(184,161,127,0.38)] bg-[rgba(184,161,127,0.14)] text-[#F0EBE5]";
  }

  if (normalized === "No") {
    return "border-white/10 bg-white/5 text-[#DCD1BF]";
  }

  return "border-white/10 bg-white/5 text-[#DCD1BF]";
}

function getDirectionBadgeTone(direction: string | null | undefined) {
  if (direction === "outbound") {
    return "border-[rgba(184,161,127,0.28)] bg-[#B8A17F] text-[#1A191B]";
  }

  if (direction === "inbound") {
    return "border-[rgba(75,95,130,0.32)] bg-[rgba(75,95,130,0.18)] text-[#DCD1BF]";
  }

  return "border-white/10 bg-white/5 text-[#DCD1BF]";
}

function getLeadSummary(
  selectedConversation: ConversationSummary | undefined,
  messages: ConversationMessage[]
): LeadSummary | null {
  if (!selectedConversation) return null;

  const sorted = [...messages].sort((a, b) => {
    const aTime = a.message_timestamp ? new Date(a.message_timestamp).getTime() : 0;
    const bTime = b.message_timestamp ? new Date(b.message_timestamp).getTime() : 0;
    return bTime - aTime;
  });

  const enrichedMessage =
    sorted.find(
      (msg) =>
        !!msg.recommended_service ||
        !!msg.buying_intent ||
        !!msg.wants_human ||
        !!msg.wants_callback
    ) ?? null;

  return {
    name:
      selectedConversation.contact_name ||
      selectedConversation.contact_id ||
      "Sin nombre",
    phone: selectedConversation.contact_id || "No definido",
    channel: selectedConversation.channel || "No definido",
    totalMessages: selectedConversation.total_messages || 0,
    recommendedService: enrichedMessage?.recommended_service || "No definido",
    buyingIntent: enrichedMessage?.buying_intent || "No definido",
    wantsHuman: enrichedMessage?.wants_human || "No definido",
    wantsCallback: enrichedMessage?.wants_callback || "No definido",
    lastMessageAt: selectedConversation.last_message_at || "",
  };
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-[rgba(255,255,255,0.02)] p-4" style={{ borderColor: COLORS.border }}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#F0EBE5]">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const loadConversations = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoadingConversations(true);
    }

    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      const json = await res.json();

      const list: ConversationSummary[] = json.conversations ?? [];
      setConversations(list);

      setSelectedConversationId((current) => {
        if (!current) {
          return list[0]?.conversation_id ?? null;
        }

        const exists = list.some((item) => item.conversation_id === current);
        return exists ? current : list[0]?.conversation_id ?? null;
      });
    } catch (error) {
      console.error("Error cargando conversaciones:", error);
    } finally {
      if (showLoader) {
        setLoadingConversations(false);
      }
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, showLoader = true) => {
    if (showLoader) {
      setLoadingMessages(true);
    }

    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setMessages(json.messages ?? []);
    } catch (error) {
      console.error("Error cargando mensajes:", error);
      setMessages([]);
    } finally {
      if (showLoader) {
        setLoadingMessages(false);
      }
    }
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadConversations(false);

    if (selectedConversationId) {
      await loadMessages(selectedConversationId, false);
    }

    setRefreshing(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });

    router.replace("/login");
    router.refresh();
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadConversations());
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      void Promise.resolve().then(() => loadMessages(selectedConversationId));
    }
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    const conversationsInterval = window.setInterval(() => {
      void loadConversations(false);
    }, 5000);

    return () => window.clearInterval(conversationsInterval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const messagesInterval = window.setInterval(() => {
      void loadMessages(selectedConversationId, false);
    }, 3000);

    return () => window.clearInterval(messagesInterval);
  }, [loadMessages, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return conversations;

    return conversations.filter((item) => {
      const name = item.contact_name?.toLowerCase() ?? "";
      const contact = item.contact_id?.toLowerCase() ?? "";
      const text = item.last_message_text?.toLowerCase() ?? "";

      return name.includes(q) || contact.includes(q) || text.includes(q);
    });
  }, [conversations, search]);

  const selectedConversation = conversations.find(
    (item) => item.conversation_id === selectedConversationId
  );

  const leadSummary = useMemo(() => {
    return getLeadSummary(selectedConversation, messages);
  }, [selectedConversation, messages]);

  const shouldShowMobileList = mobileView === "list";
  const shouldShowMobileChat = mobileView === "chat";

  return (
    <main className="min-h-screen text-white lg:h-screen lg:overflow-hidden" style={{ backgroundColor: COLORS.pageBg }}>
      <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:h-screen lg:px-6 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <div className="overflow-hidden rounded-[28px] border bg-[linear-gradient(135deg,rgba(184,161,127,0.12)_0%,rgba(42,40,41,0.32)_38%,rgba(42,64,89,0.18)_100%)] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6" style={{ borderColor: COLORS.borderSoft }}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex items-center gap-3">
                  <Image
                    src="/brand/mrcreditmind-logo.svg"
                    alt="Mr. CREDITMIND"
                    width={220}
                    height={40}
                    className="h-auto w-[150px] opacity-95 sm:w-[180px] lg:w-[210px]"
                    priority
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-[#171618] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]" style={{ borderColor: COLORS.borderSoft }}>
                    <Image
                      src="/brand/nancy-mark.png"
                      alt="Nancy Monitor"
                      fill
                      className="object-cover"
                      sizes="44px"
                      priority
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-tight text-[#F0EBE5] sm:text-3xl lg:text-[2rem]">
                        Nancy Monitor
                      </h1>
                      <Badge tone="border-[rgba(184,161,127,0.32)] bg-[rgba(184,161,127,0.12)] text-[#DCD1BF]">
                        Interno
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#DCD1BF]/72 sm:text-[15px]">
                      Monitoreo de conversaciones, actividad y señales comerciales en tiempo real.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium text-[#F0EBE5] transition hover:bg-white/5"
                  style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} style={{ color: COLORS.gold }} />
                  Actualizar
                </button>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium text-[#F0EBE5] transition hover:bg-white/5"
                  style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <LogOut className="h-4 w-4" style={{ color: COLORS.gold }} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 gap-6 lg:grid lg:grid-cols-[360px_minmax(0,1fr)_320px]">
          <aside className="flex min-h-0 flex-col rounded-3xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-[#F0EBE5]">Conversaciones</h2>
              <span className="text-sm text-[#B8B0A5]">{filteredConversations.length}</span>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A17F]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono o texto"
                className="w-full rounded-2xl border px-10 py-3 text-sm text-[#F0EBE5] outline-none placeholder:text-[#B8B0A5]"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {loadingConversations ? (
                <div className="rounded-2xl border p-4 text-sm text-[#B8B0A5]" style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}>
                  Cargando conversaciones...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-2xl border p-4 text-sm text-[#B8B0A5]" style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}>
                  No hay conversaciones disponibles.
                </div>
              ) : (
                filteredConversations.map((item) => {
                  const isActive = item.conversation_id === selectedConversationId;

                  return (
                    <button
                      key={item.conversation_id}
                      onClick={() => setSelectedConversationId(item.conversation_id)}
                      className="w-full rounded-2xl border p-4 text-left transition"
                      style={{
                        borderColor: isActive ? "rgba(184,161,127,0.35)" : COLORS.border,
                        backgroundColor: isActive ? "rgba(184,161,127,0.08)" : COLORS.cardBg,
                        boxShadow: isActive ? "0 0 0 1px rgba(184,161,127,0.08)" : "none",
                      }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#F0EBE5]">
                            {getDisplayName(item.contact_name, item.contact_id)}
                          </p>
                          <p className="truncate text-xs text-[#B8B0A5]">
                            {getDisplayContact(item.contact_id)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[11px] uppercase tracking-wide text-[#B8B0A5]">
                            {getChannelLabel(item.channel)}
                          </p>
                          <p className="mt-1 text-[11px] text-[#B8B0A5]">
                            {formatSidebarDate(item.last_message_at)}
                          </p>
                        </div>
                      </div>

                      <p className="mb-3 text-sm leading-5 text-[#DCD1BF]">
                        {truncateText(item.last_message_text, 84)}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[#B8B0A5]">
                        <span>{formatDirection(item.last_direction)}</span>
                        <span>{item.total_messages || 0} mensajes</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-3xl border" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}>
            <div className="border-b px-6 py-5" style={{ borderColor: COLORS.border }}>
              {selectedConversation ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-medium text-[#F0EBE5]">
                      {getDisplayName(selectedConversation.contact_name, selectedConversation.contact_id)}
                    </h2>
                    <p className="mt-1 text-sm text-[#B8B0A5]">
                      {getDisplayContact(selectedConversation.contact_id)}
                    </p>
                  </div>

                  <div className="text-right text-sm text-[#B8B0A5]">
                    <p>{getChannelLabel(selectedConversation.channel)}</p>
                    <p>{selectedConversation.total_messages || 0} mensajes</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#B8B0A5]">Selecciona una conversación</div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {loadingMessages ? (
                <div className="text-sm text-[#B8B0A5]">Cargando mensajes...</div>
              ) : !selectedConversationId ? (
                <div className="flex h-full items-center justify-center text-[#B8B0A5]">
                  <div className="text-center">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10" style={{ color: COLORS.blueSoft }} />
                    <p>Selecciona una conversación para ver el chat</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-[#B8B0A5]">No hay mensajes en esta conversación.</div>
              ) : (
                <div className="space-y-5">
                  {messages.map((msg) => {
                    const isOutbound = msg.direction === "outbound";

                    return (
                      <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[84%]">
                          <div
                            className="rounded-[28px] border px-5 py-4 shadow-sm"
                            style={{
                              borderColor: isOutbound ? "rgba(184,161,127,0.25)" : COLORS.border,
                              backgroundColor: isOutbound ? COLORS.goldSoft : COLORS.cardBg,
                              color: isOutbound ? COLORS.dark : COLORS.cream,
                            }}
                          >
                            <div className="mb-3 flex items-center justify-between gap-4 text-[11px] uppercase tracking-wide" style={{ color: isOutbound ? COLORS.dark : COLORS.muted }}>
                              <span>{getMessageRoleLabel(isOutbound, msg.contact_name)}</span>
                              <span>{getChannelLabel(msg.channel)}</span>
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-7">
                              {msg.message_text || "(sin contenido)"}
                            </p>

                            <div className="mt-4">
                              <Badge tone={getDirectionBadgeTone(msg.direction)}>
                                {msg.direction === "outbound" ? "Enviado" : "Recibido"}
                              </Badge>
                            </div>
                          </div>

                          <div className={`mt-2 px-2 text-[11px] text-[#B8B0A5] ${isOutbound ? "text-right" : "text-left"}`}>
                            {formatMessageDate(msg.message_timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col rounded-3xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-[#F0EBE5]">Ficha del lead</h2>
              <p className="mt-1 text-sm text-[#B8B0A5]">Datos rápidos para monitoreo comercial</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {!leadSummary ? (
                <div className="rounded-2xl border p-4 text-sm text-[#B8B0A5]" style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}>
                  Selecciona una conversación para ver los datos.
                </div>
              ) : (
                <>
                  <InfoCard label="Nombre" value={leadSummary.name} icon={<User className="h-3.5 w-3.5" />} />
                  <InfoCard label="Teléfono" value={leadSummary.phone} icon={<Phone className="h-3.5 w-3.5" />} />
                  <InfoCard label="Canal" value={leadSummary.channel} icon={<Layers3 className="h-3.5 w-3.5" />} />
                  <InfoCard label="Total de mensajes" value={leadSummary.totalMessages} />

                  <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Servicio recomendado</p>
                    <div className="mt-3">
                      <Badge tone="border-[rgba(184,161,127,0.38)] bg-[rgba(184,161,127,0.14)] text-[#F0EBE5]">
                        {formatLabel(leadSummary.recommendedService)}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Intención de compra</p>
                    <div className="mt-3">
                      <Badge tone={getBuyingIntentTone(leadSummary.buyingIntent)}>
                        {formatLabel(leadSummary.buyingIntent)}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Quiere humano</p>
                    <div className="mt-3">
                      <Badge tone={getYesNoTone(leadSummary.wantsHuman)}>
                        {normalizeYesNo(leadSummary.wantsHuman)}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Quiere callback</p>
                    <div className="mt-3">
                      <Badge tone={getYesNoTone(leadSummary.wantsCallback)}>
                        {normalizeYesNo(leadSummary.wantsCallback)}
                      </Badge>
                    </div>
                  </div>

                  <InfoCard label="Última actividad" value={formatMessageDate(leadSummary.lastMessageAt)} />
                </>
              )}
            </div>
          </aside>
        </div>

        <div className="flex flex-1 flex-col gap-4 lg:hidden">
          {shouldShowMobileList ? (
            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-[#F0EBE5]">Conversaciones</h2>
                <span className="text-sm text-[#B8B0A5]">{filteredConversations.length}</span>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A17F]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o texto"
                  className="w-full rounded-2xl border px-10 py-3 text-sm text-[#F0EBE5] outline-none placeholder:text-[#B8B0A5]"
                  style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}
                />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {loadingConversations ? (
                  <div className="rounded-2xl border p-4 text-sm text-[#B8B0A5]" style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}>
                    Cargando conversaciones...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm text-[#B8B0A5]" style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}>
                    No hay conversaciones disponibles.
                  </div>
                ) : (
                  filteredConversations.map((item) => {
                    const isActive = item.conversation_id === selectedConversationId;

                    return (
                      <button
                        key={item.conversation_id}
                        onClick={() => {
                          setSelectedConversationId(item.conversation_id);
                          setMobileView("chat");
                        }}
                        className="w-full rounded-2xl border p-4 text-left transition"
                        style={{
                          borderColor: isActive ? "rgba(184,161,127,0.35)" : COLORS.border,
                          backgroundColor: isActive ? "rgba(184,161,127,0.08)" : COLORS.cardBg,
                        }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#F0EBE5]">
                              {getDisplayName(item.contact_name, item.contact_id)}
                            </p>
                            <p className="truncate text-xs text-[#B8B0A5]">
                              {getDisplayContact(item.contact_id)}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[11px] uppercase tracking-wide text-[#B8B0A5]">
                              {getChannelLabel(item.channel)}
                            </p>
                            <p className="mt-1 text-[11px] text-[#B8B0A5]">
                              {formatSidebarDate(item.last_message_at)}
                            </p>
                          </div>
                        </div>

                        <p className="mb-3 text-sm leading-5 text-[#DCD1BF]">
                          {truncateText(item.last_message_text, 84)}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-[#B8B0A5]">
                          <span>{formatDirection(item.last_direction)}</span>
                          <span>{item.total_messages || 0} mensajes</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}

          {shouldShowMobileChat ? (
            <>
              <section className="flex min-h-0 flex-1 flex-col rounded-3xl border" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}>
                <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: COLORS.border }}>
                  <button
                    onClick={() => setMobileView("list")}
                    className="mb-4 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm text-[#F0EBE5] transition hover:bg-white/5"
                    style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}
                  >
                    <ArrowLeft className="h-4 w-4" style={{ color: COLORS.gold }} />
                    Volver
                  </button>

                  {selectedConversation ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-medium text-[#F0EBE5] sm:text-xl">
                          {getDisplayName(selectedConversation.contact_name, selectedConversation.contact_id)}
                        </h2>
                        <p className="mt-1 text-sm text-[#B8B0A5]">
                          {getDisplayContact(selectedConversation.contact_id)}
                        </p>
                      </div>

                      <div className="text-left text-sm text-[#B8B0A5] sm:text-right">
                        <p>{getChannelLabel(selectedConversation.channel)}</p>
                        <p>{selectedConversation.total_messages || 0} mensajes</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[#B8B0A5]">Selecciona una conversación</div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                  {loadingMessages ? (
                    <div className="text-sm text-[#B8B0A5]">Cargando mensajes...</div>
                  ) : !selectedConversationId ? (
                    <div className="flex h-full items-center justify-center text-[#B8B0A5]">
                      <div className="text-center">
                        <MessageSquare className="mx-auto mb-3 h-10 w-10" style={{ color: COLORS.blueSoft }} />
                        <p>Selecciona una conversación para ver el chat</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-[#B8B0A5]">No hay mensajes en esta conversación.</div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOutbound = msg.direction === "outbound";

                        return (
                          <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[92%] sm:max-w-[84%]">
                              <div
                                className="rounded-[24px] border px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5"
                                style={{
                                  borderColor: isOutbound ? "rgba(184,161,127,0.25)" : COLORS.border,
                                  backgroundColor: isOutbound ? COLORS.goldSoft : COLORS.cardBg,
                                  color: isOutbound ? COLORS.dark : COLORS.cream,
                                }}
                              >
                                <div className="mb-3 flex items-center justify-between gap-4 text-[11px] uppercase tracking-wide" style={{ color: isOutbound ? COLORS.dark : COLORS.muted }}>
                                  <span>{getMessageRoleLabel(isOutbound, msg.contact_name)}</span>
                                  <span>{getChannelLabel(msg.channel)}</span>
                                </div>

                                <p className="whitespace-pre-wrap text-sm leading-7">
                                  {msg.message_text || "(sin contenido)"}
                                </p>

                                <div className="mt-4">
                                  <Badge tone={getDirectionBadgeTone(msg.direction)}>
                                    {msg.direction === "outbound" ? "Enviado" : "Recibido"}
                                  </Badge>
                                </div>
                              </div>

                              <div className={`mt-2 px-2 text-[11px] text-[#B8B0A5] ${isOutbound ? "text-right" : "text-left"}`}>
                                {formatMessageDate(msg.message_timestamp)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <aside className="rounded-3xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.03)" }}>
                <div className="mb-4">
                  <h2 className="text-lg font-medium text-[#F0EBE5]">Ficha del lead</h2>
                  <p className="mt-1 text-sm text-[#B8B0A5]">Datos rápidos para monitoreo comercial</p>
                </div>

                <div className="space-y-3">
                  {!leadSummary ? (
                    <div className="rounded-2xl border p-4 text-sm text-[#B8B0A5]" style={{ borderColor: COLORS.border, backgroundColor: COLORS.cardBg }}>
                      Selecciona una conversación para ver los datos.
                    </div>
                  ) : (
                    <>
                      <InfoCard label="Nombre" value={leadSummary.name} icon={<User className="h-3.5 w-3.5" />} />
                      <InfoCard label="Teléfono" value={leadSummary.phone} icon={<Phone className="h-3.5 w-3.5" />} />
                      <InfoCard label="Canal" value={leadSummary.channel} icon={<Layers3 className="h-3.5 w-3.5" />} />
                      <InfoCard label="Total de mensajes" value={leadSummary.totalMessages} />

                      <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Servicio recomendado</p>
                        <div className="mt-3">
                          <Badge tone="border-[rgba(184,161,127,0.38)] bg-[rgba(184,161,127,0.14)] text-[#F0EBE5]">
                            {formatLabel(leadSummary.recommendedService)}
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Intención de compra</p>
                        <div className="mt-3">
                          <Badge tone={getBuyingIntentTone(leadSummary.buyingIntent)}>
                            {formatLabel(leadSummary.buyingIntent)}
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Quiere humano</p>
                        <div className="mt-3">
                          <Badge tone={getYesNoTone(leadSummary.wantsHuman)}>
                            {normalizeYesNo(leadSummary.wantsHuman)}
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#B8B0A5]">Quiere callback</p>
                        <div className="mt-3">
                          <Badge tone={getYesNoTone(leadSummary.wantsCallback)}>
                            {normalizeYesNo(leadSummary.wantsCallback)}
                          </Badge>
                        </div>
                      </div>

                      <InfoCard label="Última actividad" value={formatMessageDate(leadSummary.lastMessageAt)} />
                    </>
                  )}
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
