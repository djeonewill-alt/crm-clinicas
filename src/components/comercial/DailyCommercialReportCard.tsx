"use client";

import { useMemo, useState } from "react";
import {
  buildDailyCommercialReport,
  formatDailyCommercialReportForCopy,
  getSaoPauloDateKey,
} from "@/lib/comercial/daily-commercial-report";
import type { LeadHistoryItem } from "@/types/lead-history";
import type { Lead } from "@/types/lead";

type DailyCommercialReportCardProps = {
  leads: Lead[];
  history: LeadHistoryItem[];
};

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="text-2xl font-semibold text-[var(--accent)]">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
        {label}
      </div>
      {hint && <div className="mt-2 text-xs text-[var(--text3)]">{hint}</div>}
    </div>
  );
}

export function DailyCommercialReportCard({
  leads,
  history,
}: DailyCommercialReportCardProps) {
  const [selectedDate, setSelectedDate] = useState(getSaoPauloDateKey());
  const [copyMessage, setCopyMessage] = useState("");

  const report = useMemo(
    () =>
      buildDailyCommercialReport({
        leads,
        history,
        date: selectedDate,
      }),
    [history, leads, selectedDate]
  );

  async function handleCopyReport() {
    const text = formatDailyCommercialReportForCopy(report);

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Relatorio copiado.");
    } catch {
      setCopyMessage("Nao foi possivel copiar automaticamente.");
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Relatorio comercial diario
          </p>
          <h2 className="text-lg font-semibold">Producao do dia</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text2)]">
            Leads novos usam a data de entrada. Producao usa o historico criado no CRM
            durante o dia selecionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setCopyMessage("");
            }}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />

          <button
            type="button"
            onClick={() => void handleCopyReport()}
            className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.18)]"
          >
            Copiar relatorio
          </button>
        </div>
      </div>

      {copyMessage && (
        <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text2)]">
          {copyMessage}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Leads novos" value={report.newLeads.length} />
        <MetricCard label="Trabalhados" value={report.workedLeadIds.size} />
        <MetricCard label="Antigos trabalhados" value={report.oldWorkedLeadIds.size} />
        <MetricCard label="Mensagens enviadas" value={report.production.messagesSent} />
        <MetricCard label="Respostas recebidas" value={report.production.customerReplies} />
        <MetricCard label="Ligacoes feitas" value={report.production.callsMade} />
        <MetricCard label="Nao atendidas" value={report.production.callsNoAnswer} />
        <MetricCard label="Qualificados" value={report.movement.qualified} />
        <MetricCard label="Fechados" value={report.movement.closed} />
        <MetricCard label="Retorno/Futuro" value={report.movement.returns} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
          <h3 className="text-sm font-semibold">Leads novos por campanha</h3>
          <div className="mt-3 space-y-2">
            {report.newLeadsByCampaign.length === 0 ? (
              <p className="text-sm text-[var(--text3)]">Sem leads novos nesta data.</p>
            ) : (
              report.newLeadsByCampaign.map((item) => (
                <div
                  key={item.campaign}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg2)] px-3 py-2"
                >
                  <span className="truncate text-sm text-[var(--text2)]">{item.campaign}</span>
                  <span className="font-mono text-sm text-[var(--accent)]">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
          <h3 className="text-sm font-semibold">Campanhas trabalhadas</h3>
          <div className="mt-3 space-y-2">
            {report.campaignSummary.length === 0 ? (
              <p className="text-sm text-[var(--text3)]">Sem producao registrada nesta data.</p>
            ) : (
              report.campaignSummary.slice(0, 8).map((item) => (
                <div key={item.campaign} className="rounded-lg bg-[var(--bg2)] px-3 py-2">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">
                    {item.campaign}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text3)]">
                    Novos: {item.newLeads} · Trabalhados: {item.workedLeads} · Qualif.:{" "}
                    {item.qualified} · Fechados: {item.closed}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
