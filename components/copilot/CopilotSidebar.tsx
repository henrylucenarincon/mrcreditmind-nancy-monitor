import { Clock3, MessageSquareText, Plus } from "lucide-react";
import type { CopilotHistoryItem } from "./types";

const statusTone: Record<CopilotHistoryItem["status"], string> = {
  Activo: "var(--status-success-bg)",
  Pendiente: "var(--status-warning-bg)",
  Cerrado: "var(--status-info-bg)",
};

export function CopilotSidebar({
  items,
  activeId,
  isLoading,
  onCreate,
  onSelect,
}: {
  items: CopilotHistoryItem[];
  activeId: string | null;
  isLoading: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside
      className="flex min-h-0 flex-col rounded-3xl border p-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[11px] font-medium uppercase tracking-[0.18em]"
            style={{ color: "var(--muted)" }}
          >
            Historial
          </p>
          <h2 className="mt-1 text-lg font-semibold">Conversaciones</h2>
        </div>
        <button
          onClick={onCreate}
          className="rounded-full border px-2.5 py-1 text-xs font-medium"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            color: "var(--foreground-soft)",
          }}
          type="button"
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {isLoading ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--muted)" }}
          >
            Cargando historial...
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div
            className="rounded-2xl border p-4 text-sm leading-6"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--muted)" }}
          >
            No hay conversaciones guardadas.
          </div>
        ) : null}

        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              className="w-full rounded-2xl border p-4 text-left"
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                borderColor: isActive ? "var(--status-warning-border)" : "var(--border)",
                backgroundColor: isActive ? "var(--status-warning-bg)" : "var(--card)",
                boxShadow: isActive ? "0 0 0 1px rgba(184,161,127,0.06)" : "none",
              }}
              type="button"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                    <MessageSquareText className="h-3.5 w-3.5" />
                    {item.source}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: statusTone[item.status],
                    color: "var(--foreground)",
                  }}
                >
                  {item.status}
                </span>
              </div>

              <p className="line-clamp-2 text-sm leading-5" style={{ color: "var(--foreground-soft)" }}>
                {item.summary}
              </p>

              <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
                <Clock3 className="h-3.5 w-3.5" />
                {item.time}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
