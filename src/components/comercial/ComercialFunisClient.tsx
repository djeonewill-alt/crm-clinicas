"use client";

import { useMemo, useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import { cn } from "@/lib/utils/cn";
import type { Lead } from "@/types/lead";

type ComercialFunisClientProps = {
  leads: Lead[];
  empresaNome: string;
};

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

export function ComercialFunisClient({
  leads,
  empresaNome,
}: ComercialFunisClientProps) {
  const [selectedFunnel, setSelectedFunnel] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const leadsByFunnel = useMemo(() => {
    return FUNNELS.reduce(
      (acc, funnel) => {
        acc[funnel.id] = leads.filter((lead) => lead.funnel === funnel.id);
        return acc;
      },
      {} as Record<(typeof FUNNELS)[number]["id"], Lead[]>
    );
  }, [leads]);

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

  const visibleFunnels = FUNNELS.filter((funnel) => {
    if (selectedFunnel === "todos") return true;
    return funnel.id === selectedFunnel;
  });

  function filterLead(lead: Lead) {
    if (!normalizedSearch) return true;

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
              {leads.length}
            </div>
            <div className="text-xs text-[var(--text2)]">leads carregados</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-72 flex-1 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
            placeholder="Buscar por nome, telefone, interesse, campanha..."
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedFunnel("todos")}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                selectedFunnel === "todos"
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
            selectedFunnel === "todos" ? "min-w-[1120px]" : "min-w-[360px]"
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
