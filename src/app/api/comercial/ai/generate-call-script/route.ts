import { NextResponse } from "next/server";

type RecentHistoryInput = {
  type?: string | null;
  title?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

type GenerateCallScriptInput = {
  lead?: {
    id?: string | number | null;
    nome?: string | null;
    telefone?: string | null;
    funnel?: string | null;
    diaProsp?: string | null;
    campanha?: string | null;
  } | null;
  journeyContext?: {
    currentCheckpoint?: string | null;
    currentLabel?: string | null;
    nextCheckpoint?: string | null;
    nextLabel?: string | null;
    pendingQuestion?: string | null;
    knownFields?: Record<string, unknown> | null;
    guidance?: string | null;
  } | null;
  recentHistory?: RecentHistoryInput[];
  commercialContext?: {
    name?: string | null;
    audienceLabel?: string | null;
    campaignLabel?: string | null;
  } | null;
};

type GenerateCallScriptOutput = {
  callScript: {
    objective: string;
    opening: string;
    keyQuestions: string[];
    whatToRegister: string[];
    nextStepIfPositive: string;
    ifClientCannotTalk: string;
    safetyNotes: string[];
  };
  checkpointUsed: string;
  confidence: number;
  requiresHumanReview: boolean;
};

const MAX_TEXT_LENGTH = 4000;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeOptionalText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  const text = sanitizeText(value, maxLength);
  return text || null;
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const safeMetadata: Record<string, unknown> = {};

  for (const key of [
    "event",
    "source",
    "callResult",
    "materialType",
    "attachmentType",
    "suggestedFunnel",
  ]) {
    const item = record[key];
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    ) {
      safeMetadata[key] = item;
    }
  }

  return Object.keys(safeMetadata).length ? safeMetadata : null;
}

function sanitizeRecentHistory(value: unknown): RecentHistoryInput[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 15).map((item) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};

    return {
      type: sanitizeOptionalText(record.type, 80),
      title: sanitizeOptionalText(record.title, 180),
      description: sanitizeOptionalText(record.description, 700),
      metadata: sanitizeMetadata(record.metadata),
      createdAt: sanitizeOptionalText(record.createdAt, 80),
    };
  });
}

function sanitizeKnownFields(value: unknown) {
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

function sanitizeInput(input: GenerateCallScriptInput) {
  const lead = input.lead ?? {};
  const journeyContext = input.journeyContext ?? {};
  const commercialContext = input.commercialContext ?? {};

  return {
    lead: {
      id:
        typeof lead.id === "string" || typeof lead.id === "number"
          ? String(lead.id).slice(0, 80)
          : null,
      nome: sanitizeOptionalText(lead.nome, 120),
      telefone: sanitizeOptionalText(lead.telefone, 80),
      funnel: sanitizeOptionalText(lead.funnel, 80),
      diaProsp: sanitizeOptionalText(lead.diaProsp, 80),
      campanha: sanitizeOptionalText(lead.campanha, 180),
    },
    journeyContext: {
      currentCheckpoint: sanitizeOptionalText(
        journeyContext.currentCheckpoint,
        120
      ),
      currentLabel: sanitizeOptionalText(journeyContext.currentLabel, 180),
      nextCheckpoint: sanitizeOptionalText(journeyContext.nextCheckpoint, 120),
      nextLabel: sanitizeOptionalText(journeyContext.nextLabel, 180),
      pendingQuestion: sanitizeOptionalText(journeyContext.pendingQuestion, 300),
      knownFields: sanitizeKnownFields(journeyContext.knownFields),
      guidance: sanitizeOptionalText(journeyContext.guidance, 500),
    },
    recentHistory: sanitizeRecentHistory(input.recentHistory),
    commercialContext: {
      name: sanitizeOptionalText(commercialContext.name, 160),
      audienceLabel: sanitizeOptionalText(commercialContext.audienceLabel, 160),
      campaignLabel: sanitizeOptionalText(commercialContext.campaignLabel, 160),
    },
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

function normalizeStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6);
}

function normalizeOutput(value: unknown): GenerateCallScriptOutput | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const callScript =
    record.callScript && typeof record.callScript === "object"
      ? (record.callScript as Record<string, unknown>)
      : null;

  if (!callScript) return null;

  const output: GenerateCallScriptOutput = {
    callScript: {
      objective: sanitizeText(callScript.objective, 700),
      opening: sanitizeText(callScript.opening, 700),
      keyQuestions: normalizeStringArray(callScript.keyQuestions),
      whatToRegister: normalizeStringArray(callScript.whatToRegister),
      nextStepIfPositive: sanitizeText(callScript.nextStepIfPositive, 700),
      ifClientCannotTalk: sanitizeText(callScript.ifClientCannotTalk, 700),
      safetyNotes: normalizeStringArray(callScript.safetyNotes),
    },
    checkpointUsed: sanitizeText(record.checkpointUsed, 120),
    confidence: Number(record.confidence),
    requiresHumanReview: record.requiresHumanReview === true,
  };

  if (!output.callScript.objective || !output.callScript.opening) return null;
  if (!Number.isFinite(output.confidence)) output.confidence = 0.7;
  output.confidence = Math.max(0, Math.min(1, output.confidence));

  return output;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return errorResponse("OPENAI_API_KEY não configurada.", 500);
  }

  let input: GenerateCallScriptInput;

  try {
    input = (await request.json()) as GenerateCallScriptInput;
  } catch {
    return errorResponse("JSON inválido.", 400);
  }

  const payload = sanitizeInput(input);
  const model = process.env.OPENAI_RESPONSE_MODEL || "gpt-5.4-mini";
  const systemPrompt = [
    "Gere um roteiro curto de ligacao para um atendente humano de uma clinica estetica.",
    "Nao escreva mensagem de WhatsApp. Escreva orientacao de fala para chamada telefonica.",
    "Use o checkpoint atual da jornada como guia principal.",
    "Use o historico recente para nao perguntar o que a cliente ja respondeu.",
    "Se faltar informacao, transforme em pergunta essencial para coletar na ligacao.",
    "Seja pratico, curto e objetivo. A ligacao deve ter proposito e nao ser longa demais.",
    "Nao criar diagnostico clinico. Nao prometer resultado. Nao pedir foto.",
    "Nao confirmar agenda, Pix, sinal, pagamento, horario ou disponibilidade se isso nao estiver claro no historico.",
    "Nao inventar preco, horario, agenda, disponibilidade, condicao de pagamento ou resultado.",
    "Checkpoint aguardando_regiao: objetivo e descobrir qual regiao do corpo a cliente deseja tratar. Abertura exemplo: 'Oi, tudo bem? Aqui é da clínica. Estou te ligando rapidinho só para entender melhor qual região você quer tratar e te orientar certinho.' Perguntas: 'Você quer tratar estrias em qual região do corpo?', 'É barriga, flancos, glúteos, coxas, seios, costas ou outra região?', 'Fica mais concentrado em uma parte ou espalhado?'. Registrar: regiao, se ha mais de uma regiao, se quer comecar por uma ou tratar todas.",
    "Checkpoint aguardando_sinal: objetivo e confirmar se a cliente vai manter a reserva do horario. Abertura exemplo: 'Oi, tudo bem? Estou passando rapidinho só para confirmar se você conseguiu ver a questão do sinal para mantermos seu horário reservado.' Perguntas: 'Esse horário ainda fica bom para você?', 'Você conseguiu fazer o Pix?', 'Quer que eu te reenvie a chave?'. Registrar: sinal pago ou pendente, comprovante recebido ou nao, se precisa cobrar depois ou remarcar.",
    "Retorne apenas JSON valido no schema solicitado.",
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
            content: JSON.stringify(payload),
          },
        ],
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "commercial_call_script",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                callScript: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    objective: { type: "string" },
                    opening: { type: "string" },
                    keyQuestions: {
                      type: "array",
                      items: { type: "string" },
                    },
                    whatToRegister: {
                      type: "array",
                      items: { type: "string" },
                    },
                    nextStepIfPositive: { type: "string" },
                    ifClientCannotTalk: { type: "string" },
                    safetyNotes: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "objective",
                    "opening",
                    "keyQuestions",
                    "whatToRegister",
                    "nextStepIfPositive",
                    "ifClientCannotTalk",
                    "safetyNotes",
                  ],
                },
                checkpointUsed: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                requiresHumanReview: { type: "boolean" },
              },
              required: [
                "callScript",
                "checkpointUsed",
                "confidence",
                "requiresHumanReview",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Erro ao gerar roteiro de ligação:", {
        status: response.status,
        body: errorText.slice(0, 300),
      });
      return errorResponse("Erro ao gerar roteiro de ligação.", 500);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const outputText = extractResponseText(data);
    const parsed = normalizeOutput(JSON.parse(outputText));

    if (!parsed) {
      return errorResponse("Resposta inválida da IA.", 500);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Erro inesperado ao gerar roteiro de ligação:", error);
    return errorResponse("Erro inesperado ao gerar roteiro de ligação.", 500);
  }
}
