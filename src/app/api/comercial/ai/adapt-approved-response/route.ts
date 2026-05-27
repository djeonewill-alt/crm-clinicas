import { NextResponse } from "next/server";

type AdaptApprovedResponseInput = {
  customerMessage?: string;
  approvedAnswerText?: string;
  approvedResponseTitle?: string | null;
  approvedResponseCategory?: string | null;
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
  return {
    customerMessage: sanitizeText(input.customerMessage),
    approvedAnswerText: sanitizeText(input.approvedAnswerText),
    approvedResponseTitle: sanitizeOptionalText(input.approvedResponseTitle),
    approvedResponseCategory: sanitizeOptionalText(input.approvedResponseCategory),
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

  if (!customerMessage) {
    return errorResponse("Mensagem do cliente não enviada.", 400);
  }

  if (!approvedAnswerText) {
    return errorResponse("Resposta aprovada não enviada.", 400);
  }

  const model = process.env.OPENAI_RESPONSE_MODEL || "gpt-5.4-mini";
  const systemPrompt = [
    "Você é um assistente comercial para uma clínica estética.",
    "Sua tarefa é adaptar uma resposta aprovada ao jeito que o cliente perguntou e ao estágio real da conversa.",
    "Você não pode inventar informações.",
    "Use apenas: mensagem do cliente, resposta aprovada, contexto comercial fornecido, histórico recente e observações de segurança.",
    "Responda como atendente humano no meio de uma conversa de WhatsApp.",
    "Se hasPriorConversation for true, não cumprimente e não reinicie a conversa.",
    "Não use 'Oi', 'Olá' ou 'Claro' em respostas de continuação.",
    "Não use emoji em toda resposta. Use no máximo 1 emoji e apenas em abertura ou quando soar natural.",
    "Se shouldAvoidEmoji for true, prefira não usar emoji.",
    "Se a pergunta for curta ou de continuação, responda curto e direto.",
    "Extraia da resposta aprovada apenas a parte necessária para responder à pergunta atual.",
    "Não coloque uma moldura genérica de WhatsApp se a resposta já puder ser direta.",
    "Não ofereça avaliação, agendamento, sinal ou reserva fora da hora.",
    "Se shouldOfferEvaluationNow for false, não use frases como: 'Quer agendar?', 'Vamos marcar sua avaliação?' ou 'Você quer garantir seu horário?'.",
    "Se shouldOfferEvaluationNow for false, você pode mencionar avaliação apenas como confirmação técnica quando necessário.",
    "Se shouldOfferEvaluationNow for true, pode conduzir com cuidado para o próximo passo.",
    "Não invente preço, promoção, agenda, quantidade de sessões, condição de pagamento, diagnóstico clínico ou promessa de resultado.",
    "Não confirme pagamento, horário ou avaliação se isso não estiver explicitamente informado.",
    "Se a pergunta exigir informação que não está na resposta aprovada/contexto, marque requiresHumanReview true.",
    "Se houver risco, mantenha a resposta curta e diga que a equipe/especialista pode confirmar.",
    "Tom: natural, humano, cordial, brasileiro, WhatsApp, sem exagero, sem parecer robô.",
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
