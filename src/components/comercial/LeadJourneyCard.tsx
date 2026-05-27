"use client";

import { FUNNELS } from "@/lib/constants/crm";
import { suggestCommercialJourneyNextStep } from "@/lib/comercial/commercial-journey-suggester";
import { getAttemptProgress } from "@/lib/services/queue";
import type { CommercialContext } from "@/types/commercial-contexts";
import type { Lead, Tentativa } from "@/types/lead";

type LeadJourneyCardProps = {
  lead: Lead;
  tentativas?: Tentativa[];
  currentCommercialContext?: CommercialContext | null;
};

function getFunnelLabel(funnelId: string) {
  if (funnelId === "arquivados") return "Arquivados";
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

function getRiskLabel(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "high") return "Atencao alta";
  if (riskLevel === "medium") return "Atencao media";
  return "Baixo risco";
}

function getRiskClass(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (riskLevel === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-green-500/30 bg-green-500/10 text-green-300";
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
  const suggestion = suggestCommercialJourneyNextStep({ lead, tentativas });

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
              Proxima acao recomendada
            </p>
            <h4 className="mt-1 text-sm font-semibold text-[var(--text)]">
              {suggestion.title}
            </h4>
          </div>

          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getRiskClass(
              suggestion.riskLevel
            )}`}
          >
            {getRiskLabel(suggestion.riskLevel)}
          </span>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[var(--text2)]">
          {suggestion.description}
        </p>

        {suggestion.recommendedFunnel && (
          <p className="mt-2 text-xs text-[var(--text3)]">
            Sugestao de funil: {getFunnelLabel(suggestion.recommendedFunnel)}.
          </p>
        )}

        {suggestion.reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.reasons.slice(0, 3).map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-2 py-0.5 text-[10px] text-[var(--text3)]"
              >
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
