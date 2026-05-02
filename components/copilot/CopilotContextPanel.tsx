import { CheckCircle2, FileText, Link2, ShieldCheck } from "lucide-react";
import type {
  CopilotAction,
  CopilotContextItem,
  CopilotContextMetric,
} from "./types";

const metricTone: Record<CopilotContextMetric["tone"], { bg: string; border: string; text: string }> = {
  info: {
    bg: "var(--status-info-bg)",
    border: "var(--status-info-border)",
    text: "var(--status-info-text)",
  },
  success: {
    bg: "var(--status-success-bg)",
    border: "var(--status-success-border)",
    text: "var(--status-success-text)",
  },
  warning: {
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
    text: "var(--status-warning-text)",
  },
};

export function CopilotContextPanel({
  metrics,
  context,
  actions,
}: {
  metrics: CopilotContextMetric[];
  context: CopilotContextItem[];
  actions: CopilotAction[];
}) {
  return (
    <aside
      className="flex min-h-0 flex-col rounded-3xl border p-4 overflow-hidden"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="mb-4">
        <p
          className="text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ color: "var(--muted)" }}
        >
          Contexto
        </p>
        <h2 className="mt-1 text-lg font-semibold">Lead y acciones</h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => {
          const tone = metricTone[metric.tone];

          return (
            <div
              className="rounded-2xl border p-3"
              key={metric.label}
              style={{
                borderColor: tone.border,
                backgroundColor: tone.bg,
                color: tone.text,
              }}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide">{metric.label}</p>
              <p className="mt-2 text-sm font-semibold">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {context.map((item) => (
          <div
            className="rounded-2xl border p-4"
            key={item.label}
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {item.label}
            </p>
            <p className="mt-2 text-sm leading-5" style={{ color: "var(--foreground-soft)" }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" style={{ color: "var(--brand-gold)" }} />
          <h3 className="text-sm font-semibold">Fuentes futuras</h3>
        </div>
        <div className="space-y-2 text-sm" style={{ color: "var(--foreground-soft)" }}>
          <p className="flex items-center gap-2">
            <Link2 className="h-4 w-4" style={{ color: "var(--muted)" }} />
            FunnelUp
          </p>
          <p className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: "var(--muted)" }} />
            Google Drive
          </p>
          <p className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: "var(--muted)" }} />
            Google Sheets
          </p>
        </div>
      </div>

      <div className="mt-5 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
        {actions.map((action) => (
          <div
            className="rounded-2xl border p-4"
            key={action.id}
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="mt-1 text-sm leading-5" style={{ color: "var(--muted)" }}>
                  {action.detail}
                </p>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: "var(--foreground-soft)",
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {action.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
