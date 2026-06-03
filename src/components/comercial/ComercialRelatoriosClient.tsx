"use client";

import { useMemo, useState } from "react";
import { DailyCommercialReportCard } from "@/components/comercial/DailyCommercialReportCard";
import { FUNNELS } from "@/lib/constants/crm";
import { cn } from "@/lib/utils/cn";
import type { LeadHistoryItem } from "@/types/lead-history";
import type { FunnelId, Lead } from "@/types/lead";

type PeriodFilter = "7d" | "30d" | "90d" | "all";

type ComercialRelatoriosClientProps = {
  leads: Lead[];
  history: LeadHistoryItem[];
  empresaNome: string;
};

type RankingItem = {
  label: string;
  count: number;
};

const PERIOD_OPTIONS: Array<{ id: PeriodFilter; label: string; days?: number }> =
  [
    { id: "7d", label: "7 dias", days: 7 },
    { id: "30d", label: "30 dias", days: 30 },
    { id: "90d", label: "90 dias", days: 90 },
    { id: "all", label: "Todos" },
  ];

const FUNNEL_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  retorno: "Retorno",
  clientes: "Clientes",
  remarketing: "Remarketing",
  desqualificado: "Desqualificados",
};

function getLeadDate(lead: Lead) {
  if (lead.dataEntrada) {
    const dataEntrada = new Date(lead.dataEntrada).getTime();
    if (!Number.isNaN(dataEntrada)) return dataEntrada;
  }

  return typeof lead.colAt === "number" ? lead.colAt : null;
}

function filterLeadsByPeriod(leads: Lead[], period: PeriodFilter) {
  if (period === "all") return leads;

  const option = PERIOD_OPTIONS.find((item) => item.id === period);
  const days = option?.days ?? 30;
  const start = Date.now() - days * 24 * 60 * 60 * 1000;

  return leads.filter((lead) => {
    const leadDate = getLeadDate(lead);
    return leadDate !== null && leadDate >= start;
  });
}

function countTentativas(leads: Lead[]) {
  return leads.reduce((total, lead) => total + (lead.tentativas?.length ?? 0), 0);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function buildRanking(
  leads: Lead[],
  getValue: (lead: Lead) => string | undefined,
  emptyLabel: string
): RankingItem[] {
  const counts = leads.reduce(
    (acc, lead) => {
      const label = getValue(lead)?.trim() || emptyLabel;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function getFunnelLabel(funnel: string) {
  return FUNNEL_LABELS[funnel] ?? "Outros";
}

function buildFunnelSummary(leads: Lead[]) {
  const counts = leads.reduce(
    (acc, lead) => {
      const label = getFunnelLabel(lead.funnel);
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function getFunnelCount(leads: Lead[], funnel: FunnelId) {
  return leads.filter((lead) => lead.funnel === funnel).length;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div className="text-2xl font-semibold text-[var(--accent)]">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
        {label}
      </div>
      {hint && <div className="mt-2 text-xs text-[var(--text3)]">{hint}</div>}
    </div>
  );
}

function RankingList({
  title,
  items,
}: {
  title: string;
  items: RankingItem[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <h2 className="text-sm font-semibold">{title}</h2>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border2)] p-4 text-center text-sm text-[var(--text3)]">
            Sem dados no período.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg3)] px-3 py-2"
            >
              <span className="truncate text-sm text-[var(--text2)]">
                {item.label}
              </span>
              <span className="rounded-full bg-[rgba(232,197,71,.15)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                {item.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ComercialRelatoriosClient({
  leads,
  history,
  empresaNome,
}: ComercialRelatoriosClientProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");

  const periodLeads = useMemo(
    () => filterLeadsByPeriod(leads, periodFilter),
    [leads, periodFilter]
  );

  const metrics = useMemo(() => {
    const totalPeriodo = periodLeads.length;
    const qualificados = periodLeads.filter(
      (lead) => lead.funnel === "qualificacao" || Boolean(lead.qualificadoEm)
    ).length;
    const retornos = periodLeads.filter(
      (lead) => lead.funnel === "retorno" || Boolean(lead.retornoData)
    ).length;
    const fechados = periodLeads.filter(
      (lead) => lead.funnel === "clientes" || Boolean(lead.fechado)
    ).length;
    const desqualificados = getFunnelCount(periodLeads, "desqualificado");

    return {
      totalAtivo: leads.length,
      novosPeriodo: totalPeriodo,
      prospeccao: getFunnelCount(periodLeads, "prospeccao"),
      qualificados,
      retornos,
      fechados,
      desqualificados,
      tentativas: countTentativas(periodLeads),
      taxaFechamento: totalPeriodo > 0 ? (fechados / totalPeriodo) * 100 : 0,
      taxaQualificacao:
        totalPeriodo > 0 ? (qualificados / totalPeriodo) * 100 : 0,
    };
  }, [leads.length, periodLeads]);

  const campanhaRanking = useMemo(
    () => buildRanking(periodLeads, (lead) => lead.campanha, "Sem campanha"),
    [periodLeads]
  );

  const interesseRanking = useMemo(
    () => buildRanking(periodLeads, (lead) => lead.esp, "Sem interesse"),
    [periodLeads]
  );

  const funnelSummary = useMemo(
    () => buildFunnelSummary(periodLeads),
    [periodLeads]
  );

  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.id === periodFilter)?.label ??
    "período";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Comercial / Relatórios · {empresaNome}
            </p>
            <h1 className="text-xl font-semibold">Relatórios comerciais</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text2)]">
              Indicadores básicos calculados a partir dos leads ativos da
              operação comercial.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPeriodFilter(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  periodFilter === option.id
                    ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                    : "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <DailyCommercialReportCard leads={leads} history={history} />
      </div>

      {leads.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--border2)] bg-[var(--bg2)] p-8 text-center text-sm text-[var(--text3)]">
          Nenhum lead ativo encontrado para montar relatórios.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Leads ativos"
              value={metrics.totalAtivo}
              hint="Arquivados não entram"
            />
            <MetricCard
              label="Novos no período"
              value={metrics.novosPeriodo}
              hint={periodFilter === "all" ? "Todos os leads" : periodLabel}
            />
            <MetricCard label="Prospecção" value={metrics.prospeccao} />
            <MetricCard label="Qualificados" value={metrics.qualificados} />
            <MetricCard label="Retornos" value={metrics.retornos} />
            <MetricCard label="Fechados/clientes" value={metrics.fechados} />
            <MetricCard
              label="Desqualificados"
              value={metrics.desqualificados}
            />
            <MetricCard label="Tentativas" value={metrics.tentativas} />
            <MetricCard
              label="Taxa fechamento"
              value={formatPercent(metrics.taxaFechamento)}
              hint="Fechados / período"
            />
            <MetricCard
              label="Taxa qualificação"
              value={formatPercent(metrics.taxaQualificacao)}
              hint="Qualificados / período"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <RankingList
              title="Campanhas principais"
              items={campanhaRanking}
            />
            <RankingList
              title="Interesses/procedimentos principais"
              items={interesseRanking}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Resumo por funil/status</h2>
              <span className="text-xs text-[var(--text3)]">
                Base: {periodLeads.length} lead(s) em {periodLabel.toLowerCase()}
              </span>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {funnelSummary.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border2)] p-4 text-center text-sm text-[var(--text3)]">
                  Sem leads no período selecionado.
                </div>
              ) : (
                funnelSummary.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-[var(--bg3)] px-3 py-2"
                  >
                    <span className="text-sm text-[var(--text2)]">
                      {item.label}
                    </span>
                    <span className="font-mono text-sm text-[var(--accent)]">
                      {item.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
