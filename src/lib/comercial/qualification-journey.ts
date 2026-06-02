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

export type BodyRegionKey =
  | "abdomen"
  | "flancos"
  | "gluteos"
  | "coxas"
  | "seios"
  | "bracos"
  | "costas"
  | "ombros"
  | "peitoral"
  | "pernas"
  | "quadril"
  | "panturrilha"
  | "unknown";

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
  detectedRegions?: BodyRegionKey[];
  detectedRegionLabels?: string[];
  detectedSubregions?: string[];
  regionSummaryForAI?: string;
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
  "ombro",
  "ombros",
  "peitoral",
  "peito",
  "lateral do corpo",
  "interno de coxa",
  "externo de coxa",
];

const SUBREGION_PATTERNS = [
  "acima do umbigo",
  "abaixo do umbigo",
  "mais embaixo",
  "embaixo",
  "parte de baixo",
  "um pouco acima",
  "um pouco em cima",
  "acima",
  "abaixo",
  "nas duas partes",
  "duas partes",
  "superior",
  "inferior",
  "parte interna",
  "interna",
  "parte externa",
  "externa",
  "lateral",
  "proximo ao ombro",
  "perto do ombro",
  "perto do quadril",
  "proximo ao quadril",
  "um lado",
  "dois lados",
  "dos dois lados",
  "nos dois gluteos",
  "lado direito",
  "lado esquerdo",
  "frente",
  "frente da coxa",
  "atrás",
  "atras",
  "atras da coxa",
  "um ombro",
  "dois ombros",
  "dois lados do ombro",
  "peitoral dos dois lados",
];

const BODY_REGION_LABELS: Record<BodyRegionKey, string> = {
  abdomen: "abdomen/barriga",
  flancos: "flancos",
  gluteos: "gluteos/bumbum",
  coxas: "coxas",
  seios: "seios",
  bracos: "bracos",
  costas: "costas",
  ombros: "ombros",
  peitoral: "peitoral",
  pernas: "pernas",
  quadril: "quadril",
  panturrilha: "panturrilha",
  unknown: "outra regiao",
};

const BODY_REGION_SYNONYMS: Array<{
  key: BodyRegionKey;
  terms: string[];
}> = [
  { key: "abdomen", terms: ["barriga", "abdomen", "abdominal"] },
  { key: "flancos", terms: ["flanco", "flancos"] },
  { key: "gluteos", terms: ["gluteo", "gluteos", "bumbum"] },
  { key: "coxas", terms: ["coxa", "coxas"] },
  { key: "seios", terms: ["seio", "seios"] },
  { key: "bracos", terms: ["braco", "bracos"] },
  { key: "costas", terms: ["costas"] },
  { key: "ombros", terms: ["ombro", "ombros"] },
  { key: "peitoral", terms: ["peitoral", "peito"] },
  { key: "pernas", terms: ["perna", "pernas"] },
  { key: "quadril", terms: ["quadril"] },
  { key: "panturrilha", terms: ["panturrilha", "panturrilhas"] },
];

const SUBREGION_SYNONYMS: Array<{
  label: string;
  terms: string[];
}> = [
  {
    label: "acima/superior",
    terms: [
      "acima do umbigo",
      "um pouco acima",
      "um pouco em cima",
      "acima",
      "superior",
    ],
  },
  {
    label: "abaixo/inferior",
    terms: [
      "abaixo do umbigo",
      "mais embaixo",
      "embaixo",
      "parte de baixo",
      "abaixo",
      "inferior",
    ],
  },
  { label: "duas partes", terms: ["nas duas partes", "duas partes"] },
  { label: "parte interna", terms: ["parte interna", "interna", "interno de coxa"] },
  { label: "parte externa", terms: ["parte externa", "externa", "externo de coxa"] },
  { label: "lateral", terms: ["lateral", "perto do quadril", "proximo ao quadril"] },
  { label: "frente", terms: ["frente", "frente da coxa"] },
  { label: "atras", terms: ["atras", "atrás", "atras da coxa"] },
  { label: "proximo ao ombro", terms: ["proximo ao ombro", "perto do ombro"] },
  {
    label: "um lado",
    terms: ["um lado", "lado direito", "lado esquerdo", "um ombro"],
  },
  {
    label: "dois lados",
    terms: [
      "dois lados",
      "dos dois lados",
      "nos dois gluteos",
      "dois ombros",
      "dois lados do ombro",
      "peitoral dos dois lados",
    ],
  },
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
  "agendamento confirmado",
  "avaliacao marcada",
  "avaliação marcada",
  "consulta marcada",
  "confirmar horario",
  "confirmar horário",
  "horario confirmado",
  "horário confirmado",
  "esse horario funciona",
  "esse horário funciona",
  "horarios disponiveis",
  "horários disponíveis",
  "atendemos normalmente",
  "tenho disponibilidade",
  "temos disponibilidade",
  "agenda disponivel",
  "agenda disponível",
  "opcao para avaliacao",
  "opção para avaliação",
  "opcoes para avaliacao",
  "opções para avaliação",
  "segunda",
  "terca",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "sábado",
  "domingo",
  "as 9",
  "às 9",
  "das 9",
  "as 10",
  "às 10",
  "das 10",
  "as 11",
  "às 11",
  "das 11",
  "as 12",
  "às 12",
  "das 12",
  "as 13",
  "às 13",
  "das 13",
  "as 14",
  "às 14",
  "das 14",
  "as 15",
  "às 15",
  "das 15",
  "as 16",
  "às 16",
  "das 16",
  "as 17",
  "às 17",
  "das 17",
  "as 18",
  "às 18",
  "das 18",
  "dia 20",
  "dia 27",
  "pode ser tal dia",
];

const AGENDA_TOUCHED_PATTERNS = [
  "vou agendar",
  "agendo depois",
  "quero marcar",
  "quero agendar",
  "marcar avaliacao",
  "marcar avaliação",
  "agendar avaliacao",
  "agendar avaliação",
  "quando eu puder",
  "horarios corridos",
  "horários corridos",
  "em breve",
  "em breve vejo",
  "ver agenda",
  "verificar agenda",
  "tem horario",
  "tem horário",
  "tem disponibilidade",
  "disponibilidade",
  "qual dia posso fazer avaliacao",
  "qual dia posso fazer avaliação",
  "posso fazer avaliacao",
  "posso fazer avaliação",
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

function extractUsefulWhatsAppText(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) =>
      line.replace(
        /^\s*\[[^\]]+\]\s*[^:]{1,80}:\s*/u,
        ""
      )
    )
    .join("\n")
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

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function detectBodyRegions(text: string): BodyRegionKey[] {
  const normalized = normalizeText(text);
  const regions = BODY_REGION_SYNONYMS.flatMap(({ key, terms }) =>
    terms.some((term) => normalized.includes(normalizeText(term))) ? [key] : []
  );

  return uniqueValues(regions);
}

export function detectSubregions(text: string): string[] {
  const normalized = normalizeText(text);
  const subregions = SUBREGION_SYNONYMS.flatMap(({ label, terms }) =>
    terms.some((term) => normalized.includes(normalizeText(term))) ? [label] : []
  );

  return uniqueValues(subregions);
}

function getRegionLabels(regions: BodyRegionKey[]): string[] {
  return regions.map((region) => BODY_REGION_LABELS[region] ?? region);
}

function buildRegionSummaryForAI(regions: BodyRegionKey[], subregions: string[]) {
  const labels = getRegionLabels(regions);
  const parts = [
    labels.length ? `Regioes detectadas: ${labels.join(", ")}.` : "",
    subregions.length ? `Sub-regioes detectadas: ${subregions.join(", ")}.` : "",
  ];

  if (regions.includes("ombros") && regions.includes("peitoral")) {
    parts.push(
      "Ombros e peitoral apareceram juntos; peitoral normalmente e outra regiao, mas a confirmacao final e presencial."
    );
  }

  return parts.filter(Boolean).join(" ");
}

function getRegionListText(regions: BodyRegionKey[]): string {
  const labels = getRegionLabels(regions).map((label) =>
    label
      .replace("abdomen/barriga", "barriga")
      .replace("gluteos/bumbum", "gluteos")
  );

  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;

  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
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

function hasAgendaPeriodContext(text: string): boolean {
  return hasAny(text, [
    "prefere manha",
    "prefere a manha",
    "prefere tarde",
    "prefere a tarde",
    "prefiro manha",
    "prefiro a manha",
    "prefiro tarde",
    "prefiro a tarde",
    "pode ser de manha",
    "pode ser a tarde",
    "pode ser na parte da tarde",
    "periodo melhor manha",
    "periodo melhor tarde",
    "periodo de manha",
    "periodo da manha",
    "periodo a tarde",
    "periodo da tarde",
    "de manha ou a tarde",
    "manha ou tarde",
    "horario de manha",
    "horario da manha",
    "horario a tarde",
    "horario da tarde",
    "atendimento de manha",
    "atendimento pela manha",
    "atendimento a tarde",
    "atendimento na parte da tarde",
    "quarta de manha",
    "quarta a tarde",
    "sexta de manha",
    "sexta a tarde",
    "sabado de manha",
    "sabado a tarde",
    "sábado de manhã",
    "sábado à tarde",
  ]);
}

function hasStrongAgendaEvidence(text: string): boolean {
  const normalized = normalizeText(text);
  const legacyConfirmationPatterns = AGENDA_DONE_PATTERNS.filter((pattern) => {
    const normalizedPattern = normalizeText(pattern);
    return (
      normalizedPattern.includes("confirm") ||
      normalizedPattern.includes("marcada") ||
      normalizedPattern.includes("consulta marcada") ||
      normalizedPattern.includes("esse horario funciona")
    );
  });
  const hasConfirmedAgendaText = hasAny(text, legacyConfirmationPatterns);
  const choseKnownDay =
    /\b(segunda|quarta|sexta)\b/.test(normalized);
  const choseSpecificHour =
    /\b(as|das)\s*(9|10|11|12|13|14|15|16|17|18)\b/.test(normalized) ||
    /\b(9|10|11|12|13|14|15|16|17|18)\s*h\b/.test(normalized) ||
    /\bpode ser\s+(9|10|11|12|13|14|15|16|17|18)\b/.test(normalized);
  const choseCalendarDay = /\bdia\s+\d{1,2}\b/.test(normalized);

  return hasConfirmedAgendaText || choseKnownDay || choseSpecificHour || choseCalendarDay;
}

function hasPartialAgendaPreference(text: string): boolean {
  const normalized = normalizeText(text);
  return (
    hasAny(text, AGENDA_TOUCHED_PATTERNS) ||
    hasAgendaPeriodContext(text) ||
    /\b(semana|durante a semana|dia de semana)\b/.test(normalized) ||
    /\b(manha|tarde|periodo da manha|periodo da tarde)\b/.test(normalized) ||
    /\b(sabado)\b/.test(normalized)
  );
}

function getLikelySubregionQuestion(
  customerText: string,
  detectedRegions: BodyRegionKey[] = detectBodyRegions(customerText)
): string {
  const relevantRegions = detectedRegions.filter((region) => region !== "unknown");

  if (relevantRegions.length > 2) {
    return `Voce comentou ${getRegionListText(relevantRegions)}. Qual dessas regioes te incomoda mais ou por qual voce gostaria de comecar?`;
  }

  if (relevantRegions.includes("bracos") && relevantRegions.includes("costas")) {
    return "So para eu organizar melhor: nos bracos, as estrias ficam mais na parte interna, proxima ao ombro ou em outra area?\n\nE nas costas, ficam mais na parte superior, inferior ou nas laterais?";
  }

  if (relevantRegions.includes("ombros") && relevantRegions.includes("peitoral")) {
    return "Peitoral normalmente pode entrar como outra regiao, mas a confirmacao certinha e presencial com a especialista, porque ela avalia a extensao e como as estrias estao distribuidas.\n\nSo para eu organizar melhor: os ombros sao dos dois lados? E no peitoral aparece de um lado so ou dos dois?";
  }

  if (relevantRegions.includes("abdomen") && relevantRegions.includes("gluteos")) {
    return "So para eu organizar melhor: na barriga, fica mais acima do umbigo, abaixo ou nas duas partes?\n\nE nos gluteos, fica em um lado, nos dois ou mais na lateral/proximo ao quadril?";
  }

  if (relevantRegions.includes("coxas") && relevantRegions.includes("gluteos")) {
    return "So para eu organizar melhor: nas coxas, fica mais na parte interna, externa, frente ou atras?\n\nE nos gluteos, fica em um lado, nos dois ou mais na lateral/proximo ao quadril?";
  }

  if (detectedRegions.includes("coxas")) {
    return "As estrias ficam mais na parte interna, externa, na frente ou atras das coxas?";
  }

  if (detectedRegions.includes("ombros")) {
    return "Fica em um ombro so ou nos dois? E pega so ombro ou tambem peitoral, costas ou braco?";
  }

  if (detectedRegions.includes("peitoral")) {
    return "No peitoral aparece de um lado so ou dos dois lados?";
  }

  if (detectedRegions.includes("gluteos")) {
    return "As estrias ficam em um lado, nos dois gluteos ou mais na lateral/proximo ao quadril?";
  }

  if (detectedRegions.includes("bracos")) {
    return "As estrias ficam mais na parte interna do braco, proxima ao ombro ou em outra area?";
  }

  if (detectedRegions.includes("flancos")) {
    return "Fica em um lado so ou nos dois flancos?";
  }

  if (detectedRegions.includes("costas")) {
    return "Nas costas, fica mais na parte superior, inferior ou mais nas laterais?";
  }

  if (detectedRegions.includes("seios")) {
    return "Nos seios, fica em um lado so ou nos dois?";
  }

  if (detectedRegions.includes("abdomen")) {
    return "Na barriga, suas estrias ficam mais acima do umbigo, abaixo do umbigo ou nas duas partes?";
  }

  return "Me explica um pouco melhor em qual parte dessa regiao ficam as estrias?";
}

function buildAgendaQuestion(text: string): string {
  const normalized = normalizeText(text);
  const mentionsTatuape = normalized.includes("tatuape");
  const mentionsPaulista =
    normalized.includes("paulista") ||
    normalized.includes("paraiso") ||
    normalized.includes("brigadeiro");
  const mentionsMairipora = normalized.includes("mairipora");
  const mentionsMorning = /\b(manha|periodo da manha|de manha)\b/.test(normalized);
  const mentionsAfternoon = /\b(tarde|periodo da tarde|a tarde)\b/.test(normalized);
  const mentionsSaturday = /\b(sabado)\b/.test(normalized);

  if (mentionsSaturday) {
    return "Para sabado, preciso verificar manualmente quais horarios e unidades estao disponiveis antes de te passar certinho.";
  }

  if (mentionsTatuape && mentionsAfternoon) {
    return "Para Tatuape no periodo da tarde, temos atendimento as quartas e sextas, das 15h as 18h. Voces preferem quarta ou sexta a tarde?";
  }

  if (mentionsPaulista && mentionsMorning) {
    return "Para Paulista no periodo da manha, temos atendimento as quartas e sextas, das 09h as 12h. Voces preferem quarta ou sexta de manha?";
  }

  if (mentionsMairipora) {
    return "Em Mairipora, o atendimento acontece as segundas. Voces tem preferencia por algum horario para eu verificar?";
  }

  return "Voce prefere atendimento durante a semana ou sabado? E tem algum periodo melhor: manha ou tarde?";
}

function hasDirectPriceQuestion(text: string): boolean {
  const normalized = normalizeText(text);
  return (
    hasAny(text, [
      "qual valor",
      "quanto custa",
      "valores",
      "preco",
      "precos",
      "quanto fica",
      "valor da sessao",
      "tem pacote",
    ]) ||
    /\b(r\$|valor|preco|precos|custa|fica)\b/.test(normalized)
  );
}

function hasValueExplanationConsent(contextText: string, customerText: string): boolean {
  const normalizedContext = normalizeText(contextText);
  const normalizedCustomer = normalizeText(extractUsefulWhatsAppText(customerText));
  const previousBridge =
    normalizedContext.includes("explicar rapidinho como funcionam os valores") ||
    normalizedContext.includes("posso te explicar como funcionam os valores") ||
    normalizedContext.includes("valores e a divisao das regioes") ||
    normalizedContext.includes("antes de avancarmos para reserva") ||
    normalizedContext.includes("antes de avancarmos para a reserva");
  const consent =
    /\b(sim|pode|claro|ok|quero|explica|explicar|favor|favot|manda|passar|fala)\b/.test(
      normalizedCustomer
    ) ||
    normalizedCustomer.includes("me explica") ||
    normalizedCustomer.includes("pode explicar") ||
    normalizedCustomer.includes("pode me explicar") ||
    normalizedCustomer.includes("por favor") ||
    normalizedCustomer.includes("me fala") ||
    normalizedCustomer.includes("pode passar");

  return previousBridge && consent;
}

function buildAgendaIntro(text: string): string {
  const normalized = normalizeText(text);

  if (normalized.includes("tatuape") && /\b(tarde|periodo da tarde|a tarde)\b/.test(normalized)) {
    return "Para Tatuape no periodo da tarde, temos atendimento as quartas e sextas, das 15h as 18h.";
  }

  if (
    (normalized.includes("paulista") ||
      normalized.includes("paraiso") ||
      normalized.includes("brigadeiro")) &&
    /\b(manha|periodo da manha|de manha)\b/.test(normalized)
  ) {
    return "Para Paulista no periodo da manha, temos atendimento as quartas e sextas, das 09h as 12h.";
  }

  if (normalized.includes("mairipora")) {
    return "Em Mairipora, o atendimento acontece as segundas.";
  }

  if (/\b(sabado)\b/.test(normalized)) {
    return "Para sabado, preciso verificar manualmente quais horarios e unidades estao disponiveis antes de te passar certinho.";
  }

  return "";
}

function buildAgendaChoiceQuestion(text: string): string {
  const normalized = normalizeText(text);

  if (normalized.includes("tatuape") && /\b(tarde|periodo da tarde|a tarde)\b/.test(normalized)) {
    return "Voces preferem quarta ou sexta a tarde?";
  }

  if (
    (normalized.includes("paulista") ||
      normalized.includes("paraiso") ||
      normalized.includes("brigadeiro")) &&
    /\b(manha|periodo da manha|de manha)\b/.test(normalized)
  ) {
    return "Voces preferem quarta ou sexta de manha?";
  }

  if (normalized.includes("mairipora")) {
    return "Voces tem preferencia por algum horario para eu verificar?";
  }

  return "";
}

function buildValueQuestion(contextText: string, customerText: string): string {
  const hasAgendaPreference = hasPartialAgendaPreference(contextText);
  const directPriceQuestion = hasDirectPriceQuestion(customerText);
  const consentToExplainValues = hasValueExplanationConsent(
    contextText,
    customerText
  );
  const agendaIntro = buildAgendaIntro(contextText);
  const agendaChoiceQuestion = buildAgendaChoiceQuestion(contextText);
  const bridgeText =
    "Antes de avancarmos para reserva, posso te explicar rapidinho como funcionam os valores e a divisao das regioes? Assim voces ja ficam com tudo claro antes de escolher o melhor dia.";
  const valueText =
    "Hoje, 1 regiao fica R$ 377,00. Quando a regiao e bilateral, os dois lados entram nessa mesma regiao.\n\nPor exemplo: bracos, ombros, peitoral, coxas ou gluteos, quando tratados como uma regiao bilateral, ja consideram os dois lados.\n\nNo abdomen:\n\n* Abdomen superior: R$ 377,00\n* Abdomen inferior: R$ 377,00\n* Abdomen total, superior + inferior: R$ 550,00.\n\nSe houver laterais/flancos junto, pode envolver outra regiao, mas a especialista confirma certinho presencialmente conforme a extensao e distribuicao das estrias.";

  if (hasAgendaPreference && !directPriceQuestion && !consentToExplainValues) {
    return [agendaIntro, bridgeText].filter(Boolean).join("\n\n");
  }

  if (directPriceQuestion || consentToExplainValues) {
    return [valueText, agendaChoiceQuestion].filter(Boolean).join("\n\n");
  }

  return "Sobre valores, atualmente 1 regiao fica R$ 377,00. Quando a regiao e bilateral, os dois lados ja entram nessa regiao. Abdomen total fica R$ 550,00, incluindo superior + inferior.";
}

function buildNextQuestion(
  key: QualificationTimelineCheckpointKey,
  customerText: string,
  detectedRegions: BodyRegionKey[] = detectBodyRegions(customerText),
  contextText = customerText
): string {
  switch (key) {
    case "funcionamento":
      return "Posso te explicar rapidinho como funciona o tratamento com microagulhamento para estrias.";
    case "valor":
      return buildValueQuestion(contextText, customerText);
    case "regiao":
      return "Para eu te orientar melhor, qual regiao do corpo voce gostaria de tratar?\nExemplo: barriga, flancos, gluteos, coxas, seios ou outra regiao.";
    case "subregiao":
      return getLikelySubregionQuestion(customerText, detectedRegions);
    case "unidade":
      return "Qual unidade fica melhor para voce: Paulista/Paraiso, Tatuape ou Mairipora?";
    case "agenda":
      return buildAgendaQuestion(contextText);
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
  if (!done.valor) return "valor";
  if (!done.unidade) return "unidade";
  if (!done.agenda) return "agenda";
  if (done.valor && done.unidade && done.agenda && !done.sinal) return "sinal";
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
  const detectedRegions = detectBodyRegions(customerText);
  const detectedRegionLabels = getRegionLabels(detectedRegions);
  const detectedSubregions = detectSubregions(customerText);
  const regionSummaryForAI = buildRegionSummaryForAI(
    detectedRegions,
    detectedSubregions
  );

  const hasConfirmedSchedule =
    hasScheduleConfirmationEvent(history) || normalizeText(lead?.funil_etapa ?? lead?.status ?? "").includes("cliente");

  const done: Partial<Record<QualificationTimelineCheckpointKey, boolean>> = {
    entrada: Boolean(lead) || history.length > 0,
    funcionamento: hasAny([customerText, assistantText].join(" "), FUNCTIONING_PATTERNS),
    valor: hasAny(assistantText, VALUE_DONE_PATTERNS) || hasAny(conversationText, VALUE_DONE_PATTERNS),
    regiao: detectedRegions.length > 0,
    subregiao: detectedSubregions.length > 0,
    unidade: hasAny(customerText, UNIT_PATTERNS) || hasAny(assistantText, ["rua manoel", "brigadeiro", "unidade paulista", "unidade tatuape", "unidade mairipora"]),
    agenda: hasStrongAgendaEvidence(customerText) || hasConfirmedSchedule,
    sinal: hasAny(conversationText, SIGNAL_PATTERNS),
    confirmacao: hasConfirmedSchedule,
  };

  const touched: Partial<Record<QualificationTimelineCheckpointKey, boolean>> = {
    valor: !done.valor && hasAny([customerText, assistantText].join(" "), VALUE_TOUCHED_PATTERNS),
    agenda: !done.agenda && hasPartialAgendaPreference(fullText),
  };

  const hasReturnIntent = hasAny(customerText, RETORNO_PATTERNS);
  const nextBestKey = hasReturnIntent ? undefined : chooseNextBestKey({ done, touched });
  const nextBestLabel = nextBestKey ? NEXT_STEP_LABELS[nextBestKey] : hasReturnIntent ? "Retorno programado" : undefined;
  const nextBestQuestion = nextBestKey ? buildNextQuestion(nextBestKey, customerText, detectedRegions, fullText) : hasReturnIntent ? buildReturnSuggestion().message : undefined;
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
    regionSummaryForAI,
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
    detectedRegions,
    detectedRegionLabels,
    detectedSubregions,
    regionSummaryForAI,
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
