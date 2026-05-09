import { Plus } from "lucide-react";
import type { CopilotHistoryItem } from "./types";

export function CopilotSidebar({
  items,
  activeId,
  isLoading,
  isDisabled = false,
  onCreate,
  onSelect,
}: {
  items: CopilotHistoryItem[];
  activeId: string | null;
  isLoading: boolean;
  isDisabled?: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside
      className="flex min-h-0 flex-col rounded-2xl border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3.5"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          Conversaciones
        </p>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            borderColor: "rgba(184,161,127,0.40)",
            color: "var(--brand-gold)",
            opacity: isDisabled ? 0.5 : 1,
          }}
          disabled={isDisabled}
          type="button"
        >
          <Plus className="h-3 w-3" />
          Nueva
        </button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="px-3 py-4 text-xs" style={{ color: "var(--muted)" }}>
            Cargando historial...
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div className="px-3 py-4 text-xs leading-5" style={{ color: "var(--muted)" }}>
            No hay conversaciones guardadas.
          </div>
        ) : null}

        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              className="group relative w-full rounded-xl px-3 py-2.5 text-left transition-colors"
              key={item.id}
              onClick={() => onSelect(item.id)}
              disabled={isDisabled}
              style={{
                backgroundColor: isActive ? "rgba(184,161,127,0.08)" : "transparent",
                opacity: isDisabled ? 0.6 : 1,
              }}
              type="button"
            >
              {/* Gold left border for active */}
              {isActive ? (
                <span
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                  style={{ backgroundColor: "var(--brand-gold)" }}
                />
              ) : null}

              <div className="flex items-baseline justify-between gap-2 pl-1">
                <p className="truncate text-sm font-medium" style={{ color: isActive ? "var(--foreground)" : "var(--foreground)" }}>
                  {item.title}
                </p>
                <span className="shrink-0 text-[11px]" style={{ color: "var(--muted)" }}>
                  {item.time}
                </span>
              </div>

              <p
                className="mt-0.5 truncate pl-1 text-xs leading-4"
                style={{ color: "var(--muted)" }}
              >
                {item.summary}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
