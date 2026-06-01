import { NextResponse } from "next/server";

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
  const customerMessage = sanitizeText(input.customerMessage);
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
    journeyContext: sanitizeJourneyContext(input.journeyContext),
    analysisHints: {
      copiedPreviousReplyDetected: copiedPreviousReplyHint.detected,
      likelyNewCustomerTextAfterCopiedReply: copiedPreviousReplyHint.likelyNewText,
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
  const hasKnowledgeCandidates =
    sanitizeKnowledgeCandidates(input.knowledgeCandidates).length > 0;
  const hasPrimaryApprovedResponse = Boolean(
    sanitizePrimaryApprovedResponse(input.primaryApprovedResponse)
  );

  if (!customerMessage) {
    return errorResponse("Mensagem do cliente não enviada.", 400);
  }

  if (!approvedAnswerText && !hasKnowledgeCandidates && !hasPrimaryApprovedResponse) {
    return errorResponse("Resposta aprovada não enviada.", 400);
  }

  const model =
    input.useStrongModel === true
      ? process.env.OPENAI_RESPONSE_STRONG_MODEL ||
        process.env.OPENAI_RESPONSE_MODEL ||
        "gpt-5.4-mini"
      : process.env.OPENAI_RESPONSE_MODEL || "gpt-5.4-mini";
  const systemPrompt = [
    "BASE 15O.2: responda usando a resposta aprovada principal e knowledgeCandidates como base de conhecimento aprovada.",
    "BASE 15U: tambem use journeyContext para entender o momento da jornada comercial antes de escolher o foco da resposta.",
    "BASE 15U.2: seja context-first. Ordem de decisao obrigatoria: 1 mensagem atual do cliente; 2 historico recente; 3 jornada/checkpoint; 4 base de conhecimento aprovada; 5 resposta aprovada principal.",
    "BASE 15U.3: casos reais de atendimento. A mensagem atual manda mais que a resposta aprovada. A resposta aprovada NAO e molde obrigatorio; e apenas uma fonte aprovada de fatos quando encaixar no momento.",
    "Ordem de decisao 15U.3, sem excecao: 1 entender exatamente a mensagem atual; 2 considerar o historico recente para nao repetir pergunta; 3 respeitar checkpoint/jornada; 4 usar knowledgeCandidates/contexto como fonte de fatos; 5 usar primaryApprovedResponse somente se encaixar perfeitamente.",
    "Preserve 80% a 90% da resposta aprovada apenas quando ela encaixar perfeitamente na pergunta atual, no historico e no checkpoint. Se nao encaixar, use os fatos e escreva uma resposta nova, humana e contextual.",
    "Responda somente o que o cliente perguntou. Nao puxe preco, sinal, Pix, reserva, unidade ou agenda se isso nao foi pedido e nao for o checkpoint certo.",
    "Regra de preco: so informe preco se a mensagem atual falar valor, preco, quanto custa, promocao, sessao, valores, 'como funciona e valores' ou equivalente. Se a mensagem for apenas 'como funciona?', explique funcionamento e nao informe R$ 180.",
    "Para 'Boa tarde, como funciona?' ou 'como funciona?': cumprimente se for abertura; explique microagulhamento/tratamento regenerativo; diga que nao e laser, pintura ou camuflagem quando isso estiver na base; mencione avaliacao presencial como parte do processo; finalize perguntando a regiao do corpo.",
    "Para 'como funciona e valores': explique funcionamento, informe R$ 180 por regiao/sessao somente se esse fato estiver na base/contexto, e finalize perguntando a regiao do corpo.",
    "Se a mensagem atual trouxer varios assuntos, responda em blocos curtos na ordem dos assuntos. Nao misture tudo em um paragrafo so e nao ignore nenhum assunto.",
    "Exemplo multiassunto: se cliente informa 'Barriga e braco' e pergunta 'O periodo promocional vai ate quando?', responda um bloco sobre regioes e outro sobre promocao. Termine com uma unica pergunta, preferencialmente sobre sub-regiao da barriga.",
    "Promocao sem Pix cedo: se perguntar 'promocao vai ate quando?', 'ate quando esse valor?', 'periodo promocional' ou similar, diga que R$ 180 por sessao/regiao esta dentro da campanha atual e que a promocao e garantida para quem faz a reserva dentro do mes vigente; campanhas podem mudar depois. Nao puxe sinal/Pix/reserva em detalhes, a menos que o cliente pergunte sobre isso, o checkpoint seja aguardando_sinal/aguardando_comprovante, ou horario ja tenha sido aceito.",
    "Evite nessas respostas promocionais frases como 'faz o sinal', 'esse sinal reserva', 'fica como credito' se o momento ainda nao for reserva.",
    "Quando o cliente escolher uma unidade especifica depois de perguntar localizacao, confirme a unidade, envie endereco completo se existir na base/contexto e continue a jornada com uma unica pergunta util.",
    "Unidade Paulista: Rua Manoel da Nobrega, 354 - Paraiso; CEP 04001-001; referencia proximo a estacao Brigadeiro; 9 andar, sala 93. Se cliente responder 'Avenida Paulista' ou 'Paulista', use esses dados se nao houver dado melhor no contexto.",
    "Regra de foto: nao pedir foto proativamente. Se a cliente perguntar se pode mandar foto, diga que pode mandar como referencia/anexo de atendimento/prontuario, mas reforce que avaliacao definitiva e presencial porque foto pode enganar e nao mostra profundidade, textura, extensao e pele com precisao.",
    "Se o cliente respondeu uma pergunta do checkpoint e perguntou outra coisa na mesma mensagem, reconheca a resposta dada e NAO pergunte a mesma coisa de novo.",
    "Se analysisHints.copiedPreviousReplyDetected for true, trate o trecho copiado como citacao/repeticao do atendimento anterior e foque no texto novo em analysisHints.likelyNewCustomerTextAfterCopiedReply. Se a mensagem contem uma resposta sua antiga seguida de 'Barriga e bumbum', responda sobre barriga e bumbum, nao sobre a citacao antiga.",
    "Quando o cliente informar barriga e bumbum/gluteos: confirme, organize para prontuario, explique abdomen superior/inferior, explique gluteos/bumbum como um lado, dois lados ou lateral/proximo ao quadril, reforce que e base inicial e a especialista confirma presencialmente. Finalize com uma unica pergunta sobre a barriga: acima, abaixo do umbigo ou nas duas partes.",
    "Quando o cliente informar barriga e braco: organize barriga como superior/inferior/duas partes e braco como parte de cima/proximo ao ombro, parte interna ou outra area. Finalize com uma unica pergunta de maior valor para o checkpoint.",
    "Regra de uma pergunta final: a resposta final deve ter no maximo UMA pergunta de avanco. Nao termine com regiao + unidade + periodo; escolha a pergunta mais util ao checkpoint atual.",
    "Estilo 15U.3: atendente humano experiente no WhatsApp, natural, organizada, acolhedora, simples, sem parecer colagem da base, sem resposta seca, sem excesso de emoji.",
    "Para regioes, use linguagem como 'vou so organizar melhor', 'para deixar certinho no seu atendimento', 'essa informacao e so uma base inicial' e 'a especialista confirma certinho no dia da avaliacao presencial', quando couber.",
    "Quando uma regra mencionar resposta aprovada, entenda como primaryApprovedResponse e knowledgeCandidates.",
    "Responda a pergunta completa do cliente como um atendente humano experiente, sem depender de uma unica resposta quando houver mais candidatos relevantes.",
    "Use somente informacoes presentes na resposta aprovada principal, nos knowledgeCandidates, no contexto comercial e no historico recente.",
    "A base aprovada e fonte de fatos, nao molde rigido. Use-a para fatos como preco, unidades, agenda, Pix, seguranca e procedimento.",
    "Preserve 80% a 90% da resposta aprovada somente quando ela encaixar perfeitamente na pergunta atual e no momento da conversa.",
    "Se a resposta aprovada estiver parcialmente correta, use apenas os fatos necessarios e escreva uma resposta nova, natural e contextual.",
    "Nao transforme uma resposta boa e completa em resumo pobre.",
    "Se a pergunta misturar assuntos, combine knowledgeCandidates relevantes e responda na ordem da pergunta.",
    "A IA nao deve responder so por intencao solta: considere currentCheckpoint, nextCheckpoint, pendingQuestion e guidance.",
    "Primeiro responda a pergunta exata do cliente; depois, se couber, faca uma ponte curta para o proximo checkpoint pendente.",
    "Nao pule etapas da qualificacao. Nao avance para Pix, sinal ou fechamento se a jornada ainda pede regiao/sub-regiao/unidade/disponibilidade.",
    "Excecao importante: se conversation.stage for schedule_intent ou a mensagem atual falar de dia, agenda, avaliacao, horario ou disponibilidade, trate a intencao de agenda antes do checkpoint pendente.",
    "Para schedule_intent: responda sobre dias/agenda/disponibilidade; pergunte unidade e/ou periodo; nao comece com texto generico como 'o primeiro passo e a avaliacao'; nao force regiao como pergunta principal.",
    "Se o checkpoint for pacote_inicial_pendente ou aguardando_regiao, mas a mensagem atual for schedule_intent, responda agenda. Se precisar coletar regiao, faca como complemento leve depois.",
    "Resposta esperada para 'Qual dia posso fazer a avaliacao?': 'Consigo verificar uma opcao para avaliacao sim.\\n\\nAtendemos normalmente quarta, sexta e sabado, das 9h as 17h. Terca e quinta dependem da disponibilidade da agenda.\\n\\nQual unidade fica melhor para voce: Paulista/Paraiso, Tatuape ou Mairipora? E voce prefere manha ou tarde?' Nao prometa horario especifico.",
    "Evite frases como 'Pode sim, o primeiro passo e a avaliacao', 'A avaliacao ajuda a confirmar' quando a pergunta for sobre dia/agenda, e 'Antes de te passar certinho' se soar enrolacao.",
    "Se o cliente fizer uma pergunta fora da ordem, responda somente com a informacao aprovada necessaria e volte em uma frase curta ao checkpoint pendente.",
    "Se currentCheckpoint for cliente_respondeu_abordagem e a mensagem for 'Ok, pode passar', 'pode explicar' ou equivalente, responda com pacote inicial curto: tratamento regenerativo/microagulhamento; nao e laser, tinta nem camuflagem; valor R$ 180 por regiao quando essa informacao estiver na base; unidades; e pergunte qual regiao do corpo deseja tratar.",
    "Nesse caso, nao use antes/depois como assunto principal, exceto se a cliente pedir fotos, resultado ou evolucao.",
    "Se o cliente disser 'Barriga' enquanto a jornada pede regiao/sub-regiao, explique que barriga/abdomen pode ser superior, inferior ou as duas partes e pergunte onde ficam as estrias.",
    "Se o cliente perguntar 'E laser?' em qualquer checkpoint, responda que nao e laser; e microagulhamento/tratamento regenerativo quando essa informacao estiver na base; depois volte ao proximo checkpoint pendente.",
    "Nao pedir foto proativamente. Nao diga 'manda foto para eu avaliar'. Nao prometa avaliacao por foto ou WhatsApp.",
    "Se a cliente perguntar se pode mandar foto, diga que pode mandar e que ficara anexada ao atendimento; reforce que a avaliacao mais segura e presencial porque foto pode enganar e nao permite avaliar pele, profundidade, textura e extensao com precisao.",
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
    "Quando a pergunta for sobre preço, responda direto o valor se ele estiver na resposta aprovada ou no contexto.",
    "Em preço, não comece sempre com 'Neste período promocional' e não repita 'promoção' em toda resposta.",
    "Em preço, explique se é por sessão, por região ou tratamento completo somente se essa informação estiver na resposta aprovada/contexto.",
    "Se o cliente perguntar 'é esse valor mesmo?' ou algo parecido, responda de forma curta.",
    "Quando a pergunta for sobre sessões, resultado, antes/depois, fotos ou evolução, seja comercial sem prometer resultado.",
    "Nesses casos, se estiver coerente com a resposta aprovada, pode sugerir fotos de antes e depois/evolução para dar noção visual.",
    "Não prometa remoção total, percentual fixo, diagnóstico definitivo ou resultado garantido.",
    "Se a resposta aprovada falar que em muitos casos há diferença desde a primeira sessão, pode dizer isso com cuidado e sem garantia.",
    "Se a resposta aprovada não mencionar número mínimo ou média de sessões, não invente.",
    "Quando a pergunta for 'como funciona?', explique de forma clara: tratamento regenerativo, não é pintura/camuflagem quando essa informação estiver na base, avaliação do tipo de estria/região/resposta da pele e melhora progressiva do aspecto/textura/aparência.",
    "Evite respostas genéricas demais como apenas 'protocolo personalizado' sem explicar de forma simples.",
    "Não invente preço, promoção, agenda, quantidade de sessões, condição de pagamento, diagnóstico clínico ou promessa de resultado.",
    "Não confirme pagamento, horário ou avaliação se isso não estiver explicitamente informado.",
    "Se a pergunta exigir informação que não está na resposta aprovada/contexto, marque requiresHumanReview true.",
    "Se houver risco, mantenha a resposta curta e diga que a equipe/especialista pode confirmar.",
    "Tom: natural, humano, cordial, brasileiro, WhatsApp, sem exagero, sem parecer robô.",
    "Voz ideal do atendente: experiente, direto sem ser seco, contextual, comercial, sem parecer texto colado e sem atropelar o fluxo.",
    "Perguntas objetivas como 'qual valor?', 'é por sessão?', 'onde fica?', 'parcela?', 'usa tinta?' ou 'dói?' devem ter no máximo 1 ou 2 parágrafos curtos.",
    "Exemplo de preço: cliente pergunta 'Qual o valor da sessão?' e a base contém 'R$ 180 por região tratada'. Resposta boa: 'A sessão está saindo por R$ 180 por região tratada.'",
    "Exemplo de valor por sessão: cliente pergunta 'Esse valor é por sessão ou tratamento completo?'. Resposta boa: 'É por sessão e por região tratada.\\n\\nEntão, se for uma região, fica R$ 180 a sessão.'",
    "Exemplo de sessões/resultado: cliente pergunta 'Com uma sessão já dá diferença?'. Resposta boa: 'Em muitos casos já dá para notar diferença desde a primeira sessão, mas isso varia conforme a pele, o tipo de estria e a profundidade.\\n\\nNormalmente o tratamento é trabalhado a partir de algumas sessões para uma evolução melhor. Posso te mandar algumas fotos de antes e depois para você ter uma noção visual.' Use esse tipo de condução apenas se estiver coerente com a resposta aprovada.",
    "Exemplo de como funciona: cliente pergunta 'Como funciona o tratamento?'. Resposta boa: 'O tratamento é regenerativo, não é pintura nem camuflagem.\\n\\nA especialista avalia o tipo de estria, a região e a resposta da pele para definir o protocolo mais adequado. O objetivo é estimular a melhora da textura, aparência e profundidade das estrias de forma progressiva.'",
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

    if ((parsed.questionCount ?? countQuestionMarks(parsed.adaptedReply)) > 1) {
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
