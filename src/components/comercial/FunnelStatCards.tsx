import { FUNNELS } from "@/lib/constants/crm";
import { cn } from "@/lib/utils/cn";
import type { Lead } from "@/types/lead";

type VisibleFunnelId = (typeof FUNNELS)[number]["id"];

type FunnelStatCardsProps = {
  workFunnel: VisibleFunnelId;
  queuesByFunnel: Record<VisibleFunnelId, Lead[]>;
  rawCounts: Record<VisibleFunnelId, number>;
  onChangeFunnel: (funnelId: VisibleFunnelId) => void;
};

export function FunnelStatCards({
  workFunnel,
  queuesByFunnel,
  rawCounts,
  onChangeFunnel,
}: FunnelStatCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {FUNNELS.map((funnel) => {
        const active = funnel.id === workFunnel;
        const queue = queuesByFunnel[funnel.id]?.length ?? 0;
        const raw = rawCounts[funnel.id] ?? 0;
        const hidden = Math.max(raw - queue, 0);

        return (
          <button
            key={funnel.id}
            type="button"
            onClick={() => onChangeFunnel(funnel.id)}
            className={cn(
              "rounded-2xl border bg-[var(--bg2)] p-4 text-left transition hover:-translate-y-0.5",
              active
                ? "border-[var(--accent)]"
                : "border-[var(--border)] hover:border-[var(--border2)]"
            )}
          >
            <div
              className="text-2xl font-semibold"
              style={{ color: funnel.color }}
            >
              {queue}
            </div>
            <div className="text-xs text-[var(--text2)]">{funnel.label}</div>
            {hidden > 0 && (
              <div className="mt-1 text-[10px] text-[var(--text3)]">
                {hidden} oculto(s)
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
