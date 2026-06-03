"use client";

import { useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import { getAttemptProgress } from "@/lib/services/queue";
import { cn } from "@/lib/utils/cn";
import type { Lead } from "@/types/lead";

type VisibleFunnelId = (typeof FUNNELS)[number]["id"];

type ListMode = "smart" | "all";

type FilterOption = {
  value: string;
  label: string;
};

type LeadQueueProps = {
  workFunnel: VisibleFunnelId;
  activeFunnelLabel: string;
  queuesByFunnel: Record<VisibleFunnelId, Lead[]>;
  queueLeads: Lead[];
  globalSearchResults: Lead[];
  isGlobalSearchLoading: boolean;
  hiddenCount: number;
  filteredCount: number;
  selectedLeadId: string | number | null;
  listMode: ListMode;
  search: string;
  selectedCampaign: string;
  campaignOptions: FilterOption[];
  selectedInterest: string;
  interestOptions: FilterOption[];
  hasActiveFilters: boolean;
  onChangeFunnel: (funnelId: VisibleFunnelId) => void;
  onChangeListMode: (mode: ListMode) => void;
  onSearchChange: (value: string) => void;
  onCampaignChange: (value: string) => void;
  onInterestChange: (value: string) => void;
  onClearFilters: () => void;
  onSelectLead: (leadId: string | number) => void;
  onSelectGlobalLead: (lead: Lead) => void;
  getLeadName: (lead: Lead) => string;
  getLastAction: (lead: Lead) => string;
};

function formatPhone(phone: string) {
  if (!phone) return "sem telefone";
  return phone;
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isOverdue(value?: string | null) {
  const date = parseLocalDate(value);
  if (!date) return false;
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() < todayOnly.getTime();
}

function getPriorityIndicator(lead: Lead) {
  const progress = getAttemptProgress(lead);

  if (isOverdue(lead.retornoData)) {
    return { label: "Atrasado", className: "bg-red-400" };
  }

  if (lead.funnel === "retorno" && lead.retornoData) {
    return { label: "Retorno", className: "bg-purple-400" };
  }

  if (lead.funnel === "qualificacao") {
    return { label: "Qualif.", className: "bg-blue-400" };
  }

  if (progress.total > 0 && progress.completed >= progress.total) {
    return { label: "Em dia", className: "bg-green-400" };
  }

  if (progress.total > 0) {
    return { label: "Ação", className: "bg-orange-400" };
  }

  return { label: "Novo", className: "bg-orange-400" };
}

export function LeadQueue({
  workFunnel,
  activeFunnelLabel,
  queuesByFunnel,
  queueLeads,
  globalSearchResults,
  isGlobalSearchLoading,
  hiddenCount,
  filteredCount,
  selectedLeadId,
  listMode,
  search,
  selectedCampaign,
  campaignOptions,
  selectedInterest,
  interestOptions,
  hasActiveFilters,
  onChangeFunnel,
  onChangeListMode,
  onSearchChange,
  onCampaignChange,
  onInterestChange,
  onClearFilters,
  onSelectLead,
  onSelectGlobalLead,
  getLeadName,
  getLastAction,
}: LeadQueueProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]">
      <div className="space-y-3 border-b border-[var(--border)] bg-[var(--bg2)] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
              Busca e filtros
            </div>
            <div className="mt-1 text-xs text-[var(--text2)]">
              {filteredCount} lead(s) encontrado(s)
            </div>
          </div>

          {hasActiveFilters && (
            <span className="shrink-0 rounded-full border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Ativos
            </span>
          )}
        </div>

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
          placeholder="Buscar lead..."
        />

        <button
          type="button"
          onClick={() => setShowAdvancedFilters((current) => !current)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition",
            hasActiveFilters
              ? "border-[var(--accent)] bg-[rgba(232,197,71,.08)] text-[var(--accent)]"
              : "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
          )}
        >
          <span>Filtros avançados</span>
          <span>{showAdvancedFilters ? "Fechar" : "Abrir"}</span>
        </button>

        {showAdvancedFilters && (
          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2">
            <select
              value={selectedCampaign}
              onChange={(event) => onCampaignChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Todas as campanhas</option>
              {campaignOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedInterest}
              onChange={(event) => onInterestChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Todos os interesses</option>
              {interestOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="w-full rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)]"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="text-[11px] text-[var(--text3)]">
          {hasActiveFilters ? "com filtros ativos" : "na fila atual"}
        </div>
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
        {hasActiveFilters && (
          <div className="border-b border-[var(--border)] bg-[var(--bg2)] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                Fora da fila atual
              </p>
              {isGlobalSearchLoading && (
                <span className="text-[10px] text-[var(--text3)]">buscando...</span>
              )}
            </div>

            {globalSearchResults.length > 0 ? (
              <div className="mt-2 space-y-2">
                {globalSearchResults.slice(0, 5).map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onSelectGlobalLead(lead)}
                    className="block w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-left transition hover:border-[var(--accent)]"
                  >
                    <span className="block truncate text-xs font-semibold text-[var(--text)]">
                      {getLeadName(lead)}
                    </span>
                    <span className="mt-1 block text-[11px] text-[var(--text3)]">
                      {formatPhone(lead.tel)}
                    </span>
                    <span className="mt-1 block text-[11px] text-[var(--text2)]">
                      {lead.funnel} / {lead.diaProsp || "d1"}
                    </span>
                    <span className="mt-2 inline-flex rounded-md border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">
                      Abrir lead existente
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              search.trim().length >= 3 &&
              !isGlobalSearchLoading && (
                <p className="mt-2 text-[11px] text-[var(--text3)]">
                  Nenhum lead fora da fila atual encontrado.
                </p>
              )
            )}
          </div>
        )}

        {queueLeads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-[var(--text3)]">
            <div className="mb-3 text-4xl">🎉</div>
            <div className="font-semibold text-[var(--green)]">
              {hasActiveFilters ? "Nada encontrado" : "Fila limpa"}
            </div>
            <div className="mt-1">
              {hasActiveFilters
                ? "Nenhum lead encontrado para estes filtros."
                : `Nenhum lead ativo em ${activeFunnelLabel.toLowerCase()}.`}
            </div>
            {hiddenCount > 0 && !hasActiveFilters && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs">
                {hiddenCount} lead(s) oculto(s) por estarem em outro dia ou já concluídos.
              </div>
            )}
          </div>
        ) : (
          queueLeads.map((lead) => {
            const active = String(selectedLeadId) === String(lead.id);
            const progress = getAttemptProgress(lead);
            const priority = getPriorityIndicator(lead);

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

                <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text3)]">
                  <span
                    className={cn("h-2 w-2 rounded-full", priority.className)}
                    aria-hidden="true"
                  />
                  <span>{priority.label}</span>
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
