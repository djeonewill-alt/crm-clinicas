import { NextResponse } from "next/server";
import { getSaoPauloGreeting } from "@/lib/comercial/time-greeting";

type AdaptApprovedResponseInput = {
  customerMessage?: string;
  approvedAnswerText?: string;
  approvedResponseTitle?: string | null;
  approvedResponseCategory?: string | null;
  primaryApprovedResponse?: PrimaryApprovedResponseInput | null;
  knowledgeCandidates?: KnowledgeCandidateInput[];
  useStrongModel?: boolean;
  contextName?: string | null;
  contextPriceNotes?: string | null;
  contextPaymentNotes?: string | null;
  contextScheduleNotes?: string | null;
  contextUnitsNotes?: string | null;
  contextSafetyNotes?: string | null;
  leadName?: string | null;
  leadFunnel?: string | null;
  leadJourneyStep?: string | null;
  requiresHuman?: boolean;
  canAutoReply?: boolean;
  recentHistory?: RecentHistoryInput[];
  conversationStage?: string | null;
  hasPriorConversation?: boolean;
  shouldAvoidGreeting?: boolean;
  shouldAvoidEmoji?: boolean;
  shouldOfferEvaluationNow?: boolean;
  journeyContext?: JourneyContextInput | null;
};

type KnowledgeCandidateInput = {
  id?: string | null;
  title?: string | null;
  categoryName?: string | null;
  answerText?: string | null;
  exampleQuestions?: string[];
  tags?: string[];
  score?: number | null;
  contextScope?: "current_context" | "global" | string | null;
  requiresHuman?: boolean;
  canAutoReply?: boolean;
};

type PrimaryApprovedResponseInput = {
  id?: string | null;
  title?: string | null;
  answerText?: string | null;
  categoryName?: string | null;
  contextScope?: "current_context" | "global" | string | null;
  requiresHuman?: boolean;
  canAutoReply?: boolean;
};

type RecentHistoryInput = {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

type JourneyContextInput = {
  currentCheckpoint?: string | null;
  currentLabel?: string | null;
  nextCheckpoint?: string | null;
  nextLabel?: string | null;
  pendingQuestion?: string | null;
  knownFields?: Record<string, unknown> | null;
  guidance?: string | null;
  timeline?: TimelineContextInput | null;
};

type TimelineContextInput = {
  checkpoints?: Array<{
    key?: string | null;
    label?: string | null;
    status?: string | null;
    evidence?: string | null;
  }>;
  doneKeys?: string[];
  pendingKeys?: string[];
  touchedKeys?: string[];
  currentKey?: string | null;
  nextBestKey?: string | null;
  nextBestLabel?: string | null;
  nextBestQuestion?: string | null;
  summaryForAI?: string | null;
  detectedRegions?: string[];
  detectedRegionLabels?: string[];
  detectedSubregions?: string[];
  regionSummaryForAI?: string | null;
};

type AdaptApprovedResponseOutput = {
  adaptedReply: string;
  confidence: number;
  requiresHumanReview: boolean;
  safetyNotes: string[];
  usedApprovedAnswerOnly: boolean;
  multiIntentHandled?: boolean;
  finalJourneyQuestion?: string;
  questionCount?: number;
  copiedPreviousReplyDetected?: boolean;
  usedKnowledgeAsFacts?: boolean;
};

const MAX_TEXT_LENGTH = 8000;
const DEFAULT_WHATSAPP_INTEREST_OPENING =
  "Olá! Tenho interesse e queria mais informações, por favor.";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT_LENGTH) : "";
}

function sanitizeOptionalText(value: unknown) {
  const text = sanitizeText(value);
  return text || null;
}

function sanitizeStringArray(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, limit)
    .map(sanitizeText)
    .filter(Boolean);
}

function sanitizeContextScope(value: unknown) {
  return value === "current_context" || value === "global" ? value : null;
}

function sanitizeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const safeMetadata: Record<string, unknown> = {};

  for (const key of ["event", "source", "callResult", "suggestedFunnel"]) {
    const item = record[key];
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      safeMetadata[key] = item;
    }
  }

  return Object.keys(safeMetadata).length ? safeMetadata : null;
}

function sanitizeRecentHistory(value: unknown): RecentHistoryInput[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 10).map((item) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};

    return {
      title: sanitizeOptionalText(record.title),
      description: sanitizeOptionalText(record.description),
      type: sanitizeOptionalText(record.type),
      createdAt: sanitizeOptionalText(record.createdAt),
      metadata: sanitizeMetadata(record.metadata),
    };
  });
}

function sanitizeJourneyKnownFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const record = value as Record<string, unknown>;
  const safeFields: Record<string, string | boolean | number> = {};

  for (const [key, item] of Object.entries(record).slice(0, 12)) {
    if (
      typeof item === "string" ||
      typeof item === "boolean" ||
      typeof item === "number"
    ) {
      safeFields[key.slice(0, 50)] =
        typeof item === "string" ? item.slice(0, 300) : item;
    }
  }

  return safeFields;
}

function sanitizeTimelineContext(value: unknown): TimelineContextInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const checkpoints = Array.isArray(record.checkpoints)
    ? record.checkpoints.slice(0, 12).map((item) => {
        const checkpoint =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};

        return {
          key: sanitizeOptionalText(checkpoint.key),
          label: sanitizeOptionalText(checkpoint.label),
          status: sanitizeOptionalText(checkpoint.status),
          evidence: sanitizeOptionalText(checkpoint.evidence),
        };
      })
    : [];

  return {
    checkpoints,
    doneKeys: sanitizeStringArray(record.doneKeys, 12),
    pendingKeys: sanitizeStringArray(record.pendingKeys, 12),
    touchedKeys: sanitizeStringArray(record.touchedKeys, 12),
    currentKey: sanitizeOptionalText(record.currentKey),
    nextBestKey: sanitizeOptionalText(record.nextBestKey),
    nextBestLabel: sanitizeOptionalText(record.nextBestLabel),
    nextBestQuestion: sanitizeOptionalText(record.nextBestQuestion),
    summaryForAI: sanitizeOptionalText(record.summaryForAI),
    detectedRegions: sanitizeStringArray(record.detectedRegions, 12),
    detectedRegionLabels: sanitizeStringArray(record.detectedRegionLabels, 12),
    detectedSubregions: sanitizeStringArray(record.detectedSubregions, 12),
    regionSummaryForAI: sanitizeOptionalText(record.regionSummaryForAI),
  };
}

function sanitizeJourneyContext(value: unknown): JourneyContextInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;

  return {
    currentCheckpoint: sanitizeOptionalText(record.currentCheckpoint),
    currentLabel: sanitizeOptionalText(record.currentLabel),
    nextCheckpoint: sanitizeOptionalText(record.nextCheckpoint),
    nextLabel: sanitizeOptionalText(record.nextLabel),
    pendingQuestion: sanitizeOptionalText(record.pendingQuestion),
    knownFields: sanitizeJourneyKnownFields(record.knownFields),
    guidance: sanitizeOptionalText(record.guidance),
    timeline: sanitizeTimelineContext(record.timeline),
  };
}

function sanitizeKnowledgeCandidates(value: unknown): KnowledgeCandidateInput[] {
  if (!Array.isArray(value)) return [];

  const candidates: KnowledgeCandidateInput[] = [];

  for (const item of value.slice(0, 5)) {
    const record =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    const answerText = sanitizeText(record.answerText).slice(0, 1800);

    if (!answerText) continue;

    candidates.push({
      id: sanitizeOptionalText(record.id),
      title: sanitizeOptionalText(record.title),
      categoryName: sanitizeOptionalText(record.categoryName),
      answerText,
      exampleQuestions: sanitizeStringArray(record.exampleQuestions),
      tags: sanitizeStringArray(record.tags, 10),
      score: sanitizeScore(record.score),
      contextScope: sanitizeContextScope(record.contextScope),
      requiresHuman: record.requiresHuman === true,
      canAutoReply: record.canAutoReply === true,
    });
  }

  return candidates;
}

function sanitizePrimaryApprovedResponse(
  value: unknown
): PrimaryApprovedResponseInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const answerText = sanitizeText(record.answerText).slice(0, 1800);

  if (!answerText) return null;

  return {
    id: sanitizeOptionalText(record.id),
    title: sanitizeOptionalText(record.title),
    answerText,
    categoryName: sanitizeOptionalText(record.categoryName),
    contextScope: sanitizeContextScope(record.contextScope),
    requiresHuman: record.requiresHuman === true,
    canAutoReply: record.canAutoReply === true,
  };
}

function clampConfidence(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return 0.75;
  if (numberValue < 0) return 0;
  if (numberValue > 1) return 1;
  return numberValue;
}

function normalizeOutput(value: unknown): AdaptApprovedResponseOutput | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const adaptedReply = sanitizeText(record.adaptedReply);

  if (!adaptedReply) return null;

  return {
    adaptedReply,
    confidence: clampConfidence(record.confidence),
    requiresHumanReview: record.requiresHumanReview === true,
    safetyNotes: Array.isArray(record.safetyNotes)
      ? record.safetyNotes.map(String).map((item) => item.trim()).filter(Boolean)
      : [],
    usedApprovedAnswerOnly: record.usedApprovedAnswerOnly !== false,
    multiIntentHandled: record.multiIntentHandled === true,
    finalJourneyQuestion: sanitizeText(record.finalJourneyQuestion),
    questionCount: Number.isFinite(Number(record.questionCount))
      ? Math.max(0, Math.floor(Number(record.questionCount)))
      : countQuestionMarks(adaptedReply),
    copiedPreviousReplyDetected: record.copiedPreviousReplyDetected === true,
    usedKnowledgeAsFacts: record.usedKnowledgeAsFacts === true,
  };
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeInterestMessage(value: string) {
  return normalizeSearchText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_INTEREST_MESSAGE_PATTERNS = [
  "ola tenho interesse e queria mais informacoes por favor",
  "ola tenho interesse e queria mais informacoes",
  "tenho interesse e queria mais informacoes por favor",
  "tenho interesse e queria mais informacoes",
];

function isDefaultWhatsAppInterestMessage(message: string): boolean {
  const normalized = normalizeInterestMessage(message);
  return DEFAULT_INTEREST_MESSAGE_PATTERNS.some(
    (pattern) => normalized === pattern || normalized.startsWith(`${pattern} `)
  );
}

function isPureDefaultWhatsAppInterestMessage(message: string): boolean {
  const normalized = normalizeInterestMessage(message);
  return DEFAULT_INTEREST_MESSAGE_PATTERNS.includes(normalized);
}

function buildDefaultWhatsAppOpening(timeGreeting: string) {
  return `${timeGreeting}, tudo bem? Meu nome é Djeone, faço parte do atendimento do consultório Sr. e Sra. Estrias.\n\nVou te passar as informações sim 😊\n\nNosso tratamento é para melhora do aspecto das estrias, feito com protocolo de microagulhamento e ativos, conforme avaliação da especialista. Não é laser, pintura ou camuflagem; é um tratamento regenerativo.\n\nPara eu te orientar melhor, qual região do corpo você gostaria de tratar?\nExemplo: barriga, flancos, glúteos, coxas, seios, braços ou outra região.`;
}

function defaultOpeningLooksLoose(value: string) {
  const text = normalizeInterestMessage(value);
  return (
    text.includes("o que voce quer saber primeiro") ||
    text.includes("como funciona o tratamento valores locais") ||
    text.includes("como funciona valores locais") ||
    text.includes("valores unidades e como agendar") ||
    text.includes("alguma duvida especifica sobre seu caso") ||
    text.includes("alguma duvida especifica sobre o seu caso")
  );
}

function hasJourneyFallbackEvidence(journeyContext: JourneyContextInput | null) {
  const timeline = journeyContext?.timeline;
  if (!timeline) return false;

  const checkpointKeys = new Set(["regiao", "subregiao", "unidade", "agenda"]);

  return (
    (timeline.detectedRegions?.length ?? 0) > 0 ||
    (timeline.detectedSubregions?.length ?? 0) > 0 ||
    (timeline.doneKeys ?? []).some((key) => checkpointKeys.has(key)) ||
    (timeline.touchedKeys ?? []).some((key) => checkpointKeys.has(key)) ||
    Boolean(timeline.nextBestKey && checkpointKeys.has(timeline.nextBestKey))
  );
}

function allowsMultiRegionQuestion(journeyContext: JourneyContextInput | null) {
  const timeline = journeyContext?.timeline;
  return (
    timeline?.nextBestKey === "subregiao" &&
    (timeline.detectedRegions?.length ?? 0) >= 2
  );
}

function hasPendingValue(journeyContext: JourneyContextInput | null) {
  const timeline = journeyContext?.timeline;
  if (!timeline) return false;
  return !(timeline.doneKeys ?? []).includes("valor");
}

function replyPushesReservation(value: string) {
  const text = normalizeInterestMessage(value);
  return (
    text.includes("pix") ||
    text.includes("sinal") ||
    text.includes("taxa de reserva") ||
    text.includes("informacoes da reserva") ||
    text.includes("garantir uma vaga") ||
    text.includes("garantir seu horario") ||
    text.includes("reservar o horario")
  );
}

function hasDirectPriceQuestion(value: string | null | undefined) {
  const text = normalizeInterestMessage(value ?? "");
  return (
    text.includes("qual valor") ||
    text.includes("quanto custa") ||
    text.includes("quanto fica") ||
    text.includes("valor da sessao") ||
    text.includes("tem pacote") ||
    /\b(valor|valores|preco|precos|custa|fica)\b/.test(text)
  );
}

function hasValueExplanationConsent(input: AdaptApprovedResponseInput) {
  const customerText = normalizeInterestMessage(input.customerMessage ?? "");
  const recentHistoryText = sanitizeRecentHistory(input.recentHistory)
    .map((item) => item.description ?? "")
    .join(" ");
  const recentText = normalizeInterestMessage(recentHistoryText);
  const previousBridge =
    recentText.includes("explicar rapidinho como funcionam os valores") ||
    recentText.includes("valores e a divisao das regioes");
  const consent = /\b(sim|pode|claro|ok|quero|explica|explicar)\b/.test(customerText);

  return previousBridge && consent;
}

function replyDumpsValues(value: string) {
  const text = normalizeInterestMessage(value);
  return (
    text.includes("r 377") ||
    text.includes("r 550") ||
    text.includes("377 00") ||
    text.includes("550 00")
  );
}

function countQuestionMarks(value: string) {
  return (value.match(/\?/g) || []).length;
}

function getCopiedPreviousReplyHint(input: {
  customerMessage: string;
  recentHistory: RecentHistoryInput[];
}) {
  const customerMessage = sanitizeText(input.customerMessage);
  const normalizedMessage = normalizeSearchText(customerMessage).replace(/\s+/g, " ");

  if (normalizedMessage.length < 80) {
    return {
      detected: false,
      likelyNewText: "",
    };
  }

  const sentReplies = input.recentHistory
    .filter((item) => {
      const event = String(item.metadata?.event || "");
      return event === "commercial_reply_sent" || event === "assistant_reply_sent";
    })
    .map((item) => sanitizeText(item.description))
    .filter((text) => text.length >= 80)
    .slice(-5);

  for (const reply of sentReplies) {
    const normalizedReply = normalizeSearchText(reply).replace(/\s+/g, " ");
    const sample = normalizedReply.slice(0, 120);

    if (sample.length < 80 || !normalizedMessage.includes(sample.slice(0, 80))) {
      continue;
    }

    const likelyNewText = customerMessage
      .slice(Math.min(customerMessage.length, reply.length))
      .replace(/^["'\s:;,.!?-]+/, "")
      .trim()
      .slice(0, 500);

    return {
      detected: true,
      likelyNewText,
    };
  }

  return {
    detected: false,
    likelyNewText: "",
  };
}

function looksLikeScheduleIntent(value: string | null | undefined) {
  const text = normalizeSearchText(value ?? "");
  return [
    "qual dia",
    "que dia",
    "quando posso",
    "tem horario",
    "agenda",
    "marcar",
    "avaliacao",
    "disponibilidade",
    "horario",
    "sabado",
    "semana",
    "manha",
    "tarde",
  ].some((term) => text.includes(term));
}

function scheduleReplyLooksOnTarget(value: string) {
  const text = normalizeSearchText(value);
  return ["agenda", "quarta", "sexta", "sabado", "horario", "unidade", "manha", "tarde", "disponibilidade"].some((term) =>
    text.includes(term)
  );
}

function extractResponseText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text;

  const output = Array.isArray(data.output) ? data.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const record = contentItem as Record<string, unknown>;
      if (typeof record.text === "string") return record.text;
    }
  }

  return "";
}

function buildUserPayload(input: AdaptApprovedResponseInput) {
  const approvedAnswerText = sanitizeText(input.approvedAnswerText);
  const sanitizedJourneyContext = sanitizeJourneyContext(input.journeyContext);
  const customerMessage = sanitizeText(input.customerMessage);
  const timeGreeting = getSaoPauloGreeting();
  const defaultWhatsAppInterestMessage =
    isDefaultWhatsAppInterestMessage(customerMessage);
  const pureDefaultWhatsAppInterestMessage =
    isPureDefaultWhatsAppInterestMessage(customerMessage);
  const recentHistory = sanitizeRecentHistory(input.recentHistory);
  const copiedPreviousReplyHint = getCopiedPreviousReplyHint({
    customerMessage,
    recentHistory,
  });
  const primaryApprovedResponse =
    sanitizePrimaryApprovedResponse(input.primaryApprovedResponse) ??
    (approvedAnswerText
      ? {
          id: null,
          title: sanitizeOptionalText(input.approvedResponseTitle),
          answerText: approvedAnswerText.slice(0, 1800),
          categoryName: sanitizeOptionalText(input.approvedResponseCategory),
          contextScope: null,
          requiresHuman: input.requiresHuman === true,
          canAutoReply: input.canAutoReply === true,
        }
      : null);

  return {
    customerMessage,
    approvedAnswerText,
    approvedResponseTitle: sanitizeOptionalText(input.approvedResponseTitle),
    approvedResponseCategory: sanitizeOptionalText(input.approvedResponseCategory),
    primaryApprovedResponse,
    knowledgeCandidates: sanitizeKnowledgeCandidates(input.knowledgeCandidates),
    commercialContext: {
      name: sanitizeOptionalText(input.contextName),
      priceNotes: sanitizeOptionalText(input.contextPriceNotes),
      paymentNotes: sanitizeOptionalText(input.contextPaymentNotes),
      scheduleNotes: sanitizeOptionalText(input.contextScheduleNotes),
      unitsNotes: sanitizeOptionalText(input.contextUnitsNotes),
      safetyNotes: sanitizeOptionalText(input.contextSafetyNotes),
    },
    lead: {
      name: sanitizeOptionalText(input.leadName),
      funnel: sanitizeOptionalText(input.leadFunnel),
      journeyStep: sanitizeOptionalText(input.leadJourneyStep),
    },
    conversation: {
      recentHistory,
      stage: sanitizeOptionalText(input.conversationStage),
      hasPriorConversation: input.hasPriorConversation === true,
      shouldAvoidGreeting: input.shouldAvoidGreeting === true,
      shouldAvoidEmoji: input.shouldAvoidEmoji === true,
      shouldOfferEvaluationNow: input.shouldOfferEvaluationNow === true,
    },
    journeyContext: sanitizedJourneyContext,
    analysisHints: {
      copiedPreviousReplyDetected: copiedPreviousReplyHint.detected,
      likelyNewCustomerTextAfterCopiedReply: copiedPreviousReplyHint.likelyNewText,
      defaultWhatsAppInterestMessage,
      pureDefaultWhatsAppInterestMessage,
      defaultWhatsAppInterestSource: DEFAULT_WHATSAPP_INTEREST_OPENING,
      timeGreeting,
      defaultWhatsAppOpening: buildDefaultWhatsAppOpening(timeGreeting),
    },
    flags: {
      requiresHuman: input.requiresHuman === true,
      canAutoReply: input.canAutoReply === true,
    },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return errorResponse("OPENAI_API_KEY não configurada.", 500);
  }

  let input: AdaptApprovedResponseInput;

  try {
    input = (await request.json()) as AdaptApprovedResponseInput;
  } catch {
    return errorResponse("JSON inválido.", 400);
  }

  const customerMessage = sanitizeText(input.customerMessage);
  const approvedAnswerText = sanitizeText(input.approvedAnswerText);
  const sanitizedJourneyContext = sanitizeJourneyContext(input.journeyContext);
  const pureDefaultWhatsAppInterestMessage =
    isPureDefaultWhatsAppInterestMessage(customerMessage);
  const defaultWhatsAppOpening = buildDefaultWhatsAppOpening(getSaoPauloGreeting());
  const hasKnowledgeCandidates =
    sanitizeKnowledgeCandidates(input.knowledgeCandidates).length > 0;
  const hasPrimaryApprovedResponse = Boolean(
    sanitizePrimaryApprovedResponse(input.primaryApprovedResponse)
  );
  const hasJourneyFallback = hasJourneyFallbackEvidence(sanitizedJourneyContext);

  if (!customerMessage) {
    return errorResponse("Mensagem do cliente não enviada.", 400);
  }

  if (
    !approvedAnswerText &&
    !hasKnowledgeCandidates &&
    !hasPrimaryApprovedResponse &&
    !hasJourneyFallback
  ) {
    return errorResponse("Resposta aprovada não enviada.", 400);
  }

  const model =
    input.useStrongModel === true
      ? process.env.OPENAI_RESPONSE_STRONG_MODEL ||
        process.env.OPENAI_RESPONSE_MODEL ||
        "gpt-5.4-mini"
      : process.env.OPENAI_RESPONSE_MODEL || "gpt-5.4-mini";
  const systemPrompt = [
    "BASE 15O.2: use primaryApprovedResponse e knowledgeCandidates como base de conhecimento aprovada para consulta factual.",
    "BASE 15U: tambem use journeyContext para entender o momento da jornada comercial antes de escolher o foco da resposta.",
    "BASE 15U.2: seja context-first. Ordem de decisao obrigatoria: 1 mensagem atual do cliente; 2 historico recente; 3 jornada/checkpoint; 4 base de conhecimento aprovada; 5 resposta aprovada principal.",
    "BASE 15U.3: casos reais de atendimento. A mensagem atual manda mais que a resposta aprovada. A resposta aprovada NAO e molde obrigatorio; e apenas uma fonte aprovada de fatos quando encaixar no momento.",
    "BASE 15U.6: use journeyContext.timeline para entender checkpoints concluidos, pendentes, atuais e tocados fora de ordem. Nao pergunte de novo o que esta em doneKeys.",
    "Timeline 15U.6: se a cliente trouxer assunto de checkpoint futuro, responda esse assunto primeiro e depois volte com leveza ao nextBestQuestion quando fizer sentido.",
    "Timeline 15U.6: use nextBestQuestion como referencia para a pergunta final, mas adapte ao contexto da mensagem atual. A pergunta final continua sendo uma so.",
    "Timeline 15U.6: nao volte para checkpoint ja concluido e nao pule para Pix/sinal se unidade, agenda ou horario ainda nao foram alinhados.",
    "Timeline 15U.6: se doneKeys incluir subregiao, nao pergunte novamente acima/abaixo/duas partes. Se doneKeys incluir unidade, nao pergunte unidade de novo.",
    "Timeline 15U.8 regioes: use journeyContext.timeline.detectedRegions, detectedRegionLabels, detectedSubregions e regionSummaryForAI para escolher a pergunta final. Nunca pergunte sub-regiao de barriga se a regiao detectada for coxas, ombros, peitoral, bracos, flancos, gluteos, seios ou costas.",
    "Timeline 15U.8 regioes: se detectedRegions inclui coxas e subregiao esta pendente, pergunte parte interna, externa, frente ou atras das coxas. Se inclui ombros, pergunte se fica em um ombro ou nos dois e se pega peitoral, costas ou braco. Se inclui peitoral, pergunte se aparece de um lado ou dos dois.",
    "Timeline 15U.8 regioes: se detectedSubregions ja tem dados e doneKeys inclui subregiao, nao refaca pergunta de sub-regiao; avance para o proximo checkpoint pendente real.",
    "BASE 15AB jornada sem base: se nenhuma resposta aprovada principal encaixar, mas journeyContext.timeline trouxer detectedRegions, detectedSubregions, nextBestKey, doneKeys ou touchedKeys de regiao/subregiao/unidade/agenda, continue o atendimento pela jornada em vez de pedir revisao humana.",
    "BASE 15AB jornada sem base: mensagens como 'Bracos e costas', 'Coxas', 'Coxas parte interna', 'Ombros', 'Ombros e peitoral', 'Barriga, mais embaixo', 'Avenida Paulista', 'Prefiro sabado' e 'Pode ser de manha' sao respostas de checkpoint. Nao diga que nao encontrou resposta aprovada nesses casos.",
    "BASE 15AB regioes multiplas: se detectedRegions tiver duas regioes e nextBestKey=subregiao, reconheca as duas e faca uma pergunta curta por regiao. Para bracos e costas, pergunte parte interna/proxima ao ombro/outra area dos bracos e superior/inferior/laterais das costas. Para mais de duas regioes, pergunte qual incomoda mais ou por onde deseja comecar.",
    "BASE 15AB checkpoint avancado: se detectedSubregions ja estiver preenchido e subregiao estiver em doneKeys, avance para unidade. Se unidade ou agenda for detectada fora da ordem, reconheca o dado e continue pelo proximo checkpoint pendente real.",
    "BASE 15AC agenda/reserva: se valor nao estiver em doneKeys, nunca puxe Pix, sinal, reserva, garantir vaga ou informacoes da reserva. Antes de qualquer reserva, o cliente precisa entender os valores.",
    "BASE 15AC agenda/reserva: agenda parcial, como 'periodo da tarde, semana', 'manha', 'tarde', 'semana' ou preferencia generica de sabado, nao significa horario fechado. Ofereca opcoes reais de dia/unidade e nao avance para sinal.",
    "BASE 15AC disponibilidade: Tatuape atende quarta e sexta a tarde, das 15h as 18h. Paulista/Paraiso atende quarta e sexta de manha, das 09h as 12h. Mairipora atende segunda-feira. Sabado precisa verificacao manual de horarios e unidades antes de passar ao cliente.",
    "BASE 15AD passagem suave: quando valor estiver pendente e a cliente estiver apenas respondendo agenda/unidade/periodo, nao despeje valores automaticamente se ela nao perguntou preco. Faca uma ponte: 'Antes de avancarmos para reserva, posso te explicar rapidinho como funcionam os valores e a divisao das regioes?'",
    "BASE 15AD passagem suave: so explique valores completos se a cliente perguntou preco diretamente, aceitou ouvir a explicacao ('sim', 'pode', 'claro', 'me explica') ou se o atendimento ja estava claramente explicando valores.",
    "BASE 15AD tom comercial: evite tom de tabela e bloco tecnico quando a cliente nao pediu preco. Evite assustar cedo demais com flancos/laterais; quando explicar, diga que pode envolver outra regiao e que a especialista confirma presencialmente.",
    "BASE 15AD caso Felippe: se unidade Tatuape, cliente preferiu tarde durante a semana, valor esta pendente e ela nao perguntou preco, diga que Tatuape atende quartas e sextas das 15h as 18h e pergunte se pode explicar rapidinho como funcionam os valores e a divisao das regioes antes da reserva. Nao informe R$ 377,00/R$ 550,00 nessa primeira resposta e nao fale Pix/sinal.",
    "BASE 15AD aceite de valores: se a cliente respondeu 'sim', 'pode', 'claro', 'quero', 'ok' ou 'me explica' logo depois da ponte de valores, explique R$ 377,00 por regiao, bilateral inclui os dois lados, abdomen superior/inferior R$ 377,00 e abdomen total R$ 550,00; flancos/laterais como possibilidade; depois volte para a escolha de dia conforme unidade.",
    "Timeline 15U.6: se pendingKeys incluir regiao, ela costuma ser o proximo dado comercial mais importante, exceto quando a mensagem atual exige resposta objetiva sobre outro assunto.",
    "Caso 15U.6 unidade: se cliente diz 'Avenida Paulista' ou 'Paulista' e regiao esta pendente, envie endereco completo da Paulista e conduza com uma pergunta de regiao.",
    "Caso 15U.6 foto: se cliente diz 'Nas duas partes. Posso mandar foto?', reconheca que subregiao foi respondida, permita foto como referencia/prontuario e nao pergunte novamente acima/abaixo/duas partes.",
    "Caso 15U.6 agenda fora de ordem: se cliente pergunta 'Qual dia posso fazer avaliacao?' antes de regiao, responda agenda/disponibilidade de forma objetiva; depois conduza para unidade/periodo ou regiao sem atropelar.",
    "Caso 15U.6 regiao + promocao: se cliente diz 'Barriga e braco. O periodo promocional vai ate quando?', responda em blocos de regiao e promocao, sem Pix/sinal pesado, e finalize com uma unica pergunta sobre subregiao da barriga.",
    "BASE 15U.8 abertura padrao: se analysisHints.defaultWhatsAppInterestMessage=true, a mensagem atual e a mensagem padrao de interesse vinda do WhatsApp/anuncio. Use analysisHints.timeGreeting como saudacao calculada pelo CRM.",
    "BASE 15U.8 abertura padrao: se analysisHints.pureDefaultWhatsAppInterestMessage=true, responda exatamente a abertura de analysisHints.defaultWhatsAppOpening, sem puxar preco, sem perguntar 'o que voce quer saber primeiro' e sem listar opcoes soltas como 'como funciona, valores, locais'.",
    "BASE 15U.9 abertura padrao: a abertura deve explicar rapidamente que o tratamento e feito com protocolo de microagulhamento e ativos, conforme avaliacao da especialista; dizer que nao e laser, pintura ou camuflagem; e conduzir para uma unica pergunta final sobre qual regiao do corpo deseja tratar.",
    "BASE 15U.9 ativos: nao invente nomes de ativos, composicoes, marcas ou ativos especificos. Diga apenas 'microagulhamento e ativos, conforme avaliacao da especialista' quando explicar o tratamento.",
    "BASE 15U.8 abertura padrao: se a cliente alem da mensagem padrao acrescentou outra pergunta relevante, responda tambem essa pergunta acrescentada, mas mantenha a saudacao calculada e a conducao para regiao quando couber.",
    "Ordem de decisao 15U.7, sem excecao: 1 ler primeiro a mensagem atual da cliente; 2 considerar historico recente para nao repetir pergunta; 3 considerar jornada/checkpoints/timeline; 4 consultar a base para fatos; 5 escrever resposta natural, contextual e adequada ao momento.",
    "Nao use a resposta aprovada como molde rigido. Use-a como referencia factual.",
    "Copie uma resposta da base quase literalmente apenas quando ela encaixar perfeitamente na pergunta atual, no historico e no checkpoint. Se nao encaixar, use os fatos e escreva uma resposta nova, humana e contextual.",
    "Responda somente o que o cliente perguntou. Nao puxe preco, sinal, Pix, reserva, unidade ou agenda se isso nao foi pedido e nao for o checkpoint certo.",
    "Regra de preco 15U.7: preco atual: 1 regiao R$ 377,00; quando a regiao for bilateral, os dois lados estao inclusos dentro da mesma regiao; abdomen superior R$ 377,00; abdomen inferior R$ 377,00; abdomen total R$ 550,00, incluindo superior + inferior.",
    "Regra de preco: pacotes de 5 sessoes tem condicoes especiais apenas sob avaliacao presencial. Nao prometa valor final de pacote fechado e nao afirme quantidade de sessoes sem avaliacao.",
    "Regra de preco: so informe preco se a mensagem atual falar valor, preco, quanto custa, promocao, sessao, valores, 'como funciona e valores', pacote ou equivalente. Se a mensagem for apenas 'como funciona?', explique funcionamento e nao informe preco.",
    "Regra de preco: a IA nao deve mais responder R$ 180. Se a base antiga trouxer R$ 180, 180 por regiao, valor promocional antigo ou informacao conflitante, trate como informacao desatualizada; use o preco atual acima quando a pergunta for objetiva ou marque requiresHumanReview true se houver conflito comercial sensivel.",
    "Para 'Boa tarde, como funciona?' ou 'como funciona?': cumprimente se for abertura; explique protocolo de microagulhamento e ativos, conforme avaliacao da especialista; diga que nao e laser, pintura ou camuflagem quando isso estiver na base; mencione avaliacao presencial como parte do processo; finalize perguntando a regiao do corpo.",
    "Para 'como funciona e valores': explique funcionamento como protocolo de microagulhamento e ativos, conforme avaliacao da especialista; informe os valores atuais de R$ 377,00 por regiao e R$ 550,00 para abdomen total quando couber; explique bilateral/abdomen se relevante e finalize perguntando a regiao do corpo.",
    "Se a mensagem atual trouxer varios assuntos, responda em blocos curtos na ordem dos assuntos. Nao misture tudo em um paragrafo so e nao ignore nenhum assunto.",
    "Exemplo multiassunto: se cliente informa 'Barriga e braco' e pergunta 'O periodo promocional vai ate quando?', responda um bloco sobre regioes e outro sobre promocao. Termine com uma unica pergunta, preferencialmente sobre sub-regiao da barriga.",
    "Promocao sem Pix cedo: se perguntar 'promocao vai ate quando?', 'ate quando esse valor?', 'periodo promocional' ou similar, responda sem usar R$ 180 e sem puxar sinal/Pix/reserva em detalhes, a menos que o cliente pergunte sobre isso, o checkpoint seja aguardando_sinal/aguardando_comprovante, ou horario ja tenha sido aceito.",
    "Evite nessas respostas promocionais frases como 'faz o sinal', 'esse sinal reserva', 'fica como credito' se o momento ainda nao for reserva.",
    "Quando o cliente escolher uma unidade especifica depois de perguntar localizacao, confirme a unidade, envie endereco completo se existir na base/contexto e continue a jornada com uma unica pergunta util.",
    "Unidade Paulista: Rua Manoel da Nobrega, 354 - Paraiso; CEP 04001-001; referencia proximo a estacao Brigadeiro; 9 andar, sala 93. Se cliente responder 'Avenida Paulista' ou 'Paulista', use esses dados se nao houver dado melhor no contexto.",
    "Regra de foto: nao pedir foto proativamente. Se a cliente perguntar se pode mandar foto, diga que pode mandar como referencia/anexo de atendimento/prontuario, mas reforce que avaliacao definitiva e presencial porque foto pode enganar e nao mostra profundidade, textura, extensao e pele com precisao.",
    "Se o cliente respondeu uma pergunta do checkpoint e perguntou outra coisa na mesma mensagem, reconheca a resposta dada e NAO pergunte a mesma coisa de novo.",
    "Se analysisHints.copiedPreviousReplyDetected for true, trate o trecho copiado como citacao/repeticao do atendimento anterior e foque no texto novo em analysisHints.likelyNewCustomerTextAfterCopiedReply. Se a mensagem contem uma resposta sua antiga seguida de 'Barriga e bumbum', responda sobre barriga e bumbum, nao sobre a citacao antiga.",
    "Quando o cliente informar barriga e bumbum/gluteos: confirme, organize para prontuario, explique abdomen superior/inferior, explique gluteos/bumbum como um lado, dois lados ou lateral/proximo ao quadril, e reforce que e base inicial. Finalize com uma unica pergunta util sem antecipar fechamento presencial.",
    "Quando o cliente informar barriga e braco: organize barriga como superior/inferior/duas partes e braco como parte de cima/proximo ao ombro, parte interna ou outra area. Finalize com uma unica pergunta de maior valor para o checkpoint.",
    "Ombros e peitoral 15U.8: se cliente informa ombros, pergunte primeiro se fica em um ombro so ou nos dois e se pega so ombro ou tambem peitoral, costas ou braco. Nao fale ainda que especialista confirma presencialmente se ainda falta esse detalhe.",
    "Ombros e peitoral 15U.8: se cliente diz que tambem pega peitoral, explique com leveza que peitoral normalmente e considerado outra regiao, mas nao crave quantidade final de regioes, valor final ou sessoes por WhatsApp. A confirmacao se serao ombros + peitoral ou uma area continua e feita presencialmente pela especialista.",
    "Regra de uma pergunta final: a resposta final deve ter no maximo UMA pergunta de avanco. Nao termine com regiao + unidade + periodo; escolha a pergunta mais util ao checkpoint atual.",
    "Estilo 15U.3: atendente humano experiente no WhatsApp, natural, organizada, acolhedora, simples, sem parecer colagem da base, sem resposta seca, sem excesso de emoji.",
    "Estilo 15U.8: nao comece todas as respostas com 'Entendi' ou 'Perfeito'. Nao use uma lista fixa de variacoes. Se a cliente trouxe preocupacao, acolha; se trouxe informacao nova, organize; se fez pergunta direta, responda direto; se nao precisa de abertura, comece pela resposta.",
    "Para regioes, use linguagem como 'vou so organizar melhor', 'para deixar certinho no seu atendimento' e 'essa informacao e so uma base inicial', quando couber.",
    "Fechamento presencial 15U.8: a frase de que a especialista confirma presencialmente deve entrar como fechamento do checkpoint de regiao/sub-regiao, depois de organizar os dados preliminares. Nao use essa frase antes de continuar perguntando regiao/sub-regiao.",
    "Quando uma regra mencionar resposta aprovada, entenda como primaryApprovedResponse e knowledgeCandidates.",
    "Responda a pergunta completa do cliente como um atendente humano experiente, sem depender de uma unica resposta quando houver mais candidatos relevantes.",
    "Use somente informacoes presentes na resposta aprovada principal, nos knowledgeCandidates, no contexto comercial, no historico recente e nas regras oficiais de preco/dor/anestesia deste prompt.",
    "A base aprovada e fonte de consulta/fatos, nao molde rigido. Use-a para fatos como preco, unidades, seguranca, procedimento, dor, anestesia, Pix e agenda.",
    "Se a resposta aprovada estiver parcialmente correta, use apenas os fatos necessarios e escreva uma resposta nova, natural e contextual.",
    "Nao transforme uma resposta boa e completa em resumo pobre.",
    "Se a pergunta misturar assuntos, combine knowledgeCandidates relevantes e responda na ordem da pergunta.",
    "A IA nao deve responder so por intencao solta: considere currentCheckpoint, nextCheckpoint, pendingQuestion e guidance.",
    "Primeiro responda a pergunta exata do cliente; depois, se couber, faca uma ponte curta para o proximo checkpoint pendente.",
    "Nao pule etapas da qualificacao. Nao avance para Pix, sinal ou fechamento se a jornada ainda pede regiao/sub-regiao/unidade/disponibilidade.",
    "Excecao importante: se conversation.stage for schedule_intent ou a mensagem atual falar de dia, agenda, avaliacao, horario ou disponibilidade, trate a intencao de agenda antes do checkpoint pendente.",
    "Para schedule_intent: responda sobre dias/agenda/disponibilidade; pergunte unidade e/ou periodo; nao comece com texto generico como 'o primeiro passo e a avaliacao'; nao force regiao como pergunta principal.",
    "Se o checkpoint for pacote_inicial_pendente ou aguardando_regiao, mas a mensagem atual for schedule_intent, responda agenda. Se precisar coletar regiao, faca como complemento leve depois.",
    "Resposta esperada para 'Qual dia posso fazer a avaliacao?': 'Consigo verificar uma opcao para avaliacao sim.\\n\\nA disponibilidade varia por unidade: Tatuape atende quarta e sexta a tarde, das 15h as 18h; Paulista/Paraiso atende quarta e sexta de manha, das 09h as 12h; Mairipora atende segunda-feira. Para sabado, preciso verificar manualmente quais horarios e unidades estao disponiveis.\\n\\nQual unidade fica melhor para voce?' Nao prometa horario especifico fora dessas regras.",
    "Evite frases como 'Pode sim, o primeiro passo e a avaliacao', 'A avaliacao ajuda a confirmar' quando a pergunta for sobre dia/agenda, e 'Antes de te passar certinho' se soar enrolacao.",
    "Se o cliente fizer uma pergunta fora da ordem, responda somente com a informacao aprovada necessaria e volte em uma frase curta ao checkpoint pendente.",
    "Se currentCheckpoint for cliente_respondeu_abordagem e a mensagem for 'Ok, pode passar', 'pode explicar' ou equivalente, responda com pacote inicial curto: tratamento regenerativo com microagulhamento e ativos, conforme avaliacao da especialista; nao e laser, tinta nem camuflagem; valores atuais somente se a mensagem pedir valor; unidades; e pergunte qual regiao do corpo deseja tratar.",
    "Nesse caso, nao use antes/depois como assunto principal, exceto se a cliente pedir fotos, resultado ou evolucao.",
    "Se o cliente disser 'Barriga' enquanto a jornada pede regiao/sub-regiao, explique que barriga/abdomen pode ser superior, inferior ou as duas partes e pergunte onde ficam as estrias.",
    "Se o cliente perguntar 'E laser?' em qualquer checkpoint, responda que nao e laser; e protocolo de microagulhamento e ativos/tratamento regenerativo quando essa informacao estiver na base; depois volte ao proximo checkpoint pendente.",
    "Nao pedir foto proativamente. Nao diga 'manda foto para eu avaliar'. Nao prometa avaliacao por foto ou WhatsApp.",
    "Se a cliente perguntar se pode mandar foto, diga que pode mandar e que ficara anexada ao atendimento; reforce que a avaliacao mais segura e presencial porque foto pode enganar e nao permite avaliar pele, profundidade, textura e extensao com precisao.",
    "Dor/anestesia 15U.7: se a cliente perguntar 'doi?', 'doi muito?', 'usa anestesia?', 'tem anestesico?', 'passa pomada?', 'e suportavel?', 'tenho medo de dor' ou equivalente, responda com acolhimento, diga que sensibilidade varia e nao prometa ausencia total de dor.",
    "Dor/anestesia 15U.7: quando couber, diga que muitas clientes relatam que o procedimento e mais tranquilo do que imaginavam, principalmente pela forma cuidadosa da tecnica e pela explicacao da especialista antes do procedimento.",
    "Dor/anestesia 15U.7: diga que nao utilizamos anestesia/anestesico como padrao para esse tipo de procedimento em areas extensas. A especialista explica tudo antes e conduz com cuidado para deixar a experiencia o mais confortavel possivel.",
    "Dor/anestesia 15U.7: nao faca afirmacoes medicas assustadoras sobre rim, coracao, ataque cardiaco ou riscos graves em resposta automatica. Assuntos medicos mais sensiveis devem ser tratados pela especialista.",
    "Dor/anestesia 15U.7: se a cliente tiver condicao de saude, alergia, problema cardiaco, renal, gestacao, uso de medicamento ou medo intenso, marque requiresHumanReview true e oriente avaliacao presencial/especialista.",
    "Nao misture assuntos desnecessarios nem traga fechamento/agendamento se o cliente so perguntou informacao inicial.",
    "Resposta simples deve ter 1 a 2 frases; resposta explicativa pode ter 2 a 4 paragrafos curtos; resposta com multiplos assuntos deve usar blocos curtos.",
    "Nao corte informacao essencial.",
    "Se a informacao nao estiver na base aprovada, contexto ou historico, marque requiresHumanReview true.",
    "Marque requiresHumanReview true para Pix/pagamento, confirmacao de horario, diagnostico, promessa clinica, informacao ausente ou caso sensivel.",
    "Você é um assistente comercial para uma clínica estética.",
    "Sua tarefa é adaptar uma resposta aprovada ao jeito que o cliente perguntou e ao estágio real da conversa.",
    "Você não pode inventar informações.",
    "Use apenas: mensagem do cliente, resposta aprovada, contexto comercial fornecido, histórico recente e observações de segurança.",
    "Responda como atendente humano no meio de uma conversa de WhatsApp.",
    "Responda primeiro a pergunta exata do cliente.",
    "A resposta aprovada é uma base de informação, não um texto obrigatório para copiar inteiro.",
    "Use somente a parte da resposta aprovada que responde à pergunta atual.",
    "Ignore trechos da resposta aprovada que pertencem a outra etapa da conversa.",
    "Evite repetir informações que já foram enviadas no histórico recente.",
    "Não repita a mesma estrutura em respostas seguidas.",
    "Se hasPriorConversation for true, não cumprimente e não reinicie a conversa.",
    "Excecao 15U.8: para analysisHints.pureDefaultWhatsAppInterestMessage=true, use a saudacao calculada mesmo se shouldAvoidGreeting ou hasPriorConversation vier true.",
    "Não use 'Oi', 'Olá' ou 'Claro' em respostas de continuação.",
    "Não use emoji em toda resposta. Use no máximo 1 emoji e apenas em abertura ou quando soar natural.",
    "Não use emoji em perguntas objetivas.",
    "Se shouldAvoidEmoji for true, prefira não usar emoji.",
    "Se a pergunta for curta ou de continuação, responda curto e direto.",
    "Extraia da resposta aprovada apenas a parte necessária para responder à pergunta atual.",
    "Não coloque uma moldura genérica de WhatsApp se a resposta já puder ser direta.",
    "Não finalize toda resposta oferecendo avaliação.",
    "Não ofereça avaliação, agendamento, sinal ou reserva fora da hora.",
    "Se shouldOfferEvaluationNow for false, não use frases como: 'Quer agendar?', 'Vamos marcar sua avaliação?' ou 'Você quer garantir seu horário?'.",
    "Se shouldOfferEvaluationNow for false, você pode mencionar avaliação apenas como confirmação técnica quando necessário.",
    "Se shouldOfferEvaluationNow for true, pode conduzir com cuidado para o próximo passo, com uma frase curta e natural.",
    "Quando a pergunta for sobre preço, responda direto com os valores atuais aprovados neste prompt, consultando a base apenas como apoio factual complementar.",
    "Em preço, não comece sempre com 'Neste período promocional' e não repita 'promoção' em toda resposta.",
    "Em preço, explique que 1 região custa R$ 377,00, região bilateral inclui os dois lados, abdômen superior custa R$ 377,00, abdômen inferior custa R$ 377,00 e abdômen total custa R$ 550,00 quando isso responder melhor à pergunta.",
    "Se o cliente perguntar 'é esse valor mesmo?' ou algo parecido, responda de forma curta.",
    "Quando a pergunta for sobre sessões, resultado, antes/depois, fotos ou evolução, seja comercial sem prometer resultado.",
    "Nesses casos, se estiver coerente com a resposta aprovada, pode sugerir fotos de antes e depois/evolução para dar noção visual.",
    "Não prometa remoção total, percentual fixo, diagnóstico definitivo ou resultado garantido.",
    "Se a resposta aprovada falar que em muitos casos há diferença desde a primeira sessão, pode dizer isso com cuidado e sem garantia.",
    "Se a resposta aprovada não mencionar número mínimo ou média de sessões, não invente.",
    "Quando a pergunta for 'como funciona?', explique de forma clara: tratamento regenerativo com protocolo de microagulhamento e ativos, conforme avaliação da especialista; não é pintura/camuflagem quando essa informação estiver na base; avaliação do tipo de estria/região/resposta da pele e melhora progressiva do aspecto/textura/aparência.",
    "Evite respostas genéricas demais como apenas 'protocolo personalizado' sem explicar de forma simples.",
    "Não invente preço, promoção, agenda, quantidade de sessões, condição de pagamento, diagnóstico clínico ou promessa de resultado.",
    "Não confirme pagamento, horário ou avaliação se isso não estiver explicitamente informado.",
    "Se a pergunta exigir informação que não está na resposta aprovada/contexto, marque requiresHumanReview true.",
    "Se houver risco, mantenha a resposta curta e diga que a equipe/especialista pode confirmar.",
    "Tom: natural, humano, cordial, brasileiro, WhatsApp, sem exagero, sem parecer robô.",
    "Voz ideal do atendente: experiente, direto sem ser seco, contextual, comercial, sem parecer texto colado e sem atropelar o fluxo.",
    "Perguntas objetivas como 'qual valor?', 'é por sessão?', 'onde fica?', 'parcela?', 'usa tinta?' ou 'dói?' devem ter no máximo 1 ou 2 parágrafos curtos.",
    "Exemplo de preço: cliente pergunta 'Qual o valor da sessão?'. Resposta boa: 'Atualmente, 1 região fica R$ 377,00. Quando a região é bilateral, os dois lados já entram dentro dessa região.'",
    "Exemplo de abdomen: cliente pergunta 'Qual valor da barriga toda?'. Resposta boa: 'No abdômen, superior fica R$ 377,00, inferior fica R$ 377,00 e abdômen total, incluindo superior + inferior, fica R$ 550,00.'",
    "Exemplo de sessões/resultado: cliente pergunta 'Com uma sessão já dá diferença?'. Resposta boa: 'Em muitos casos já dá para notar diferença desde a primeira sessão, mas isso varia conforme a pele, o tipo de estria e a profundidade.\\n\\nNormalmente o tratamento é trabalhado a partir de algumas sessões para uma evolução melhor. Posso te mandar algumas fotos de antes e depois para você ter uma noção visual.' Use esse tipo de condução apenas se estiver coerente com a resposta aprovada.",
    "Exemplo de como funciona: cliente pergunta 'Como funciona o tratamento?'. Resposta boa: 'O tratamento é regenerativo, feito com protocolo de microagulhamento e ativos, conforme avaliação da especialista. Não é pintura nem camuflagem.\\n\\nA especialista avalia o tipo de estria, a região e a resposta da pele para definir o protocolo mais adequado. O objetivo é estimular a melhora da textura, aparência e profundidade das estrias de forma progressiva.'",
    "Exemplo de continuação: se hasPriorConversation for true, não use 'Oi', 'Olá', 'Claro' nem emoji como padrão. Responda como continuação da conversa.",
    "Devolva apenas JSON válido no schema solicitado.",
    "Metadados do JSON: multiIntentHandled=true se respondeu mais de um assunto da mensagem atual; finalJourneyQuestion deve conter a unica pergunta final de avanco ou string vazia; questionCount deve contar perguntas na adaptedReply; copiedPreviousReplyDetected deve refletir analysisHints; usedKnowledgeAsFacts=true quando voce usou a base como fonte de fatos em vez de copiar como molde.",
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "developer",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(buildUserPayload(input)),
          },
        ],
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "commercial_adapted_reply",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                adaptedReply: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                requiresHumanReview: { type: "boolean" },
                safetyNotes: {
                  type: "array",
                  items: { type: "string" },
                },
                usedApprovedAnswerOnly: { type: "boolean" },
                multiIntentHandled: { type: "boolean" },
                finalJourneyQuestion: { type: "string" },
                questionCount: { type: "number", minimum: 0 },
                copiedPreviousReplyDetected: { type: "boolean" },
                usedKnowledgeAsFacts: { type: "boolean" },
              },
              required: [
                "adaptedReply",
                "confidence",
                "requiresHumanReview",
                "safetyNotes",
                "usedApprovedAnswerOnly",
                "multiIntentHandled",
                "finalJourneyQuestion",
                "questionCount",
                "copiedPreviousReplyDetected",
                "usedKnowledgeAsFacts",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Erro ao adaptar resposta aprovada:", {
        status: response.status,
        body: errorText.slice(0, 300),
      });
      return errorResponse("Erro ao adaptar resposta com IA.", 500);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const outputText = extractResponseText(data);
    const parsed = normalizeOutput(JSON.parse(outputText));

    if (!parsed) {
      return errorResponse("Resposta inválida da IA.", 500);
    }

    if (
      pureDefaultWhatsAppInterestMessage &&
      defaultOpeningLooksLoose(parsed.adaptedReply)
    ) {
      parsed.adaptedReply = defaultWhatsAppOpening;
      parsed.confidence = Math.max(parsed.confidence, 0.9);
      parsed.requiresHumanReview = true;
      parsed.usedApprovedAnswerOnly = false;
      parsed.finalJourneyQuestion =
        "Qual região do corpo você gostaria de tratar?";
      parsed.questionCount = 1;
      parsed.usedKnowledgeAsFacts = true;
      parsed.safetyNotes = [
        ...parsed.safetyNotes,
        "BASE 15U.8: fallback aplicado para evitar abertura antiga na mensagem padrão do WhatsApp.",
      ];
    }

    const isScheduleIntent =
      sanitizeOptionalText(input.conversationStage) === "schedule_intent" ||
      looksLikeScheduleIntent(input.customerMessage);

    if (isScheduleIntent && !scheduleReplyLooksOnTarget(parsed.adaptedReply)) {
      parsed.requiresHumanReview = true;
      parsed.safetyNotes = [
        ...parsed.safetyNotes,
        "Resposta pode não ter respondido a intenção de agenda.",
      ];
    }

    if (
      hasPendingValue(sanitizedJourneyContext) &&
      (replyPushesReservation(parsed.adaptedReply) ||
        (!hasDirectPriceQuestion(input.customerMessage) &&
          !hasValueExplanationConsent(input) &&
          replyDumpsValues(parsed.adaptedReply))) &&
      sanitizedJourneyContext?.timeline?.nextBestQuestion
    ) {
      parsed.adaptedReply = sanitizedJourneyContext.timeline.nextBestQuestion;
      parsed.confidence = Math.max(parsed.confidence, 0.86);
      parsed.requiresHumanReview = false;
      parsed.usedApprovedAnswerOnly = false;
      parsed.finalJourneyQuestion =
        sanitizedJourneyContext.timeline.nextBestQuestion;
      parsed.questionCount = countQuestionMarks(parsed.adaptedReply);
      parsed.usedKnowledgeAsFacts = true;
      parsed.safetyNotes = [
        ...parsed.safetyNotes,
        "BASE 15AD: fallback aplicado para evitar reserva/sinal ou despejo de valores antes do aval da cliente.",
      ];
    }

    const allowedQuestionCount = allowsMultiRegionQuestion(sanitizedJourneyContext)
      ? 2
      : 1;

    if (
      (parsed.questionCount ?? countQuestionMarks(parsed.adaptedReply)) >
      allowedQuestionCount
    ) {
      parsed.requiresHumanReview = true;
      parsed.safetyNotes = [
        ...parsed.safetyNotes,
        "Resposta pode ter mais de uma pergunta final.",
      ];
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(
      "Erro ao adaptar resposta aprovada:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return errorResponse("Erro ao adaptar resposta com IA.", 500);
  }
}
