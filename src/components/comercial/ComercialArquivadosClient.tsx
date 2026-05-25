"use client";

import { FUNNELS } from "@/lib/constants/crm";
import type { Lead } from "@/types/lead";

type ComercialArquivadosClientProps = {
  leads: Lead[];
  empresaId: string | number;
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

function getFunnelLabel(funnelId: string) {
  const funnel = FUNNELS.find((item) => item.id === funnelId);

  if (funnel) return funnel.label;
  if (funnelId === "desqualificado") return "Desqualificado";
  if (funnelId === "remarketing") return "Remarketing";

  return funnelId || "sem funil";
}

export function ComercialArquivadosClient({
  leads,
  empresaId,
  empresaNome,
}: ComercialArquivadosClientProps) {
  const totalArquivados = leads.length;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6"
      data-empresa-id={empresaId}
    >
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

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text3)]">
          A restauração será adicionada na próxima etapa.
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--border2)] bg-[var(--bg2)] p-8 text-center text-sm text-[var(--text3)]">
          Nenhum lead arquivado.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {leads.map((lead) => (
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
