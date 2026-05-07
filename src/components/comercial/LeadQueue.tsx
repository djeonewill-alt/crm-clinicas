"use client";

import { useMemo, useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import { getAttemptProgress } from "@/lib/services/queue";
import { cn } from "@/lib/utils/cn";
import type { Lead } from "@/types/lead";

type VisibleFunnelId = (typeof FUNNELS)[number]["id"];

type ListMode = "smart" | "all";

type LeadQueueProps = {
  workFunnel: VisibleFunnelId;
  activeFunnelLabel: string;
  queuesByFunnel: Record<VisibleFunnelId, Lead[]>;
  queueLeads: Lead[];
  hiddenCount: number;
  selectedLeadId: string | number | null;
  listMode: ListMode;
  onChangeFunnel: (funnelId: VisibleFunnelId) => void;
  onChangeListMode: (mode: ListMode) => void;
  onSelectLead: (leadId: string | number) => void;
  getLeadName: (lead: Lead) => string;
  getLastAction: (lead: Lead) => string;
};

function formatPhone(phone: string) {
  if (!phone) return "sem telefone";
  return phone;
}

export function LeadQueue({
  workFunnel,
  activeFunnelLabel,
  queuesByFunnel,
  queueLeads,
  hiddenCount,
  selectedLeadId,
  listMode,
  onChangeFunnel,
  onChangeListMode,
  onSelectLead,
  getLeadName,
  getLastAction,
}: LeadQueueProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const displayedLeads = useMemo(() => {
    if (!normalizedSearch) return queueLeads;

    return queueLeads.filter((lead) => {
      const searchable = [
        lead.nome,
        lead.tel,
        lead.esp,
        lead.campanha,
        lead.diaProsp,
        String(lead.valor ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [queueLeads, normalizedSearch]);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg2)] p-3">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
          placeholder="Buscar lead..."
        />
      </div>

      <div className="flex border-b border-[var(--border)]">
        {FUNNELS.map((funnel) => {
          const active = funnel.id === workFunnel;
          const count = queuesByFunnel[funnel.id]?.length ?? 0;

          return (
            <button
              key={funnel.id}
              type="button"
              onClick={() => onChangeFunnel(funnel.id)}
              className={cn(
                "flex-1 border-b-2 px-2 py-2 text-[10px] font-semibold transition",
                active
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text2)]"
              )}
            >
              {funnel.short}
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 font-mono",
                  active
                    ? "bg-[rgba(232,197,71,.15)] text-[var(--accent)]"
                    : "bg-[var(--bg4)] text-[var(--text3)]"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-[11px] text-[var(--text3)]">
        {listMode === "smart"
          ? "Fila inteligente: dia atual + tentativas pendentes."
          : "Todos do funil: incluindo ocultos e dias futuros."}
      </div>

      <div className="flex gap-2 border-b border-[var(--border)] bg-[var(--bg)] p-2">
        <button
          type="button"
          onClick={() => onChangeListMode("smart")}
          className={cn(
            "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
            listMode === "smart"
              ? "bg-[var(--accent)] text-black"
              : "bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
          )}
        >
          Fila
        </button>

        <button
          type="button"
          onClick={() => onChangeListMode("all")}
          className={cn(
            "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
            listMode === "all"
              ? "bg-[var(--accent)] text-black"
              : "bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
          )}
        >
          Todos
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {displayedLeads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-[var(--text3)]">
            <div className="mb-3 text-4xl">🎉</div>
            <div className="font-semibold text-[var(--green)]">
              {searchQuery.trim() ? "Nada encontrado" : "Fila limpa"}
            </div>
            <div className="mt-1">
              {searchQuery.trim()
                ? "Nenhum lead encontrado para esta busca."
                : `Nenhum lead ativo em ${activeFunnelLabel.toLowerCase()}.`}
            </div>
            {hiddenCount > 0 && !searchQuery.trim() && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs">
                {hiddenCount} lead(s) oculto(s) por estarem em outro dia ou já concluídos.
              </div>
            )}
          </div>
        ) : (
          displayedLeads.map((lead) => {
            const active = String(selectedLeadId) === String(lead.id);
            const progress = getAttemptProgress(lead);

            return (
              <button
                key={lead.id}
                type="button"
                onClick={() => onSelectLead(lead.id)}
                className={cn(
                  "block w-full border-b border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--bg2)]",
                  active &&
                    "border-l-2 border-l-[var(--accent)] bg-[rgba(232,197,71,0.07)] pl-[14px]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--text)]">
                      {getLeadName(lead)}
                    </div>
                    <div className="truncate text-xs text-[var(--text2)]">
                      {formatPhone(lead.tel)}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-[rgba(232,197,71,.15)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    {lead.diaProsp || "d1"}
                  </span>
                </div>

                <div className="mt-1 text-[11px] text-[var(--text2)]">
                  {lead.diaProsp || "d1"} · {progress.completed}/{progress.total} tentativas
                </div>

                <div className="mt-1 text-[11px] text-[var(--text2)]">
                  {getLastAction(lead)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
