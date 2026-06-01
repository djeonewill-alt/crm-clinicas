"use client";

import type {
  QualificationJourneyState,
  QualificationTimelineCheckpointStatus,
  QualificationTimelineStateForAI,
} from "@/lib/comercial/qualification-journey";
import { getQualificationTimelineStateForAI } from "@/lib/comercial/qualification-journey";
import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

type QualificationTimelineProps = {
  lead: Pick<Lead, "funnel" | "diaProsp">;
  history: LeadHistoryItem[];
  journeyState: QualificationJourneyState;
  timelineState?: QualificationTimelineStateForAI;
  isApplyingAction?: boolean;
  onQualify?: () => void;
  onUseSuggestion?: (message: string) => void;
};

const STATUS_LABELS: Record<QualificationTimelineCheckpointStatus, string> = {
  done: "concluido",
  current: "atual",
  pending: "pendente",
  touched: "respondido fora de ordem",
};

function getDotClass(status: QualificationTimelineCheckpointStatus) {
  if (status === "done") return "border-green-400 bg-green-500/25 text-green-200";
  if (status === "current") {
    return "border-[var(--accent)] bg-[rgba(232,197,71,.18)] text-[var(--accent)]";
  }
  if (status === "touched") return "border-blue-400 bg-blue-500/15 text-blue-200";
  return "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text3)]";
}

function getLineClass(status: QualificationTimelineCheckpointStatus) {
  return status === "done" || status === "current" || status === "touched"
    ? "bg-[var(--accent)]/40"
    : "bg-[var(--border2)]";
}

export function QualificationTimeline({
  lead,
  history,
  journeyState,
  timelineState: providedTimelineState,
  isApplyingAction = false,
  onQualify,
  onUseSuggestion,
}: QualificationTimelineProps) {
  const timelineState =
    providedTimelineState ??
    getQualificationTimelineStateForAI({
      lead,
      recentHistory: history,
      journeyState,
    });
  const checkpoints = timelineState.checkpoints;
  const nextSuggestion = timelineState.nextSuggestion;
  const nextStepLabel =
    nextSuggestion?.label ??
    timelineState.nextBestLabel ??
    "Acompanhar atendimento";

  return (
    <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-[var(--text)]">
            Jornada do atendimento
          </span>
          <span className="ml-2 text-[var(--text3)]">
            Proximo passo: {nextStepLabel}
          </span>
        </div>

        {journeyState.shouldSuggestQualification && lead.funnel === "prospeccao" && (
          <button
            type="button"
            disabled={isApplyingAction}
            onClick={onQualify}
            className="rounded-md border border-blue-500/40 bg-blue-500/15 px-2 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplyingAction ? "Movendo..." : "Qualificar"}
          </button>
        )}
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max items-start">
          {checkpoints.map((checkpoint, index) => (
            <div key={checkpoint.key} className="flex items-start">
              <div
                className="flex w-20 flex-col items-center gap-1 text-center"
                title={`${checkpoint.label}: ${STATUS_LABELS[checkpoint.status]} - ${
                  checkpoint.evidence ?? ""
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${getDotClass(
                    checkpoint.status
                  )}`}
                >
                  {checkpoint.status === "done" ? "ok" : index + 1}
                </span>
                <span className="text-[10px] leading-tight text-[var(--text2)]">
                  {checkpoint.label}
                </span>
              </div>
              {index < checkpoints.length - 1 && (
                <span
                  className={`mt-3 h-px w-8 shrink-0 ${getLineClass(
                    checkpoint.status
                  )}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {nextSuggestion && (
        <div className="mt-3 rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                Proxima sugestao
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--text)]">
                {nextSuggestion.label}
              </p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-[var(--text2)]">
                {nextSuggestion.message}
              </p>
            </div>
            <button
              type="button"
              disabled={!onUseSuggestion}
              onClick={() => onUseSuggestion?.(nextSuggestion.message)}
              className="rounded-md border border-[var(--accent)]/40 bg-[rgba(232,197,71,.12)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Usar sugestao
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
