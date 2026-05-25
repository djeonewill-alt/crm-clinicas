"use client";

import { useEffect, useMemo, useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import { createLeadHistoryEvent } from "@/lib/services/lead-history-client";
import { restoreLeadById } from "@/lib/services/leads-client";
import type { Lead } from "@/types/lead";

type ComercialArquivadosClientProps = {
  leads: Lead[];
  empresaId: string | number;
  empresaNome: string;
};

const FILTER_ALL = "all";
const EMPTY_FILTER_VALUE = "__empty__";

function getLeadName(lead: Lead) {
  return lead.nome?.trim() || lead.tel || "Lead sem nome";
}

function formatPhone(phone: string) {
  return phone || "sem telefone";
}

function formatCurrency(value?: number) {
  const numberValue = Number(value ?? 0);

  if (!numberValue) return "sem valor";

  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | number | null) {
  if (!value) return "sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function normalizeFilterValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : EMPTY_FILTER_VALUE;
}

function getCampaignLabel(value: string) {
  return value === EMPTY_FILTER_VALUE ? "Sem campanha" : value;
}

function getInterestLabel(value: string) {
  return value === EMPTY_FILTER_VALUE ? "Sem interesse" : value;
}

function getFunnelLabel(funnelId: string) {
  const funnel = FUNNELS.find((item) => item.id === funnelId);

  if (funnel) return funnel.label;
  if (funnelId === "desqualificado") return "Desqualificado";
  if (funnelId === "remarketing") return "Remarketing";

  return funnelId || "sem funil";
}

function buildFilterOptions(
  leads: Lead[],
  getValue: (lead: Lead) => string | undefined,
  getLabel: (value: string) => string
) {
  const options = new Map<string, string>();

  leads.forEach((lead) => {
    const rawValue = getValue(lead)?.trim();
    const value = normalizeFilterValue(rawValue);

    if (!options.has(value)) {
      options.set(value, rawValue || getLabel(value));
    }
  });

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function buildFunnelOptions(leads: Lead[]) {
  const options = new Map<string, string>();

  leads.forEach((lead) => {
    if (!lead.funnel || options.has(lead.funnel)) return;
    options.set(lead.funnel, getFunnelLabel(lead.funnel));
  });

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function leadMatchesSearch(lead: Lead, normalizedSearch: string) {
  if (!normalizedSearch) return true;

  const searchable = [
    lead.nome,
    lead.tel,
    lead.campanha,
    lead.esp,
    getFunnelLabel(lead.funnel),
    lead.diaProsp,
    String(lead.valor ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedSearch);
}

export function ComercialArquivadosClient({
  leads,
  empresaId,
  empresaNome,
}: ComercialArquivadosClientProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [restoringLeadId, setRestoringLeadId] = useState<
    string | number | null
  >(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState(FILTER_ALL);
  const [selectedInterest, setSelectedInterest] = useState(FILTER_ALL);
  const [selectedFunnel, setSelectedFunnel] = useState(FILTER_ALL);
  const normalizedSearch = search.trim().toLowerCase();
  const totalArquivados = localLeads.length;

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const campaignOptions = useMemo(
    () =>
      buildFilterOptions(localLeads, (lead) => lead.campanha, getCampaignLabel),
    [localLeads]
  );

  const interestOptions = useMemo(
    () => buildFilterOptions(localLeads, (lead) => lead.esp, getInterestLabel),
    [localLeads]
  );

  const funnelOptions = useMemo(
    () => buildFunnelOptions(localLeads),
    [localLeads]
  );

  const filteredLeads = useMemo(() => {
    return localLeads.filter((lead) => {
      const matchesSearch = leadMatchesSearch(lead, normalizedSearch);
      const matchesCampaign =
        selectedCampaign === FILTER_ALL ||
        normalizeFilterValue(lead.campanha) === selectedCampaign;
      const matchesInterest =
        selectedInterest === FILTER_ALL ||
        normalizeFilterValue(lead.esp) === selectedInterest;
      const matchesFunnel =
        selectedFunnel === FILTER_ALL || lead.funnel === selectedFunnel;

      return (
        matchesSearch && matchesCampaign && matchesInterest && matchesFunnel
      );
    });
  }, [
    localLeads,
    normalizedSearch,
    selectedCampaign,
    selectedInterest,
    selectedFunnel,
  ]);

  const hasActiveFilters =
    normalizedSearch.length > 0 ||
    selectedCampaign !== FILTER_ALL ||
    selectedInterest !== FILTER_ALL ||
    selectedFunnel !== FILTER_ALL;

  function clearFilters() {
    setSearch("");
    setSelectedCampaign(FILTER_ALL);
    setSelectedInterest(FILTER_ALL);
    setSelectedFunnel(FILTER_ALL);
  }

  async function handleRestoreLead(lead: Lead) {
    const confirmed = window.confirm(
      "Restaurar este lead para o funil em que ele estava?"
    );

    if (!confirmed) return;

    setRestoringLeadId(lead.id);
    setStatusMessage("");

    try {
      const restoredLead = await restoreLeadById({
        empresaId,
        leadId: lead.id,
      });

      try {
        await createLeadHistoryEvent({
          leadId: String(restoredLead.id),
          empresaId: String(empresaId),
          type: "status_change",
          title: "Lead restaurado",
          description: "Lead restaurado dos arquivados.",
          metadata: {
            event: "lead_restored",
            fromArchived: true,
            restoredToFunnel: restoredLead.funnel,
          },
        });
      } catch (error) {
        console.error("Erro ao registrar histórico de restauração:", error);
      }

      setLocalLeads((current) =>
        current.filter((item) => String(item.id) !== String(restoredLead.id))
      );
      setStatusMessage(
        "Lead restaurado. Ele voltou para os funis e para a fila comercial."
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao restaurar lead: ${error.message}`
          : "Erro ao restaurar lead."
      );
    } finally {
      setRestoringLeadId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Comercial / Arquivados · {empresaNome}
            </p>
            <h1 className="text-xl font-semibold">Leads Arquivados</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text2)]">
              Leads arquivados saem da fila, dos funis e dos relatórios
              principais, mas os dados e o histórico são preservados.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] px-4 py-3 text-right">
            <div className="text-2xl font-semibold text-[var(--accent)]">
              {totalArquivados}
            </div>
            <div className="text-xs text-[var(--text2)]">
              lead(s) arquivado(s)
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)]">
            {statusMessage}
          </div>
        )}
      </div>

      {localLeads.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-72 flex-1 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
              placeholder="Buscar por nome, telefone, campanha, interesse..."
            />

            <select
              value={selectedCampaign}
              onChange={(event) => setSelectedCampaign(event.target.value)}
              className="min-w-44 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
            >
              <option value={FILTER_ALL}>Todas as campanhas</option>
              {campaignOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedInterest}
              onChange={(event) => setSelectedInterest(event.target.value)}
              className="min-w-44 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
            >
              <option value={FILTER_ALL}>Todos os interesses</option>
              {interestOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedFunnel}
              onChange={(event) => setSelectedFunnel(event.target.value)}
              className="min-w-40 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
            >
              <option value={FILTER_ALL}>Todos os funis</option>
              {funnelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar filtros
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--text3)]">
            {filteredLeads.length} lead(s) encontrado(s)
            {hasActiveFilters ? " com filtros ativos" : ""}
          </div>
        </div>
      )}

      {localLeads.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--border2)] bg-[var(--bg2)] p-8 text-center text-sm text-[var(--text3)]">
          Nenhum lead arquivado.
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--border2)] bg-[var(--bg2)] p-8 text-center text-sm text-[var(--text3)]">
          Nenhum lead encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {filteredLeads.map((lead) => (
            <article
              key={lead.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[var(--text)]">
                    {getLeadName(lead)}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text2)]">
                    {formatPhone(lead.tel)}
                  </p>
                </div>

                <span className="rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1 text-xs font-semibold text-[var(--text2)]">
                  {getFunnelLabel(lead.funnel)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
                  {lead.campanha || "Sem campanha"}
                </span>
                <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
                  {lead.esp || "Sem interesse"}
                </span>
                <span className="rounded-full bg-[rgba(232,197,71,.15)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                  {lead.diaProsp || "sem dia"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-[var(--bg3)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Valor
                  </p>
                  <p className="mt-1 text-[var(--text2)]">
                    {formatCurrency(lead.valor)}
                  </p>
                </div>

                <div className="rounded-xl bg-[var(--bg3)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Entrada
                  </p>
                  <p className="mt-1 text-[var(--text2)]">
                    {formatDate(lead.dataEntrada)}
                  </p>
                </div>

                <div className="rounded-xl bg-[var(--bg3)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Arquivado em
                  </p>
                  <p className="mt-1 text-[var(--text2)]">
                    {formatDate(lead.archivedAt)}
                  </p>
                </div>

                <div className="rounded-xl bg-[var(--bg3)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Funil/Dia
                  </p>
                  <p className="mt-1 text-[var(--text2)]">
                    {getFunnelLabel(lead.funnel)} · {lead.diaProsp || "sem dia"}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  disabled={restoringLeadId === lead.id}
                  onClick={() => void handleRestoreLead(lead)}
                  className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-4 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[rgba(232,197,71,.18)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restoringLeadId === lead.id ? "Restaurando..." : "Restaurar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
