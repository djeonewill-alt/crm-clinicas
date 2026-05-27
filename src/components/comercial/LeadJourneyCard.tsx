"use client";

import { FUNNELS } from "@/lib/constants/crm";
import { getAttemptProgress } from "@/lib/services/queue";
import type { CommercialContext } from "@/types/commercial-contexts";
import type { Lead, Tentativa } from "@/types/lead";

type LeadJourneyCardProps = {
  lead: Lead;
  tentativas?: Tentativa[];
  currentCommercialContext?: CommercialContext | null;
};

function getFunnelLabel(funnelId: string) {
  return FUNNELS.find((funnel) => funnel.id === funnelId)?.label ?? funnelId;
}

function getDayLabel(diaProsp?: string) {
  if (!diaProsp) return "sem etapa";

  const normalized = diaProsp.toLowerCase();
  const number = normalized.replace(/^[a-z]+/, "");

  if (normalized.startsWith("d") && number) return `Dia ${number}`;
  if (normalized.startsWith("q") && number) return `Qualificacao ${number}`;
  if (normalized.startsWith("r") && number) return `Retorno ${number}`;

  return diaProsp;
}

function hasPendingAttempt(tentativas: Tentativa[] | undefined, tipo: string) {
  return (tentativas ?? []).some(
    (tentativa) => tentativa.tipo === tipo && !tentativa.resultado
  );
}

function getNextAction(lead: Lead, tentativas?: Tentativa[]) {
  const progress = getAttemptProgress({ ...lead, tentativas });

  if (lead.funnel === "prospeccao") {
    if (progress.completed === 0) return "Enviar mensagem inicial";
    if (hasPendingAttempt(tentativas, "ligacao")) {
      return "Fazer ligacao de acompanhamento";
    }
    if (progress.isComplete) return "Avaliar avanco para proximo dia ou retorno";
    return "Concluir tentativa pendente do dia";
  }

  if (lead.funnel === "qualificacao") {
    return "Responder duvidas e conduzir para agendamento/sinal";
  }

  if (lead.funnel === "retorno") {
    return lead.retornoData
      ? "Realizar contato de retorno na data combinada"
      : "Definir data de retorno antes do proximo contato";
  }

  if (lead.funnel === "clientes") {
    return "Acompanhar cliente/agendamento";
  }

  return "Verificar proxima acao no historico";
}

export function LeadJourneyCard({
  lead,
  tentativas,
  currentCommercialContext,
}: LeadJourneyCardProps) {
  const progress = getAttemptProgress({ ...lead, tentativas });
  const funnelLabel = getFunnelLabel(lead.funnel);
  const dayLabel = getDayLabel(lead.diaProsp);
  const progressLabel =
    progress.total > 0
      ? `${progress.completed}/${progress.total} tentativas concluidas`
      : "Nenhuma tentativa configurada para esta etapa.";

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Jornada comercial
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
            {funnelLabel} · {dayLabel} · {lead.diaProsp || "sem etapa"}
          </h3>
        </div>

        <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-3 py-1 text-xs font-semibold text-[var(--text2)]">
          {progressLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Funil atual
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">{funnelLabel}</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Etapa
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">{dayLabel}</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Contexto
          </p>
          <p className="mt-1 truncate text-sm text-[var(--text)]">
            {currentCommercialContext?.name ?? "Base global"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
          Proxima acao recomendada
        </p>
        <p className="mt-1 text-sm text-[var(--text2)]">
          {getNextAction(lead, tentativas)}
        </p>
      </div>
    </section>
  );
}
