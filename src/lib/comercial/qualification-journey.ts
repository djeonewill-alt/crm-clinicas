import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

export type QualificationCheckpoint =
  | "lead_entrada"
  | "primeira_abordagem_enviada"
  | "cliente_respondeu_abordagem"
  | "qualificacao_iniciada"
  | "pacote_inicial_pendente"
  | "aguardando_regiao"
  | "aguardando_subregiao"
  | "regioes_estimadas"
  | "aguardando_intencao_tratamento"
  | "aguardando_unidade"
  | "aguardando_disponibilidade"
  | "aguardando_confirmacao_horario"
  | "aguardando_sinal"
  | "aguardando_comprovante"
  | "agendamento_confirmado";

export type QualificationJourneyState = {
  currentCheckpoint: QualificationCheckpoint;
  currentLabel: string;
  nextCheckpoint: QualificationCheckpoint | null;
  nextLabel: string | null;
  shouldSuggestQualification: boolean;
  pendingQuestion: string | null;
  knownFields: Record<string, string | boolean>;
  guidance: string;
};

export type QualificationTimelineCheckpointKey =
  | "entrada"
  | "funcionamento"
  | "valor"
  | "regiao"
  | "subregiao"
  | "unidade"
  | "agenda"
  | "sinal"
  | "confirmacao";

export type QualificationTimelineCheckpointStatus =
  | "done"
  | "current"
  | "pending"
  | "touched";

export type QualificationTimelineCheckpoint = {
  key: QualificationTimelineCheckpointKey;
  label: string;
  status: QualificationTimelineCheckpointStatus;
  evidence?: string;
};

export type QualificationTimelineStateForAI = {
  checkpoints: QualificationTimelineCheckpoint[];
  doneKeys: QualificationTimelineCheckpointKey[];
  pendingKeys: QualificationTimelineCheckpointKey[];
  touchedKeys: QualificationTimelineCheckpointKey[];
  currentKey?: QualificationTimelineCheckpointKey;
  nextBestKey?: QualificationTimelineCheckpointKey;
  nextBestLabel?: string;
  nextBestQuestion?: string;
  summaryForAI: string;
};

type GetQualificationJourneyStateInput = {
  lead: Pick<Lead, "funnel" | "diaProsp">;
  recentHistory?: LeadHistoryItem[];
  currentMessage?: string;
};

type GetQualificationTimelineStateForAIInput = {
  lead: Pick<Lead, "funnel" | "diaProsp">;
  recentHistory?: LeadHistoryItem[];
  currentMessage?: string;
  journeyState?: QualificationJourneyState;
};

const CHECKPOINT_LABELS: Record<QualificationCheckpoint, string> = {
  lead_entrada: "Lead recebido",
  primeira_abordagem_enviada: "Primeira abordagem enviada",
  cliente_respondeu_abordagem: "Cliente respondeu",
  qualificacao_iniciada: "Qualificacao iniciada",
  pacote_inicial_pendente: "Pacote inicial pendente",
  aguardando_regiao: "Perguntar regiao do corpo",
  aguardando_subregiao: "Detalhar sub-regiao",
  regioes_estimadas: "Regioes estimadas",
  aguardando_intencao_tratamento: "Entender intencao",
  aguardando_unidade: "Perguntar unidade",
  aguardando_disponibilidade: "Perguntar disponibilidade",
  aguardando_confirmacao_horario: "Confirmar horario",
  aguardando_sinal: "Orientar sinal",
  aguardando_comprovante: "Aguardar comprovante",
  agendamento_confirmado: "Agendamento confirmado",
};

const PENDING_QUESTIONS: Partial<Record<QualificationCheckpoint, string>> = {
  qualificacao_iniciada: "Quer que eu te explique como funciona e depois te pergunto a regiao?",
  pacote_inicial_pendente: "Explicar o pacote inicial e perguntar qual regiao do corpo a cliente quer tratar.",
  aguardando_regiao: "Qual regiao do corpo voce deseja tratar?",
  aguardando_subregiao: "Essa regiao fica acima, abaixo do umbigo ou nas duas partes?",
  aguardando_intencao_tratamento: "O que mais te incomoda nessa regiao hoje?",
  aguardando_unidade: "Qual unidade fica melhor para voce: Paulista, Tatuape ou Mairipora?",
  aguardando_disponibilidade: "Qual periodo ou dia costuma ser melhor para voce?",
  aguardando_confirmacao_horario: "Confirmar o horario manualmente antes de responder.",
  aguardando_sinal: "Orientar sinal somente se o atendimento ja estiver nesse momento.",
  aguardando_comprovante: "Pedir comprovante se o Pix/sinal ja foi combinado.",
};

const REGION_WORDS = [
  "barriga",
  "abdomen",
  "abdômen",
  "flanco",
  "flancos",
  "gluteo",
  "gluteos",
  "glúteo",
  "glúteos",
  "coxa",
  "coxas",
  "costas",
  "seio",
  "seios",
  "braco",
  "bracos",
  "braço",
  "braços",
];

const UNIT_WORDS = ["paulista", "tatuape", "tatuapé", "mairipora", "mairiporã"];
const PIX_WORDS = ["pix", "sinal", "reserva", "pagamento", "comprovante"];

const TIMELINE_CHECKPOINTS: Array<{
  key: QualificationTimelineCheckpointKey;
  label: string;
}> = [
  { key: "entrada", label: "Entrada" },
  { key: "funcionamento", label: "Funcionamento" },
  { key: "valor", label: "Valor" },
  { key: "regiao", label: "Regiao" },
  { key: "subregiao", label: "Sub-regiao" },
  { key: "unidade", label: "Unidade" },
  { key: "agenda", label: "Agenda" },
  { key: "sinal", label: "Sinal" },
  { key: "confirmacao", label: "Confirmacao" },
];
const TIMELINE_ORDER = TIMELINE_CHECKPOINTS.map((checkpoint) => checkpoint.key);
const TIMELINE_CURRENT_MAP: Partial<
  Record<QualificationCheckpoint, QualificationTimelineCheckpointKey>
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
const VALUE_WORDS = [
  "valor",
  "preco",
  "preco",
  "r$180",
  "r$ 180",
  "promocao",
  "promocao",
  "campanha",
  "sessao",
  "sessao",
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
const SCHEDULE_WORDS = [
  "agenda",
  "agendar",
  "avaliacao",
  "avaliacao",
  "disponibilidade",
  "horario",
  "horario",
  "manha",
  "manha",
  "tarde",
  "sabado",
  "sabado",
  "quarta",
  "sexta",
  "dia",
];
const TIMELINE_QUESTIONS: Partial<
  Record<QualificationTimelineCheckpointKey, string>
> = {
  regiao:
    "Para eu te orientar melhor, qual regiao do corpo voce gostaria de tratar?",
  subregiao:
    "Na barriga, suas estrias ficam mais acima do umbigo, abaixo do umbigo ou nas duas partes?",
  unidade:
    "Qual unidade fica melhor para voce: Paulista/Paraiso, Tatuape ou Mairipora?",
  agenda:
    "Voce prefere atendimento durante a semana ou sabado? E tem algum periodo melhor: manha ou tarde?",
  sinal:
    "Esse horario funciona para voce? Se quiser garantir, posso te passar as informacoes da reserva.",
  confirmacao:
    "Me envia o comprovante por aqui para confirmarmos sua reserva no sistema.",
};

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

function getHistoryText(item: LeadHistoryItem) {
  return [item.title, item.description, JSON.stringify(item.metadata ?? {})]
    .filter(Boolean)
    .join(" ");
}

function sortOldestFirst(items: LeadHistoryItem[]) {
  return [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function hasTextMatch(text: string, words: string[]) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

export function getCheckpointLabel(checkpoint: QualificationCheckpoint) {
  return CHECKPOINT_LABELS[checkpoint];
}

export function getNextCheckpointLabel(
  checkpoint: QualificationCheckpoint | null
) {
  return checkpoint ? CHECKPOINT_LABELS[checkpoint] : null;
}

function getTimelineCurrentKey(journeyState: QualificationJourneyState) {
  return (
    TIMELINE_CURRENT_MAP[journeyState.currentCheckpoint] ??
    (journeyState.nextCheckpoint
      ? TIMELINE_CURRENT_MAP[journeyState.nextCheckpoint]
      : null)
  );
}

function getTimelineQuestion(
  key: QualificationTimelineCheckpointKey,
  combinedText: string
) {
  if (key === "subregiao") {
    if (hasTextMatch(combinedText, ["gluteo", "gluteos", "bumbum"])) {
      return "As estrias ficam em um lado, nos dois gluteos ou mais na lateral/proximo ao quadril?";
    }

    return TIMELINE_QUESTIONS.subregiao;
  }

  return TIMELINE_QUESTIONS[key];
}

function getNextBestTimelineKey(
  doneEvidence: Partial<Record<QualificationTimelineCheckpointKey, string>>,
  currentKey: QualificationTimelineCheckpointKey | null
) {
  const priority: QualificationTimelineCheckpointKey[] = [
    "regiao",
    "subregiao",
    "unidade",
    "agenda",
    "sinal",
    "confirmacao",
  ];
  const next = priority.find((key) => !doneEvidence[key]);

  if (next) return next;
  if (currentKey && !doneEvidence[currentKey]) return currentKey;

  return undefined;
}

export function getQualificationTimelineStateForAI({
  lead,
  recentHistory = [],
  currentMessage = "",
  journeyState,
}: GetQualificationTimelineStateForAIInput): QualificationTimelineStateForAI {
  const resolvedJourneyState =
    journeyState ??
    getQualificationJourneyState({
      lead,
      recentHistory,
      currentMessage,
    });
  const history = sortOldestFirst(recentHistory).slice(-30);
  const historyText = history.map(getHistoryText).join(" ");
  const combinedText = `${historyText} ${currentMessage}`;
  const hasClosedSchedule =
    lead.funnel === "clientes" ||
    history.some((item) => getEvent(item) === "lead_closed_with_schedule");
  const doneEvidence: Partial<
    Record<QualificationTimelineCheckpointKey, string>
  > = {
    entrada: "lead existe no CRM",
  };

  if (hasTextMatch(combinedText, FUNCTION_WORDS)) {
    doneEvidence.funcionamento =
      "conversa menciona funcionamento, tratamento ou metodo";
  }

  if (hasTextMatch(combinedText, VALUE_WORDS)) {
    doneEvidence.valor = "conversa menciona valor, promocao ou sessao";
  }

  if (hasTextMatch(combinedText, REGION_WORDS)) {
    doneEvidence.regiao = "conversa menciona regiao do corpo";
  }

  if (hasTextMatch(combinedText, SUBREGION_WORDS)) {
    doneEvidence.subregiao = "conversa menciona detalhe/sub-regiao";
  }

  if (hasTextMatch(combinedText, UNIT_WORDS)) {
    doneEvidence.unidade = "conversa menciona unidade";
  }

  if (hasTextMatch(combinedText, SCHEDULE_WORDS)) {
    doneEvidence.agenda = "conversa menciona agenda ou disponibilidade";
  }

  if (hasTextMatch(combinedText, PIX_WORDS)) {
    doneEvidence.sinal = "conversa menciona Pix, sinal, reserva ou comprovante";
  }

  if (hasClosedSchedule) {
    doneEvidence.confirmacao = "agendamento/fechamento registrado";
  }

  const currentKey = getTimelineCurrentKey(resolvedJourneyState);
  const currentIndex = currentKey ? TIMELINE_ORDER.indexOf(currentKey) : -1;
  const nextBestKey = getNextBestTimelineKey(doneEvidence, currentKey ?? null);
  const checkpoints = TIMELINE_CHECKPOINTS.map<QualificationTimelineCheckpoint>(
    (checkpoint, index) => {
      const evidence = doneEvidence[checkpoint.key];

      if (evidence) {
        return {
          ...checkpoint,
          status: checkpoint.key === currentKey ? "current" : "done",
          evidence,
        };
      }

      if (checkpoint.key === nextBestKey || checkpoint.key === currentKey) {
        return {
          ...checkpoint,
          status: "current",
          evidence: resolvedJourneyState.currentLabel,
        };
      }

      if (currentIndex > 0 && index < currentIndex) {
        return {
          ...checkpoint,
          status: "touched",
          evidence:
            "etapa anterior ao ponto atual sem evidencia clara no historico",
        };
      }

      return {
        ...checkpoint,
        status: "pending",
        evidence: "pendente",
      };
    }
  );
  const doneKeys = checkpoints
    .filter((checkpoint) => checkpoint.status === "done")
    .map((checkpoint) => checkpoint.key);
  const pendingKeys = checkpoints
    .filter((checkpoint) => checkpoint.status === "pending")
    .map((checkpoint) => checkpoint.key);
  const touchedKeys = checkpoints
    .filter((checkpoint) => checkpoint.status === "touched")
    .map((checkpoint) => checkpoint.key);
  const nextBestLabel = nextBestKey
    ? TIMELINE_CHECKPOINTS.find((checkpoint) => checkpoint.key === nextBestKey)
        ?.label
    : undefined;
  const nextBestQuestion =
    (nextBestKey && getTimelineQuestion(nextBestKey, combinedText)) ||
    resolvedJourneyState.pendingQuestion ||
    undefined;
  const summaryForAI = [
    `Concluidos: ${doneKeys.join(", ") || "nenhum"}.`,
    `Tocados fora de ordem/parciais: ${touchedKeys.join(", ") || "nenhum"}.`,
    `Pendentes: ${pendingKeys.join(", ") || "nenhum"}.`,
    currentKey ? `Atual: ${currentKey}.` : "",
    nextBestKey ? `Proximo melhor: ${nextBestKey}.` : "",
    nextBestQuestion ? `Pergunta guia: ${nextBestQuestion}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    checkpoints,
    doneKeys,
    pendingKeys,
    touchedKeys,
    currentKey: currentKey ?? undefined,
    nextBestKey,
    nextBestLabel,
    nextBestQuestion,
    summaryForAI,
  };
}

export function getQualificationJourneyState({
  lead,
  recentHistory = [],
  currentMessage = "",
}: GetQualificationJourneyStateInput): QualificationJourneyState {
  const history = sortOldestFirst(recentHistory).slice(-30);
  const historyText = history.map(getHistoryText).join(" ");
  const combinedText = `${historyText} ${currentMessage}`;
  const knownFields: Record<string, string | boolean> = {};

  const hasClosedSchedule = history.some(
    (item) => getEvent(item) === "lead_closed_with_schedule"
  );
  if (hasClosedSchedule || lead.funnel === "clientes") {
    return buildState({
      checkpoint: "agendamento_confirmado",
      nextCheckpoint: null,
      shouldSuggestQualification: false,
      knownFields,
      guidance: "Atendimento ja fechado/agendado. Nao conduzir para qualificacao.",
    });
  }

  const sentIndexes = history
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => getEvent(item) === "commercial_reply_sent")
    .map(({ index }) => index);
  const receivedIndexes = history
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => getEvent(item) === "customer_message_received")
    .map(({ index }) => index);
  const lastReceivedIndex = receivedIndexes.at(-1) ?? -1;
  const hasSentBeforeLastReceived = sentIndexes.some(
    (index) => lastReceivedIndex >= 0 && index < lastReceivedIndex
  );

  if (lead.funnel === "prospeccao") {
    if (hasSentBeforeLastReceived) {
      return buildState({
        checkpoint: "cliente_respondeu_abordagem",
        nextCheckpoint: "qualificacao_iniciada",
        shouldSuggestQualification: true,
        knownFields,
        guidance:
          "Cliente respondeu a primeira abordagem. Sugerir mover manualmente para Qualificacao e conduzir para o pacote inicial.",
      });
    }

    if (sentIndexes.length > 0) {
      return buildState({
        checkpoint: "primeira_abordagem_enviada",
        nextCheckpoint: "cliente_respondeu_abordagem",
        shouldSuggestQualification: false,
        knownFields,
        guidance: "Aguardar resposta do cliente antes de qualificar.",
      });
    }

    return buildState({
      checkpoint: "lead_entrada",
      nextCheckpoint: "primeira_abordagem_enviada",
      shouldSuggestQualification: false,
      knownFields,
      guidance: "Lead ainda em entrada/prospeccao.",
    });
  }

  if (hasTextMatch(combinedText, UNIT_WORDS)) {
    knownFields.unitMentioned = true;
  }

  if (hasTextMatch(combinedText, PIX_WORDS)) {
    knownFields.paymentMentioned = true;
  }

  if (hasTextMatch(combinedText, REGION_WORDS)) {
    knownFields.regionMentioned = true;
  }

  if (lead.funnel === "qualificacao") {
    if (knownFields.paymentMentioned) {
      return buildState({
        checkpoint: "aguardando_comprovante",
        nextCheckpoint: "agendamento_confirmado",
        shouldSuggestQualification: false,
        knownFields,
        guidance:
          "Pagamento/sinal apareceu na conversa. Nao confirmar recebimento sem revisao humana.",
      });
    }

    if (knownFields.unitMentioned) {
      return buildState({
        checkpoint: "aguardando_disponibilidade",
        nextCheckpoint: "aguardando_confirmacao_horario",
        shouldSuggestQualification: false,
        knownFields,
        guidance: "Unidade mencionada. Proximo passo e entender disponibilidade.",
      });
    }

    if (knownFields.regionMentioned) {
      return buildState({
        checkpoint: "aguardando_subregiao",
        nextCheckpoint: "regioes_estimadas",
        shouldSuggestQualification: false,
        knownFields,
        guidance:
          "Regiao do corpo mencionada. Detalhar sub-regiao antes de avancar.",
      });
    }

    return buildState({
      checkpoint: "pacote_inicial_pendente",
      nextCheckpoint: "aguardando_regiao",
      shouldSuggestQualification: false,
      knownFields,
      guidance:
        "Em qualificacao sem regiao detectada. Enviar pacote inicial curto e perguntar regiao do corpo.",
    });
  }

  return buildState({
    checkpoint: "qualificacao_iniciada",
    nextCheckpoint: "aguardando_regiao",
    shouldSuggestQualification: false,
    knownFields,
    guidance: "Usar o funil atual sem avancar etapas automaticamente.",
  });
}

function buildState(input: {
  checkpoint: QualificationCheckpoint;
  nextCheckpoint: QualificationCheckpoint | null;
  shouldSuggestQualification: boolean;
  knownFields: Record<string, string | boolean>;
  guidance: string;
}): QualificationJourneyState {
  return {
    currentCheckpoint: input.checkpoint,
    currentLabel: getCheckpointLabel(input.checkpoint),
    nextCheckpoint: input.nextCheckpoint,
    nextLabel: getNextCheckpointLabel(input.nextCheckpoint),
    shouldSuggestQualification: input.shouldSuggestQualification,
    pendingQuestion: input.nextCheckpoint
      ? PENDING_QUESTIONS[input.nextCheckpoint] ?? null
      : null,
    knownFields: input.knownFields,
    guidance: input.guidance,
  };
}
