"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCsv,
  downloadCsv,
  formatCsvBoolean,
  formatCsvDate,
  formatCsvMoney,
} from "@/lib/comercial/export-csv";
import { LeadCsvImportPanel } from "@/components/comercial/LeadCsvImportPanel";
import { FUNNELS } from "@/lib/constants/crm";
import { moveLeadToFunnel } from "@/lib/services/leads-client";
import { cn } from "@/lib/utils/cn";
import type { Lead } from "@/types/lead";

type ComercialFunisClientProps = {
  leads: Lead[];
  empresaId: string | number;
  empresaNome: string;
};

const FUNNEL_ALL = "todos";
const FILTER_ALL = "all";
const EMPTY_FILTER_VALUE = "__empty__";

function getLeadName(lead: Lead) {
  return lead.nome?.trim() || lead.tel || "Lead sem nome";
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

function formatDate(value?: string | null) {
  if (!value) return "sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function getMoveTarget(lead: Lead) {
  if (lead.funnel === "prospeccao") {
    return { id: "qualificacao" as const, label: "Qualificação" };
  }

  if (lead.funnel === "qualificacao") {
    return { id: "prospeccao" as const, label: "Prospecção" };
  }

  return null;
}

function getFunnelLabel(funnelId: string) {
  const funnel = FUNNELS.find((item) => item.id === funnelId);

  if (funnel) return funnel.label;
  if (funnelId === "desqualificado") return "Desqualificado";
  if (funnelId === "remarketing") return "Remarketing";

  return funnelId || "";
}

export function ComercialFunisClient({
  leads,
  empresaId,
  empresaNome,
}: ComercialFunisClientProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [selectedFunnel, setSelectedFunnel] = useState<string>(FUNNEL_ALL);
  const [selectedCampaign, setSelectedCampaign] = useState(FILTER_ALL);
  const [selectedInterest, setSelectedInterest] = useState(FILTER_ALL);
  const [search, setSearch] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [movingLeadId, setMovingLeadId] = useState<string | number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [importPanelOpen, setImportPanelOpen] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const normalizedSearch = search.trim().toLowerCase();

  const leadsByFunnel = useMemo(() => {
    return FUNNELS.reduce(
      (acc, funnel) => {
        acc[funnel.id] = localLeads.filter((lead) => lead.funnel === funnel.id);
        return acc;
      },
      {} as Record<(typeof FUNNELS)[number]["id"], Lead[]>
    );
  }, [localLeads]);

  const totalValueByFunnel = useMemo(() => {
    return FUNNELS.reduce(
      (acc, funnel) => {
        acc[funnel.id] = leadsByFunnel[funnel.id].reduce(
          (sum, lead) => sum + Number(lead.valor ?? 0),
          0
        );
        return acc;
      },
      {} as Record<(typeof FUNNELS)[number]["id"], number>
    );
  }, [leadsByFunnel]);

  const campaignOptions = useMemo(
    () => buildFilterOptions(localLeads, (lead) => lead.campanha, getCampaignLabel),
    [localLeads]
  );

  const interestOptions = useMemo(
    () => buildFilterOptions(localLeads, (lead) => lead.esp, getInterestLabel),
    [localLeads]
  );

  const visibleFunnels = FUNNELS.filter((funnel) => {
    if (selectedFunnel === FUNNEL_ALL) return true;
    return funnel.id === selectedFunnel;
  });

  function filterLead(lead: Lead) {
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

    const matchesSearch =
      !normalizedSearch || searchable.includes(normalizedSearch);
    const matchesCampaign =
      selectedCampaign === FILTER_ALL ||
      normalizeFilterValue(lead.campanha) === selectedCampaign;
    const matchesInterest =
      selectedInterest === FILTER_ALL ||
      normalizeFilterValue(lead.esp) === selectedInterest;

    return matchesSearch && matchesCampaign && matchesInterest;
  }

  const filteredLeadCount = visibleFunnels.reduce((total, funnel) => {
    return total + leadsByFunnel[funnel.id].filter(filterLead).length;
  }, 0);

  const filteredLeadsForExport = visibleFunnels.flatMap((funnel) =>
    leadsByFunnel[funnel.id].filter(filterLead)
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedFunnel !== FUNNEL_ALL ||
    selectedCampaign !== FILTER_ALL ||
    selectedInterest !== FILTER_ALL;

  function clearFilters() {
    setSearch("");
    setSelectedFunnel(FUNNEL_ALL);
    setSelectedCampaign(FILTER_ALL);
    setSelectedInterest(FILTER_ALL);
  }

  function handleExportCsv() {
    const leadsToExport = filteredLeadsForExport.filter((lead) => !lead.archivedAt);

    if (leadsToExport.length === 0) {
      setStatusMessage("Nenhum lead para exportar com os filtros atuais.");
      return;
    }

    const headers = [
      "ID",
      "Nome",
      "Telefone",
      "Campanha",
      "Interesse/Procedimento",
      "Funil",
      "Dia de prospecção",
      "Retorno",
      "Fechado",
      "Desqualificado",
      "Tentativas totais",
      "Valor",
      "Data de entrada",
      "Última atualização",
    ];
    const rows = leadsToExport.map((lead) => [
      lead.id,
      lead.nome,
      lead.tel,
      lead.campanha,
      lead.esp,
      getFunnelLabel(lead.funnel),
      lead.diaProsp,
      formatCsvDate(lead.retornoData),
      formatCsvBoolean(lead.fechado),
      lead.funnel === "desqualificado" ? "Sim" : "Não",
      lead.tentativas?.length ?? 0,
      formatCsvMoney(lead.valor),
      formatCsvDate(lead.dataEntrada),
      formatCsvDate(lead.colAt),
    ]);
    const csvContent = buildCsv(headers, rows);
    const filename = `leads-funis-${new Date().toISOString().slice(0, 10)}.csv`;

    downloadCsv(filename, csvContent);
    setStatusMessage(`CSV exportado com ${leadsToExport.length} lead(s).`);
  }

  async function handleMoveLead(lead: Lead, targetFunnel: string) {
    if (targetFunnel !== "prospeccao" && targetFunnel !== "qualificacao") {
      return;
    }

    if (targetFunnel === lead.funnel) return;

    const targetLabel =
      targetFunnel === "qualificacao" ? "Qualificação" : "Prospecção";
    const confirmed = window.confirm(`Mover este lead para ${targetLabel}?`);

    if (!confirmed) return;

    setMovingLeadId(lead.id);
    setStatusMessage("");

    try {
      const updatedFields = await moveLeadToFunnel({
        leadId: lead.id,
        targetFunnel,
        currentLead: lead,
      });

      setLocalLeads((current) =>
        current.map((item) =>
          String(item.id) === String(lead.id)
            ? { ...item, ...updatedFields }
            : item
        )
      );
      setStatusMessage(`Lead movido para ${targetLabel}.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao mover lead: ${error.message}`
          : "Erro ao mover lead."
      );
    } finally {
      setMovingLeadId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]">
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Comercial / Funis · {empresaNome}
            </p>
            <h1 className="text-xl font-semibold">Visão de Funis</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text2)]">
              Kanban em modo somente leitura. A próxima fase poderá ativar mover cards
              entre funis com segurança.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] px-4 py-3 text-right">
            <div className="text-2xl font-semibold text-[var(--accent)]">
              {localLeads.length}
            </div>
            <div className="text-xs text-[var(--text2)]">leads carregados</div>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3 text-sm text-[var(--text2)]">
            {statusMessage}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-72 flex-1 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
            placeholder="Buscar por nome, telefone, interesse, campanha..."
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedFunnel(FUNNEL_ALL)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                selectedFunnel === FUNNEL_ALL
                  ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                  : "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
              )}
            >
              Todos
            </button>

            {FUNNELS.map((funnel) => (
              <button
                key={funnel.id}
                type="button"
                onClick={() => setSelectedFunnel(funnel.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  selectedFunnel === funnel.id
                    ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                    : "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
                )}
              >
                {funnel.short}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!isHydrated || !hasActiveFilters}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar filtros
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[rgba(232,197,71,.18)]"
          >
            Exportar CSV ({filteredLeadCount})
          </button>

          <button
            type="button"
            onClick={() => setImportPanelOpen((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)]"
          >
            Importar CSV
          </button>
        </div>

        <LeadCsvImportPanel
          empresaId={empresaId}
          leads={localLeads}
          isOpen={importPanelOpen}
          onClose={() => setImportPanelOpen(false)}
          onImported={(createdLeads) => {
            setLocalLeads((current) => [...createdLeads, ...current]);
            setStatusMessage(`${createdLeads.length} lead(s) importado(s) via CSV.`);
          }}
        />

        <div className="mt-3 text-xs text-[var(--text3)]">
          {filteredLeadCount} lead(s) encontrado(s)
          {hasActiveFilters ? " com os filtros atuais" : ""}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-3 border-b border-[var(--border)] bg-[var(--bg)] p-4">
        {FUNNELS.map((funnel) => (
          <button
            key={funnel.id}
            type="button"
            onClick={() => setSelectedFunnel(funnel.id)}
            className={cn(
              "rounded-2xl border bg-[var(--bg2)] p-4 text-left transition hover:-translate-y-0.5",
              selectedFunnel === funnel.id
                ? "border-[var(--accent)]"
                : "border-[var(--border)] hover:border-[var(--border2)]"
            )}
          >
            <div className="text-2xl font-semibold" style={{ color: funnel.color }}>
              {leadsByFunnel[funnel.id].length}
            </div>
            <div className="text-xs text-[var(--text2)]">{funnel.label}</div>
            <div className="mt-1 text-[10px] text-[var(--text3)]">
              {formatCurrency(totalValueByFunnel[funnel.id])}
            </div>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div
          className={cn(
            "flex h-full gap-4",
            selectedFunnel === FUNNEL_ALL ? "min-w-[1120px]" : "min-w-[360px]"
          )}
        >
          {visibleFunnels.map((funnel) => {
            const funnelLeads = leadsByFunnel[funnel.id].filter(filterLead);

            return (
              <section
                key={funnel.id}
                className="flex min-h-0 w-72 shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg2)]"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: funnel.color }}>
                      {funnel.label}
                    </h2>
                    <p className="text-xs text-[var(--text3)]">
                      {funnelLeads.length} lead(s)
                    </p>
                  </div>

                  <span className="rounded-full bg-[var(--bg4)] px-2 py-1 font-mono text-xs text-[var(--text2)]">
                    {funnel.short}
                  </span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                  {funnelLeads.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[var(--border2)] p-4 text-center text-xs text-[var(--text3)]">
                      Nenhum lead aqui.
                    </div>
                  ) : (
                    funnelLeads.map((lead) => (
                      <article
                        key={lead.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3 transition hover:border-[var(--border2)] hover:bg-[var(--bg4)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                              {getLeadName(lead)}
                            </h3>
                            <p className="truncate text-xs text-[var(--text2)]">
                              {formatPhone(lead.tel)}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-[rgba(232,197,71,.15)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                            {lead.diaProsp || "d1"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {lead.esp && (
                            <span className="rounded-full bg-[var(--bg4)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                              {lead.esp}
                            </span>
                          )}

                          {lead.campanha && (
                            <span className="rounded-full bg-[var(--bg4)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                              {lead.campanha}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--text3)]">
                          <div>
                            <span className="block uppercase tracking-wider">Valor</span>
                            <span className="text-[var(--text2)]">
                              {formatCurrency(lead.valor)}
                            </span>
                          </div>

                          <div>
                            <span className="block uppercase tracking-wider">Entrada</span>
                            <span className="text-[var(--text2)]">
                              {formatDate(lead.dataEntrada)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-[var(--border)] pt-3">
                          {getMoveTarget(lead) ? (
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                                Mover para
                              </span>
                              <select
                                value=""
                                disabled={movingLeadId === lead.id}
                                onChange={(event) =>
                                  void handleMoveLead(lead, event.target.value)
                                }
                                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1.5 text-xs text-[var(--text2)] outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="">
                                  {movingLeadId === lead.id
                                    ? "Movendo..."
                                    : "Selecionar"}
                                </option>
                                <option value={getMoveTarget(lead)?.id}>
                                  {getMoveTarget(lead)?.label}
                                </option>
                              </select>
                            </label>
                          ) : (
                            <div className="text-[11px] text-[var(--text3)]">
                              Movimento indisponível nesta etapa.
                            </div>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
