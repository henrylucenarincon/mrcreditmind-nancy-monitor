import type { ToolActivityItem } from "./types";

function RunningDot() {
  return (
    <span
      className="relative inline-flex h-2 w-2 shrink-0"
    >
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ backgroundColor: "var(--brand-gold)" }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: "var(--brand-gold)" }}
      />
    </span>
  );
}

export function CopilotContextPanel({
  toolActivity,
  isLoading,
}: {
  toolActivity: ToolActivityItem[];
  isLoading: boolean;
}) {
  const hasActivity = toolActivity.length > 0;

  return (
    <aside
      className="flex min-h-[580px] flex-col rounded-2xl border lg:min-h-0"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-4 py-3.5"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          Actividad
        </p>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {!hasActivity && !isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span
              className="text-2xl select-none"
              style={{ color: "var(--border-strong)" }}
            >
              ✦
            </span>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Sin actividad reciente
            </p>
          </div>
        ) : null}

        {hasActivity ? (
          <div className="space-y-2.5">
            {toolActivity.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center gap-3 transition-opacity"
                style={{ opacity: item.status === "done" ? 0.55 : 1 }}
              >
                {item.status === "running" ? (
                  <RunningDot />
                ) : item.status === "done" ? (
                  <span
                    className="inline-flex h-2 w-2 shrink-0 items-center justify-center text-[10px]"
                    style={{ color: "var(--brand-green)" }}
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    className="inline-flex h-2 w-2 shrink-0 items-center justify-center text-[10px]"
                    style={{ color: "var(--brand-red)" }}
                  >
                    ✕
                  </span>
                )}
                <span
                  className="text-sm"
                  style={{
                    color:
                      item.status === "running"
                        ? "var(--foreground)"
                        : item.status === "done"
                        ? "var(--foreground-soft)"
                        : "var(--status-danger-text)",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
