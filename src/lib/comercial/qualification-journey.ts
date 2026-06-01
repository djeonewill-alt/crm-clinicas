export type QualificationCheckpoint =
  | "novo_contato"
  | "cliente_respondeu_abordagem"
  | "aguardando_regiao"
  | "aguardando_subregiao"
  | "aguardando_unidade"
  | "aguardando_disponibilidade"
  | "aguardando_sinal"
  | "agendamento_confirmado";

export type QualificationJourneyState = {
  currentCheckpoint: QualificationCheckpoint;
  nextCheckpoint: QualificationCheckpoint | null;
  currentLabel: string;
  nextLabel: string | null;
  pendingQuestion: string | null;
  guidance: string;
  shouldQualifyLead: boolean;
  shouldSuggestQualification: boolean;
  knownFields: {
    hasRegion: boolean;
    hasSubregion: boolean;
    hasUnit: boolean;
    hasAvailability: boolean;
    hasPaymentSignal: boolean;
    hasConfirmedSchedule: boolean;
  };
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

export type QualificationTimelineCheckpointStatus = "done" | "current" | "pending" | "touched";

export type QualificationTimelineCheckpoint = {
  key: QualificationTimelineCheckpointKey;
  label: string;
  status: QualificationTimelineCheckpointStatus;
  evidence?: string;
};

export type QualificationNextSuggestion = {
  key: QualificationTimelineCheckpointKey | "retorno";
  label: string;
  message: string;
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
  nextSuggestion?: QualificationNextSuggestion;
  summaryForAI: string;
};

type HistoryLike = {
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type LeadLike = {
  id?: string | number | null;
  nome?: string | null;
  status?: string | null;
  funnel?: string | null;
  funil_etapa?: string | null;
  retorno_data?: string | null;
};

const CHECKPOINT_LABELS: Record<QualificationCheckpoint, string> = {
  novo_contato: "Novo contato",
  cliente_respondeu_abordagem: "Cliente respondeu",
  aguardando_regiao: "Coletar regiao",
  aguardando_subregiao: "Detalhar sub-regiao",
  aguardando_unidade: "Confirmar unidade",
  aguardando_disponibilidade: "Ver disponibilidade",
  aguardando_sinal: "Orientar reserva",
  agendamento_confirmado: "Agendamento confirmado",
};

const CHECKPOINT_ORDER: QualificationCheckpoint[] = [
  "novo_contato",
  "cliente_respondeu_abordagem",
  "aguardando_regiao",
  "aguardando_subregiao",
  "aguardando_unidade",
  "aguardando_disponibilidade",
  "aguardando_sinal",
  "agendamento_confirmado",
];

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

const NEXT_STEP_LABELS: Record<QualificationTimelineCheckpointKey, string> = {
  entrada: "Iniciar atendimento",
  funcionamento: "Explicar funcionamento",
  valor: "Explicar valor",
  regiao: "Coletar regiao do corpo",
  subregiao: "Detalhar sub-regiao",
  unidade: "Confirmar unidade",
  agenda: "Ver disponibilidade",
  sinal: "Orientar reserva",
  confirmacao: "Confirmar comprovante",
};

const BODY_REGION_PATTERNS = [
  "barriga",
  "abdomen",
  "abdominal",
  "flanco",
  "flancos",
  "gluteo",
  "gluteos",
  "bumbum",
  "coxa",
  "coxas",
  "seio",
  "seios",
  "braco",
  "bracos",
  "costas",
  "perna",
  "pernas",
  "panturrilha",
  "panturrilhas",
  "quadril",
  "lateral do corpo",
  "interno de coxa",
  "externo de coxa",
];

const SUBREGION_PATTERNS = [
  "acima do umbigo",
  "abaixo do umbigo",
  "nas duas partes",
  "duas partes",
  "superior",
  "inferior",
  "parte interna",
  "parte externa",
  "lateral",
  "proximo ao ombro",
  "perto do quadril",
  "um lado",
  "dois lados",
  "nos dois gluteos",
  "lado direito",
  "lado esquerdo",
  "frente da coxa",
  "atras da coxa",
];

const UNIT_PATTERNS = [
  "paulista",
  "paraiso",
  "tatuape",
  "mairipora",
  "rua manoel",
  "brigadeiro",
  "unidade paulista",
  "unidade tatuape",
  "unidade mairipora",
];

const FUNCTIONING_PATTERNS = [
  "como funciona",
  "microagulhamento",
  "regenerativo",
  "nao e laser",
  "nao e pintura",
  "camuflagem",
  "tratamento para estrias",
  "protocolo",
];

const VALUE_DONE_PATTERNS = [
  "r$ 377",
  "r$377",
  "377 por regiao",
  "377 por sessao",
  "r$ 550",
  "r$550",
  "550 abdomen total",
  "abdomen total",
  "sessao esta saindo",
  "valor promocional",
  "valor de r$",
  "por regiao tratada",
];

const VALUE_TOUCHED_PATTERNS = [
  "quanto custa",
  "qual valor",
  "valores",
  "preco",
  "precos",
  "promocao",
  "campanha",
];

const AGENDA_DONE_PATTERNS = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
  "manha",
  "tarde",
  "horario",
  "as 9",
  "as 10",
  "as 11",
  "as 12",
  "as 13",
  "as 14",
  "as 15",
  "as 16",
  "as 17",
  "as 18",
  "dia 20",
  "dia 27",
  "esse horario funciona",
  "confirmar horario",
  "pode ser tal dia",
  "disponibilidade",
];

const AGENDA_TOUCHED_PATTERNS = [
  "vou agendar",
  "agendo depois",
  "quando eu puder",
  "horarios corridos",
  "em breve",
  "ver agenda",
  "qual dia posso fazer avaliacao",
  "posso fazer avaliacao",
];

const SIGNAL_PATTERNS = ["pix", "sinal", "reserva", "comprovante"];

const RETORNO_PATTERNS = [
  "depois eu vejo",
  "vejo depois",
  "mais tarde",
  "retorno depois",
  "quando eu puder",
  "chamo depois",
  "chamar depois",
];

export function getCheckpointLabel(checkpoint: QualificationCheckpoint | null | undefined): string {
  if (!checkpoint) return "Sem etapa";
  return CHECKPOINT_LABELS[checkpoint] ?? checkpoint;
}

export function getNextCheckpointLabel(checkpoint: QualificationCheckpoint | null | undefined): string | null {
  if (!checkpoint) return null;
  return getCheckpointLabel(checkpoint);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataString(item: HistoryLike, key: string): string {
  const value = item.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataEvent(item: HistoryLike): string {
  return metadataString(item, "event");
}

function getConversationText(item: HistoryLike): string {
  return [
    metadataString(item, "messageText"),
    metadataString(item, "replyText"),
    item.description ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getCustomerMessageText(item: HistoryLike): string {
  return metadataEvent(item) === "customer_message_received" ? getConversationText(item) : "";
}

function getAssistantReplyText(item: HistoryLike): string {
  return metadataEvent(item) === "commercial_reply_sent" ? getConversationText(item) : "";
}

function historyTime(item: HistoryLike): number {
  const time = item.created_at ? new Date(item.created_at).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function dedupeTimelineHistory(history: HistoryLike[]): HistoryLike[] {
  const seen = new Set<string>();
  return [...history]
    .sort((a, b) => historyTime(a) - historyTime(b))
    .filter((item) => {
      const event = metadataEvent(item) || item.title || "unknown";
      const text = normalizeText(getConversationText(item));
      if (!text) return true;
      const fingerprint = `${event}:${text}`;
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
}

function hasAny(text: string, patterns: string[]): boolean {
  const normalized = normalizeText(text);
  return patterns.some((pattern) => normalized.includes(normalizeText(pattern)));
}

function hasScheduleConfirmationEvent(history: HistoryLike[]): boolean {
  return history.some((item) => {
    const event = metadataEvent(item);
    const text = normalizeText(getConversationText(item));
    return (
      event === "lead_closed_with_schedule" ||
      event === "lead_schedule_confirmed" ||
      text.includes("agendamento confirmado") ||
      text.includes("reserva confirmada")
    );
  });
}

function hasCustomerAfterAssistant(history: HistoryLike[]): boolean {
  let assistantSeen = false;
  for (const item of history) {
    const event = metadataEvent(item);
    if (event === "commercial_reply_sent") assistantSeen = true;
    if (assistantSeen && event === "customer_message_received") return true;
  }
  return false;
}

function buildEvidenceLabel(label: string, evidence: boolean): string | undefined {
  return evidence ? label : undefined;
}

function getLikelySubregionQuestion(customerText: string): string {
  if (hasAny(customerText, ["gluteo", "gluteos", "bumbum"])) {
    return "As estrias ficam em um lado, nos dois gluteos ou mais na lateral/proximo ao quadril?";
  }

  if (hasAny(customerText, ["barriga", "abdomen", "abdominal"])) {
    return "Na barriga, suas estrias ficam mais acima do umbigo, abaixo do umbigo ou nas duas partes?";
  }

  return "Me explica um pouco melhor em qual parte dessa regiao ficam as estrias?";
}

function buildNextQuestion(key: QualificationTimelineCheckpointKey, customerText: string): string {
  switch (key) {
    case "funcionamento":
      return "Posso te explicar rapidinho como funciona o tratamento com microagulhamento para estrias.";
    case "valor":
      return "Sobre valores, atualmente 1 regiao fica R$ 377,00. Quando a regiao e bilateral, os dois lados ja entram nessa regiao. Abdomen total fica R$ 550,00, incluindo superior + inferior.";
    case "regiao":
      return "Para eu te orientar melhor, qual regiao do corpo voce gostaria de tratar?\nExemplo: barriga, flancos, gluteos, coxas, seios ou outra regiao.";
    case "subregiao":
      return getLikelySubregionQuestion(customerText);
    case "unidade":
      return "Qual unidade fica melhor para voce: Paulista/Paraiso, Tatuape ou Mairipora?";
    case "agenda":
      return "Voce prefere atendimento durante a semana ou sabado? E tem algum periodo melhor: manha ou tarde?";
    case "sinal":
      return "Esse horario funciona para voce? Se quiser garantir, posso te passar as informacoes da reserva.";
    case "confirmacao":
      return "Me envia o comprovante por aqui para confirmarmos sua reserva no sistema.";
    case "entrada":
    default:
      return "Me chama por aqui que eu te ajudo a ver a melhor opcao para o seu atendimento.";
  }
}

function buildReturnSuggestion(): QualificationNextSuggestion {
  return {
    key: "retorno",
    label: "Retorno programado",
    message:
      "Sem problema. Quando quiser retomar, me chama por aqui que eu te ajudo a ver a melhor opcao para o seu atendimento.",
  };
}

function chooseNextBestKey(args: {
  done: Partial<Record<QualificationTimelineCheckpointKey, boolean>>;
  touched: Partial<Record<QualificationTimelineCheckpointKey, boolean>>;
}): QualificationTimelineCheckpointKey | undefined {
  const { done } = args;

  if (!done.regiao) return "regiao";
  if (!done.subregiao) return "subregiao";
  if (!done.unidade) return "unidade";
  if (!done.agenda) return "agenda";
  if (done.unidade && done.agenda && !done.sinal) return "sinal";
  if (done.sinal && !done.confirmacao) return "confirmacao";
  return undefined;
}

export function getQualificationTimelineStateForAI(args: {
  lead?: LeadLike | null;
  recentHistory?: HistoryLike[];
  currentMessage?: string | null;
  journeyState?: QualificationJourneyState | null;
}): QualificationTimelineStateForAI {
  const lead = args.lead ?? null;
  const history = dedupeTimelineHistory(args.recentHistory ?? []);
  const currentMessage = args.currentMessage ?? "";

  const customerText = [
    ...history.map(getCustomerMessageText),
    currentMessage,
  ]
    .filter(Boolean)
    .join(" ");

  const assistantText = history.map(getAssistantReplyText).filter(Boolean).join(" ");
  const conversationText = history.map(getConversationText).filter(Boolean).join(" ");
  const fullText = [conversationText, currentMessage].filter(Boolean).join(" ");

  const hasConfirmedSchedule =
    hasScheduleConfirmationEvent(history) || normalizeText(lead?.funil_etapa ?? lead?.status ?? "").includes("cliente");

  const done: Partial<Record<QualificationTimelineCheckpointKey, boolean>> = {
    entrada: Boolean(lead) || history.length > 0,
    funcionamento: hasAny([customerText, assistantText].join(" "), FUNCTIONING_PATTERNS),
    valor: hasAny(assistantText, VALUE_DONE_PATTERNS) || hasAny(conversationText, VALUE_DONE_PATTERNS),
    regiao: hasAny(customerText, BODY_REGION_PATTERNS),
    subregiao: hasAny(customerText, SUBREGION_PATTERNS),
    unidade: hasAny(customerText, UNIT_PATTERNS) || hasAny(assistantText, ["rua manoel", "brigadeiro", "unidade paulista", "unidade tatuape", "unidade mairipora"]),
    agenda: hasAny(conversationText, AGENDA_DONE_PATTERNS) || hasConfirmedSchedule,
    sinal: hasAny(conversationText, SIGNAL_PATTERNS),
    confirmacao: hasConfirmedSchedule,
  };

  const touched: Partial<Record<QualificationTimelineCheckpointKey, boolean>> = {
    valor: !done.valor && hasAny([customerText, assistantText].join(" "), VALUE_TOUCHED_PATTERNS),
    agenda: !done.agenda && hasAny([customerText, assistantText].join(" "), AGENDA_TOUCHED_PATTERNS),
  };

  const hasReturnIntent = hasAny(customerText, RETORNO_PATTERNS);
  const nextBestKey = hasReturnIntent ? undefined : chooseNextBestKey({ done, touched });
  const nextBestLabel = nextBestKey ? NEXT_STEP_LABELS[nextBestKey] : hasReturnIntent ? "Retorno programado" : undefined;
  const nextBestQuestion = nextBestKey ? buildNextQuestion(nextBestKey, customerText) : hasReturnIntent ? buildReturnSuggestion().message : undefined;
  const nextSuggestion = hasReturnIntent
    ? buildReturnSuggestion()
    : nextBestKey && nextBestLabel && nextBestQuestion
      ? {
          key: nextBestKey,
          label: nextBestLabel,
          message: nextBestQuestion,
        }
      : undefined;

  const checkpoints = TIMELINE_CHECKPOINTS.map((checkpoint): QualificationTimelineCheckpoint => {
    const key = checkpoint.key;
    const status: QualificationTimelineCheckpointStatus = done[key]
      ? "done"
      : touched[key]
        ? "touched"
        : key === nextBestKey
          ? "current"
          : "pending";

    const evidence =
      buildEvidenceLabel("lead/historico existente", key === "entrada" && Boolean(done[key])) ??
      buildEvidenceLabel("explicacao do tratamento na conversa", key === "funcionamento" && Boolean(done[key])) ??
      buildEvidenceLabel("valor real comunicado", key === "valor" && Boolean(done[key])) ??
      buildEvidenceLabel("cliente informou regiao corporal", key === "regiao" && Boolean(done[key])) ??
      buildEvidenceLabel("cliente detalhou sub-regiao", key === "subregiao" && Boolean(done[key])) ??
      buildEvidenceLabel("unidade mencionada/escolhida", key === "unidade" && Boolean(done[key])) ??
      buildEvidenceLabel("conversa operacional sobre agenda", key === "agenda" && Boolean(done[key])) ??
      buildEvidenceLabel("sinal/reserva/comprovante mencionado", key === "sinal" && Boolean(done[key])) ??
      buildEvidenceLabel("agendamento confirmado", key === "confirmacao" && Boolean(done[key])) ??
      buildEvidenceLabel("assunto tocado sem confirmacao completa", Boolean(touched[key]));

    return {
      ...checkpoint,
      status,
      evidence,
    };
  });

  const doneKeys = checkpoints.filter((item) => item.status === "done").map((item) => item.key);
  const pendingKeys = checkpoints.filter((item) => item.status === "pending").map((item) => item.key);
  const touchedKeys = checkpoints.filter((item) => item.status === "touched").map((item) => item.key);
  const currentKey = checkpoints.find((item) => item.status === "current")?.key;

  const summaryForAI = [
    `Concluidos: ${doneKeys.join(", ") || "nenhum"}.`,
    `Pendentes: ${pendingKeys.join(", ") || "nenhum"}.`,
    `Tocados fora de ordem/parciais: ${touchedKeys.join(", ") || "nenhum"}.`,
    currentKey ? `Atual: ${currentKey}.` : "",
    nextBestKey ? `Proximo passo: ${nextBestKey} - ${nextBestLabel}.` : nextBestLabel ? `Proximo passo: ${nextBestLabel}.` : "",
    nextBestQuestion ? `Pergunta sugerida: ${nextBestQuestion}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    checkpoints,
    doneKeys,
    pendingKeys,
    touchedKeys,
    currentKey,
    nextBestKey,
    nextBestLabel,
    nextBestQuestion,
    nextSuggestion,
    summaryForAI,
  };
}

function getNextCheckpoint(current: QualificationCheckpoint): QualificationCheckpoint | null {
  const index = CHECKPOINT_ORDER.indexOf(current);
  if (index < 0 || index >= CHECKPOINT_ORDER.length - 1) return null;
  return CHECKPOINT_ORDER[index + 1];
}

function buildJourneyGuidance(current: QualificationCheckpoint, pendingQuestion: string | null): string {
  if (pendingQuestion) return pendingQuestion;

  switch (current) {
    case "novo_contato":
      return "Aguardar resposta da cliente antes de avancar a qualificacao.";
    case "cliente_respondeu_abordagem":
      return "Cliente respondeu. Se ainda estiver em prospeccao, pode qualificar para iniciar o atendimento.";
    case "agendamento_confirmado":
      return "Atendimento com agendamento confirmado. Manter acompanhamento normal.";
    default:
      return "Continuar a conversa pelo proximo checkpoint pendente.";
  }
}

export function getQualificationJourneyState(args: {
  lead?: LeadLike | null;
  recentHistory?: HistoryLike[];
  currentMessage?: string | null;
}): QualificationJourneyState {
  const lead = args.lead ?? null;
  const history = dedupeTimelineHistory(args.recentHistory ?? []);
  const currentMessage = args.currentMessage ?? "";
  const timeline = getQualificationTimelineStateForAI({
    lead,
    recentHistory: history,
    currentMessage,
  });

  const hasRegion = timeline.doneKeys.includes("regiao");
  const hasSubregion = timeline.doneKeys.includes("subregiao");
  const hasUnit = timeline.doneKeys.includes("unidade");
  const hasAvailability = timeline.doneKeys.includes("agenda");
  const hasPaymentSignal = timeline.doneKeys.includes("sinal");
  const hasConfirmedSchedule = timeline.doneKeys.includes("confirmacao");
  const leadFunnel = normalizeText(lead?.funnel ?? lead?.funil_etapa ?? "");
  const shouldQualifyLead = hasCustomerAfterAssistant(history) && leadFunnel.includes("prospeccao");

  let currentCheckpoint: QualificationCheckpoint = "novo_contato";
  if (hasConfirmedSchedule) {
    currentCheckpoint = "agendamento_confirmado";
  } else if (hasPaymentSignal) {
    currentCheckpoint = "aguardando_sinal";
  } else if (hasAvailability) {
    currentCheckpoint = "aguardando_sinal";
  } else if (hasUnit) {
    currentCheckpoint = "aguardando_disponibilidade";
  } else if (hasSubregion) {
    currentCheckpoint = "aguardando_unidade";
  } else if (hasRegion) {
    currentCheckpoint = "aguardando_subregiao";
  } else if (shouldQualifyLead || history.some((item) => metadataEvent(item) === "customer_message_received")) {
    currentCheckpoint = "cliente_respondeu_abordagem";
  }

  const nextCheckpoint = getNextCheckpoint(currentCheckpoint);
  const pendingQuestion = timeline.nextBestQuestion ?? null;

  return {
    currentCheckpoint,
    nextCheckpoint,
    currentLabel: getCheckpointLabel(currentCheckpoint),
    nextLabel: getNextCheckpointLabel(nextCheckpoint),
    pendingQuestion,
    guidance: buildJourneyGuidance(currentCheckpoint, pendingQuestion),
    shouldQualifyLead,
    shouldSuggestQualification: shouldQualifyLead,
    knownFields: {
      hasRegion,
      hasSubregion,
      hasUnit,
      hasAvailability,
      hasPaymentSignal,
      hasConfirmedSchedule,
    },
  };
}
