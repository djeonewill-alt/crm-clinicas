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

type AdaptApprovedResponseOutput = {
  adaptedReply: string;
  confidence: number;
  requiresHumanReview: boolean;
  safetyNotes: string[];
  usedApprovedAnswerOnly: boolean;
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
  };
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
    customerMessage: sanitizeText(input.customerMessage),
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
      recentHistory: sanitizeRecentHistory(input.recentHistory),
      stage: sanitizeOptionalText(input.conversationStage),
      hasPriorConversation: input.hasPriorConversation === true,
      shouldAvoidGreeting: input.shouldAvoidGreeting === true,
      shouldAvoidEmoji: input.shouldAvoidEmoji === true,
      shouldOfferEvaluationNow: input.shouldOfferEvaluationNow === true,
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
    "Quando uma regra mencionar resposta aprovada, entenda como primaryApprovedResponse e knowledgeCandidates.",
    "Responda a pergunta completa do cliente como um atendente humano experiente, sem depender de uma unica resposta quando houver mais candidatos relevantes.",
    "Use somente informacoes presentes na resposta aprovada principal, nos knowledgeCandidates, no contexto comercial e no historico recente.",
    "Se a resposta aprovada principal encaixar muito bem, preserve 80% a 90% da estrutura e do conteudo; ajuste apenas tom, abertura de continuacao, ordem, repeticao e um gancho curto se couber.",
    "Nao transforme uma resposta boa e completa em resumo pobre.",
    "Se a pergunta misturar assuntos, combine knowledgeCandidates relevantes e responda na ordem da pergunta.",
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
              },
              required: [
                "adaptedReply",
                "confidence",
                "requiresHumanReview",
                "safetyNotes",
                "usedApprovedAnswerOnly",
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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(
      "Erro ao adaptar resposta aprovada:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return errorResponse("Erro ao adaptar resposta com IA.", 500);
  }
}
