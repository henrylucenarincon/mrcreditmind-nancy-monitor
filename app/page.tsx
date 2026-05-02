
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Layers3,
  LogOut,
  MessageSquare,
  Moon,
  Phone,
  RefreshCw,
  Search,
  SunMedium,
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

type ThemeMode = "dark" | "light";

const PUERTO_RICO_TIMEZONE = "America/Puerto_Rico";

const UI = {
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  borderSoft: "var(--border-soft)",
  panel: "var(--panel)",
  panelSoft: "var(--panel-soft)",
  card: "var(--card)",
  cardHover: "var(--card-hover)",
  fg: "var(--foreground)",
  fgSoft: "var(--foreground-soft)",
  muted: "var(--muted)",
  gold: "var(--brand-gold)",
  blue: "var(--brand-blue)",
  blueSoft: "var(--brand-blue-soft)",
  successBg: "var(--status-success-bg)",
  successBorder: "var(--status-success-border)",
  successText: "var(--status-success-text)",
  infoBg: "var(--status-info-bg)",
  infoBorder: "var(--status-info-border)",
  infoText: "var(--status-info-text)",
  dangerBg: "var(--status-danger-bg)",
  dangerBorder: "var(--status-danger-border)",
  dangerText: "var(--status-danger-text)",
  warningBg: "var(--status-warning-bg)",
  warningBorder: "var(--status-warning-border)",
  warningText: "var(--status-warning-text)",
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

function getBuyingIntentMeta(value: string | null | undefined) {
  const v = (value || "").trim().toLowerCase();

  if (v === "alto") {
    return {
      border: UI.successBorder,
      background: UI.successBg,
      color: UI.successText,
    };
  }

  if (v === "medio") {
    return {
      border: UI.infoBorder,
      background: UI.infoBg,
      color: UI.infoText,
    };
  }

  return {
    border: UI.warningBorder,
    background: UI.warningBg,
    color: UI.warningText,
  };
}

function getYesNoMeta(value: string | null | undefined) {
  const normalized = normalizeYesNo(value);

  if (normalized === "Sí") {
    return {
      border: UI.infoBorder,
      background: UI.infoBg,
      color: UI.infoText,
    };
  }

  if (normalized === "No") {
    return {
      border: UI.dangerBorder,
      background: UI.dangerBg,
      color: UI.dangerText,
    };
  }

  return {
    border: UI.warningBorder,
    background: UI.warningBg,
    color: UI.warningText,
  };
}

function getDirectionBadgeMeta(direction: string | null | undefined) {
  if (direction === "outbound") {
    return {
      border: UI.warningBorder,
      background: UI.warningBg,
      color: UI.warningText,
    };
  }

  if (direction === "inbound") {
    return {
      border: UI.infoBorder,
      background: UI.infoBg,
      color: UI.infoText,
    };
  }

  return {
    border: UI.borderStrong,
    background: "rgba(255,255,255,0.04)",
    color: UI.fgSoft,
  };
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
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: UI.border,
        backgroundColor: "rgba(255,255,255,0.02)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
        style={{ color: UI.muted }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm leading-6" style={{ color: UI.fg }}>
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: { border: string; background: string; color: string };
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: tone.border,
        backgroundColor: tone.background,
        color: tone.color,
      }}
    >
      {children}
    </span>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ThemeMode;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium"
      style={{
        borderColor: UI.border,
        backgroundColor: "rgba(255,255,255,0.03)",
        color: UI.fg,
      }}
      aria-label="Cambiar tema"
      type="button"
    >
      {theme === "dark" ? (
        <SunMedium className="h-4 w-4" style={{ color: UI.gold }} />
      ) : (
        <Moon className="h-4 w-4" style={{ color: UI.blue }} />
      )}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
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
  const [theme, setTheme] = useState<ThemeMode>("light");

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

  function handleToggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("nancy-theme", next);
      return next;
    });
  }

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "light" ? "light" : "dark");
  }, []);

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
    <main className="min-h-screen lg:h-screen lg:overflow-hidden" style={{ color: UI.fg }}>
      <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:h-screen lg:px-6 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <div
            className="overflow-hidden rounded-[28px] border px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
            style={{
              borderColor: UI.borderSoft,
              background:
                "linear-gradient(135deg, rgba(184,161,127,0.10) 0%, rgba(42,64,89,0.08) 42%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "var(--shadow-panel)",
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                    style={{
                      borderColor: UI.borderSoft,
                      backgroundColor: UI.panelSoft,
                    }}
                  >
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
                      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                        Nancy Monitor
                      </h1>
                      <Badge
                        tone={{
                          border: UI.warningBorder,
                          background: UI.warningBg,
                          color: UI.warningText,
                        }}
                      >
                        Interno
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm sm:text-[15px]" style={{ color: UI.fgSoft }}>
                      Centro interno de monitoreo comercial.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium"
                  style={{
                    borderColor: UI.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: UI.fg,
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} style={{ color: UI.gold }} />
                  Actualizar
                </button>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium"
                  style={{
                    borderColor: UI.border,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: UI.fg,
                  }}
                >
                  <LogOut className="h-4 w-4" style={{ color: UI.gold }} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 gap-6 lg:grid lg:grid-cols-[360px_minmax(0,1fr)_320px]">
          <aside
            className="flex min-h-0 flex-col rounded-3xl border p-4"
            style={{
              borderColor: UI.border,
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Conversaciones</h2>
              <span className="text-sm" style={{ color: UI.muted }}>
                {filteredConversations.length}
              </span>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: UI.gold }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono o texto"
                className="w-full rounded-2xl border px-10 py-3 text-sm outline-none"
                style={{
                  borderColor: UI.border,
                  backgroundColor: UI.card,
                  color: UI.fg,
                }}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {loadingConversations ? (
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.muted }}
                >
                  Cargando conversaciones...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.muted }}
                >
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
                        borderColor: isActive ? UI.warningBorder : UI.border,
                        backgroundColor: isActive ? UI.warningBg : UI.card,
                        boxShadow: isActive ? "0 0 0 1px rgba(184,161,127,0.06)" : "none",
                      }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" style={{ color: UI.fg }}>
                            {getDisplayName(item.contact_name, item.contact_id)}
                          </p>
                          <p className="truncate text-xs" style={{ color: UI.muted }}>
                            {getDisplayContact(item.contact_id)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[11px] uppercase tracking-wide" style={{ color: UI.muted }}>
                            {getChannelLabel(item.channel)}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: UI.muted }}>
                            {formatSidebarDate(item.last_message_at)}
                          </p>
                        </div>
                      </div>

                      <p className="mb-3 text-sm leading-5" style={{ color: UI.fgSoft }}>
                        {truncateText(item.last_message_text, 84)}
                      </p>

                      <div className="flex items-center justify-between text-[11px]" style={{ color: UI.muted }}>
                        <span>{formatDirection(item.last_direction)}</span>
                        <span>{item.total_messages || 0} mensajes</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section
            className="flex min-h-0 flex-col rounded-3xl border"
            style={{
              borderColor: UI.border,
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="border-b px-6 py-5" style={{ borderColor: UI.border }}>
              {selectedConversation ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-medium">{getDisplayName(selectedConversation.contact_name, selectedConversation.contact_id)}</h2>
                    <p className="mt-1 text-sm" style={{ color: UI.muted }}>
                      {getDisplayContact(selectedConversation.contact_id)}
                    </p>
                  </div>

                  <div className="text-right text-sm" style={{ color: UI.muted }}>
                    <p>{getChannelLabel(selectedConversation.channel)}</p>
                    <p>{selectedConversation.total_messages || 0} mensajes</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: UI.muted }}>
                  Selecciona una conversación
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {loadingMessages ? (
                <div className="text-sm" style={{ color: UI.muted }}>
                  Cargando mensajes...
                </div>
              ) : !selectedConversationId ? (
                <div className="flex h-full items-center justify-center" style={{ color: UI.muted }}>
                  <div className="text-center">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10" style={{ color: UI.blueSoft }} />
                    <p>Selecciona una conversación para ver el chat</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm" style={{ color: UI.muted }}>
                  No hay mensajes en esta conversación.
                </div>
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
                              borderColor: isOutbound ? UI.warningBorder : UI.border,
                              backgroundColor: isOutbound ? UI.warningBg : UI.card,
                              color: isOutbound ? UI.warningText : UI.fg,
                            }}
                          >
                            <div
                              className="mb-3 flex items-center justify-between gap-4 text-[11px] uppercase tracking-wide"
                              style={{ color: isOutbound ? UI.warningText : UI.muted }}
                            >
                              <span>{getMessageRoleLabel(isOutbound, msg.contact_name)}</span>
                              <span>{getChannelLabel(msg.channel)}</span>
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-7">
                              {msg.message_text || "(sin contenido)"}
                            </p>

                            <div className="mt-4">
                              <Badge tone={getDirectionBadgeMeta(msg.direction)}>
                                {msg.direction === "outbound" ? "Enviado" : "Recibido"}
                              </Badge>
                            </div>
                          </div>

                          <div className={`mt-2 px-2 text-[11px] ${isOutbound ? "text-right" : "text-left"}`} style={{ color: UI.muted }}>
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

          <aside
            className="flex min-h-0 flex-col rounded-3xl border p-4"
            style={{
              borderColor: UI.border,
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="mb-4">
              <h2 className="text-lg font-medium">Ficha del lead</h2>
              <p className="mt-1 text-sm" style={{ color: UI.muted }}>
                Señales rápidas para seguimiento comercial
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {!leadSummary ? (
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.muted }}
                >
                  Selecciona una conversación para ver los datos.
                </div>
              ) : (
                <>
                  <InfoCard label="Nombre" value={leadSummary.name} icon={<User className="h-3.5 w-3.5" />} />
                  <InfoCard label="Teléfono" value={leadSummary.phone} icon={<Phone className="h-3.5 w-3.5" />} />
                  <InfoCard label="Canal" value={leadSummary.channel} icon={<Layers3 className="h-3.5 w-3.5" />} />
                  <InfoCard label="Total de mensajes" value={leadSummary.totalMessages} />

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                      Servicio recomendado
                    </p>
                    <div className="mt-3">
                      <Badge
                        tone={{
                          border: UI.warningBorder,
                          background: UI.warningBg,
                          color: UI.warningText,
                        }}
                      >
                        {formatLabel(leadSummary.recommendedService)}
                      </Badge>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                      Intención de compra
                    </p>
                    <div className="mt-3">
                      <Badge tone={getBuyingIntentMeta(leadSummary.buyingIntent)}>
                        {formatLabel(leadSummary.buyingIntent)}
                      </Badge>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                      Quiere humano
                    </p>
                    <div className="mt-3">
                      <Badge tone={getYesNoMeta(leadSummary.wantsHuman)}>
                        {normalizeYesNo(leadSummary.wantsHuman)}
                      </Badge>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                      Quiere callback
                    </p>
                    <div className="mt-3">
                      <Badge tone={getYesNoMeta(leadSummary.wantsCallback)}>
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
            <section
              className="flex min-h-0 flex-1 flex-col rounded-3xl border p-4"
              style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Conversaciones</h2>
                <span className="text-sm" style={{ color: UI.muted }}>
                  {filteredConversations.length}
                </span>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: UI.gold }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o texto"
                    className="w-full rounded-2xl border px-10 py-3 text-sm outline-none"
                    style={{
                      borderColor: UI.border,
                      backgroundColor: UI.card,
                      color: UI.fg,
                    }}
                  />
                </div>
                <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {loadingConversations ? (
                  <div
                    className="rounded-2xl border p-4 text-sm"
                    style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.muted }}
                  >
                    Cargando conversaciones...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div
                    className="rounded-2xl border p-4 text-sm"
                    style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.muted }}
                  >
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
                          borderColor: isActive ? UI.warningBorder : UI.border,
                          backgroundColor: isActive ? UI.warningBg : UI.card,
                        }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium" style={{ color: UI.fg }}>
                              {getDisplayName(item.contact_name, item.contact_id)}
                            </p>
                            <p className="truncate text-xs" style={{ color: UI.muted }}>
                              {getDisplayContact(item.contact_id)}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[11px] uppercase tracking-wide" style={{ color: UI.muted }}>
                              {getChannelLabel(item.channel)}
                            </p>
                            <p className="mt-1 text-[11px]" style={{ color: UI.muted }}>
                              {formatSidebarDate(item.last_message_at)}
                            </p>
                          </div>
                        </div>

                        <p className="mb-3 text-sm leading-5" style={{ color: UI.fgSoft }}>
                          {truncateText(item.last_message_text, 84)}
                        </p>

                        <div className="flex items-center justify-between text-[11px]" style={{ color: UI.muted }}>
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
              <section
                className="flex min-h-0 flex-1 flex-col rounded-3xl border"
                style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: UI.border }}>
                  <button
                    onClick={() => setMobileView("list")}
                    className="mb-4 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition hover:bg-white/5"
                    style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.fg }}
                  >
                    <ArrowLeft className="h-4 w-4" style={{ color: UI.gold }} />
                    Volver
                  </button>

                  {selectedConversation ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-medium sm:text-xl">
                          {getDisplayName(selectedConversation.contact_name, selectedConversation.contact_id)}
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: UI.muted }}>
                          {getDisplayContact(selectedConversation.contact_id)}
                        </p>
                      </div>

                      <div className="text-left text-sm sm:text-right" style={{ color: UI.muted }}>
                        <p>{getChannelLabel(selectedConversation.channel)}</p>
                        <p>{selectedConversation.total_messages || 0} mensajes</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: UI.muted }}>
                      Selecciona una conversación
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                  {loadingMessages ? (
                    <div className="text-sm" style={{ color: UI.muted }}>
                      Cargando mensajes...
                    </div>
                  ) : !selectedConversationId ? (
                    <div className="flex h-full items-center justify-center" style={{ color: UI.muted }}>
                      <div className="text-center">
                        <MessageSquare className="mx-auto mb-3 h-10 w-10" style={{ color: UI.blueSoft }} />
                        <p>Selecciona una conversación para ver el chat</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm" style={{ color: UI.muted }}>
                      No hay mensajes en esta conversación.
                    </div>
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
                                  borderColor: isOutbound ? UI.warningBorder : UI.border,
                                  backgroundColor: isOutbound ? UI.warningBg : UI.card,
                                  color: isOutbound ? UI.warningText : UI.fg,
                                }}
                              >
                                <div
                                  className="mb-3 flex items-center justify-between gap-4 text-[11px] uppercase tracking-wide"
                                  style={{ color: isOutbound ? UI.warningText : UI.muted }}
                                >
                                  <span>{getMessageRoleLabel(isOutbound, msg.contact_name)}</span>
                                  <span>{getChannelLabel(msg.channel)}</span>
                                </div>

                                <p className="whitespace-pre-wrap text-sm leading-7">
                                  {msg.message_text || "(sin contenido)"}
                                </p>

                                <div className="mt-4">
                                  <Badge tone={getDirectionBadgeMeta(msg.direction)}>
                                    {msg.direction === "outbound" ? "Enviado" : "Recibido"}
                                  </Badge>
                                </div>
                              </div>

                              <div className={`mt-2 px-2 text-[11px] ${isOutbound ? "text-right" : "text-left"}`} style={{ color: UI.muted }}>
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

              <aside
                className="rounded-3xl border p-4"
                style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div className="mb-4">
                  <h2 className="text-lg font-medium">Ficha del lead</h2>
                  <p className="mt-1 text-sm" style={{ color: UI.muted }}>
                    Señales rápidas para seguimiento comercial
                  </p>
                </div>

                <div className="space-y-3">
                  {!leadSummary ? (
                    <div
                      className="rounded-2xl border p-4 text-sm"
                      style={{ borderColor: UI.border, backgroundColor: UI.card, color: UI.muted }}
                    >
                      Selecciona una conversación para ver los datos.
                    </div>
                  ) : (
                    <>
                      <InfoCard label="Nombre" value={leadSummary.name} icon={<User className="h-3.5 w-3.5" />} />
                      <InfoCard label="Teléfono" value={leadSummary.phone} icon={<Phone className="h-3.5 w-3.5" />} />
                      <InfoCard label="Canal" value={leadSummary.channel} icon={<Layers3 className="h-3.5 w-3.5" />} />
                      <InfoCard label="Total de mensajes" value={leadSummary.totalMessages} />

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                          Servicio recomendado
                        </p>
                        <div className="mt-3">
                          <Badge
                            tone={{
                              border: UI.warningBorder,
                              background: UI.warningBg,
                              color: UI.warningText,
                            }}
                          >
                            {formatLabel(leadSummary.recommendedService)}
                          </Badge>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                          Intención de compra
                        </p>
                        <div className="mt-3">
                          <Badge tone={getBuyingIntentMeta(leadSummary.buyingIntent)}>
                            {formatLabel(leadSummary.buyingIntent)}
                          </Badge>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                          Quiere humano
                        </p>
                        <div className="mt-3">
                          <Badge tone={getYesNoMeta(leadSummary.wantsHuman)}>
                            {normalizeYesNo(leadSummary.wantsHuman)}
                          </Badge>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: UI.border, backgroundColor: "rgba(255,255,255,0.02)" }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: UI.muted }}>
                          Quiere callback
                        </p>
                        <div className="mt-3">
                          <Badge tone={getYesNoMeta(leadSummary.wantsCallback)}>
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
