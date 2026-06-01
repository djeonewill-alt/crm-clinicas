"use client";

import type {
  QualificationCheckpoint,
  QualificationJourneyState,
} from "@/lib/comercial/qualification-journey";
import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

type VisualCheckpointId =
  | "entrada"
  | "funcionamento"
  | "valor"
  | "regiao"
  | "subregiao"
  | "unidade"
  | "agenda"
  | "sinal"
  | "confirmacao";

type VisualCheckpointStatus = "done" | "current" | "pending" | "touched";

type VisualCheckpoint = {
  id: VisualCheckpointId;
  label: string;
  status: VisualCheckpointStatus;
  reason: string;
};

type QualificationTimelineProps = {
  lead: Pick<Lead, "funnel">;
  history: LeadHistoryItem[];
  journeyState: QualificationJourneyState;
  isApplyingAction?: boolean;
  onQualify?: () => void;
};

const VISUAL_CHECKPOINTS: Array<{
  id: VisualCheckpointId;
  label: string;
}> = [
  { id: "entrada", label: "Entrada" },
  { id: "funcionamento", label: "Funcionamento" },
  { id: "valor", label: "Valor" },
  { id: "regiao", label: "Região" },
  { id: "subregiao", label: "Sub-região" },
  { id: "unidade", label: "Unidade" },
  { id: "agenda", label: "Agenda" },
  { id: "sinal", label: "Sinal" },
  { id: "confirmacao", label: "Confirmação" },
];

const CURRENT_CHECKPOINT_MAP: Partial<
  Record<QualificationCheckpoint, VisualCheckpointId>
> = {
  lead_entrada: "entrada",
  primeira_abordagem_enviada: "entrada",
  cliente_respondeu_abordagem: "funcionamento",
  qualificacao_iniciada: "funcionamento",
  pacote_inicial_pendente: "funcionamento",
  aguardando_regiao: "regiao",
  aguardando_subregiao: "subregiao",
  regioes_estimadas: "unidade",
  aguardando_intencao_tratamento: "unidade",
  aguardando_unidade: "unidade",
  aguardando_disponibilidade: "agenda",
  aguardando_confirmacao_horario: "agenda",
  aguardando_sinal: "sinal",
  aguardando_comprovante: "sinal",
  agendamento_confirmado: "confirmacao",
};

const STATUS_LABELS: Record<VisualCheckpointStatus, string> = {
  done: "concluído",
  current: "atual",
  pending: "pendente",
  touched: "respondido fora de ordem",
};

const FUNCTION_WORDS = [
  "funciona",
  "tratamento",
  "microagulhamento",
  "regenerativo",
  "laser",
  "camuflagem",
  "pintura",
  "tinta",
];
const VALUE_WORDS = ["valor", "preco", "preço", "r$180", "r$ 180", "promocao", "promoção", "campanha"];
const REGION_WORDS = [
  "barriga",
  "abdomen",
  "abdômen",
  "flanco",
  "flancos",
  "gluteo",
  "glúteo",
  "gluteos",
  "glúteos",
  "bumbum",
  "coxa",
  "coxas",
  "seio",
  "seios",
  "braco",
  "braço",
  "bracos",
  "braços",
  "costas",
];
const SUBREGION_WORDS = [
  "acima do umbigo",
  "abaixo do umbigo",
  "duas partes",
  "superior",
  "inferior",
  "interna",
  "externa",
  "lateral",
  "um lado",
  "dois lados",
];
const UNIT_WORDS = ["paulista", "paraiso", "paraíso", "tatuape", "tatuapé", "mairipora", "mairiporã", "unidade"];
const SCHEDULE_WORDS = [
  "agenda",
  "agendar",
  "avaliacao",
  "avaliação",
  "disponibilidade",
  "horario",
  "horário",
  "manha",
  "manhã",
  "tarde",
  "sabado",
  "sábado",
  "quarta",
  "sexta",
];
const PAYMENT_WORDS = ["pix", "sinal", "reserva", "pagamento", "comprovante"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getEvent(item: LeadHistoryItem) {
  const event = item.metadata?.event;
  return typeof event === "string" ? event : "";
}

function getHistoryText(history: LeadHistoryItem[]) {
  return history
    .map((item) =>
      [item.title, item.description, JSON.stringify(item.metadata ?? {})]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");
}

function hasAny(text: string, words: string[]) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

function getDoneReasons(input: {
  lead: Pick<Lead, "funnel">;
  history: LeadHistoryItem[];
}) {
  const text = getHistoryText(input.history);
  const hasClosedSchedule =
    input.lead.funnel === "clientes" ||
    input.history.some((item) => getEvent(item) === "lead_closed_with_schedule");

  return {
    entrada: "lead criado no CRM",
    funcionamento: hasAny(text, FUNCTION_WORDS)
      ? "histórico menciona funcionamento/tratamento"
      : "",
    valor: hasAny(text, VALUE_WORDS)
      ? "histórico menciona valor ou campanha"
      : "",
    regiao: hasAny(text, REGION_WORDS)
      ? "histórico menciona região do corpo"
      : "",
    subregiao: hasAny(text, SUBREGION_WORDS)
      ? "histórico menciona detalhe da região"
      : "",
    unidade: hasAny(text, UNIT_WORDS)
      ? "histórico menciona unidade"
      : "",
    agenda: hasAny(text, SCHEDULE_WORDS)
      ? "histórico menciona agenda/disponibilidade"
      : "",
    sinal: hasAny(text, PAYMENT_WORDS)
      ? "histórico menciona Pix/sinal/reserva"
      : "",
    confirmacao: hasClosedSchedule ? "agendamento/fechamento registrado" : "",
  } satisfies Record<VisualCheckpointId, string>;
}

function getCurrentVisualCheckpoint(journeyState: QualificationJourneyState) {
  return (
    CURRENT_CHECKPOINT_MAP[journeyState.currentCheckpoint] ??
    (journeyState.nextCheckpoint
      ? CURRENT_CHECKPOINT_MAP[journeyState.nextCheckpoint]
      : null)
  );
}

function buildVisualCheckpoints(input: QualificationTimelineProps) {
  const doneReasons = getDoneReasons(input);
  const currentId = getCurrentVisualCheckpoint(input.journeyState);
  const currentIndex = currentId
    ? VISUAL_CHECKPOINTS.findIndex((checkpoint) => checkpoint.id === currentId)
    : -1;

  return VISUAL_CHECKPOINTS.map<VisualCheckpoint>((checkpoint, index) => {
    const explicitReason = doneReasons[checkpoint.id];

    if (explicitReason) {
      return {
        ...checkpoint,
        status: checkpoint.id === currentId ? "current" : "done",
        reason: explicitReason,
      };
    }

    if (checkpoint.id === currentId) {
      return {
        ...checkpoint,
        status: "current",
        reason: input.journeyState.currentLabel,
      };
    }

    if (currentIndex > 0 && index < currentIndex) {
      return {
        ...checkpoint,
        status: "touched",
        reason: "etapa anterior ao ponto atual, sem sinal claro no histórico",
      };
    }

    return {
      ...checkpoint,
      status: "pending",
      reason: "ainda pendente",
    };
  });
}

function getDotClass(status: VisualCheckpointStatus) {
  if (status === "done") return "border-green-400 bg-green-500/25 text-green-200";
  if (status === "current") {
    return "border-[var(--accent)] bg-[rgba(232,197,71,.18)] text-[var(--accent)]";
  }
  if (status === "touched") return "border-blue-400 bg-blue-500/15 text-blue-200";
  return "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text3)]";
}

function getLineClass(status: VisualCheckpointStatus) {
  return status === "done" || status === "current" || status === "touched"
    ? "bg-[var(--accent)]/40"
    : "bg-[var(--border2)]";
}

export function QualificationTimeline({
  lead,
  history,
  journeyState,
  isApplyingAction = false,
  onQualify,
}: QualificationTimelineProps) {
  const checkpoints = buildVisualCheckpoints({
    lead,
    history,
    journeyState,
    isApplyingAction,
    onQualify,
  });
  const actionText = journeyState.pendingQuestion ?? journeyState.guidance;

  return (
    <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-[var(--text)]">
            Jornada do atendimento
          </span>
          {journeyState.nextLabel && (
            <span className="ml-2 text-[var(--text3)]">
              Próximo passo: {journeyState.nextLabel}
            </span>
          )}
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
            <div key={checkpoint.id} className="flex items-start">
              <div
                className="flex w-20 flex-col items-center gap-1 text-center"
                title={`${checkpoint.label}: ${STATUS_LABELS[checkpoint.status]} — ${checkpoint.reason}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${getDotClass(
                    checkpoint.status
                  )}`}
                >
                  {checkpoint.status === "done" ? "✓" : index + 1}
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

      {actionText && (
        <p className="mt-2 text-[11px] text-[var(--text3)]">
          Ação sugerida: {actionText}
        </p>
      )}
    </div>
  );
}
