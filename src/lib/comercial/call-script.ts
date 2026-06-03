import {
  getQualificationTimelineStateForAI,
  type QualificationTimelineStateForAI,
} from "@/lib/comercial/qualification-journey";
import { PROSPECTING_CADENCE_ACTIONS, getProspectingScript } from "@/lib/comercial/prospecting-cadence";
import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

export type LeadCallScript = {
  contextSummary: string[];
  alreadyKnown: string[];
  pendingCheckpoints: string[];
  callObjective: string;
  openingScript: string;
  essentialQuestions: string[];
  closingScript: string;
  postCallWhatsAppMessage: string;
  warnings: string[];
  timeline: QualificationTimelineStateForAI;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function historyText(history: LeadHistoryItem[]) {
  return history
    .map((item) =>
      [
        item.description,
        typeof item.metadata?.messageText === "string" ? item.metadata.messageText : "",
        typeof item.metadata?.replyText === "string" ? item.metadata.replyText : "",
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function detectUnit(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("tatuape")) return "Tatuape";
  if (
    normalized.includes("paulista") ||
    normalized.includes("paraiso") ||
    normalized.includes("brigadeiro")
  ) {
    return "Paulista/Paraiso";
  }
  if (normalized.includes("mairipora")) return "Mairipora";
  return null;
}

function detectPeriod(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("sabado")) return "sabado";
  if (normalized.includes("tarde")) return "periodo da tarde";
  if (normalized.includes("manha")) return "periodo da manha";
  if (normalized.includes("semana")) return "durante a semana";
  return null;
}

function detectCause(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("gravidez") || normalized.includes("gestacao")) {
    return "gravidez";
  }
  if (normalized.includes("emagreci") || normalized.includes("emagrecimento")) {
    return "emagrecimento";
  }
  return null;
}

function getSubregionQuestion(regions: string[]) {
  if (regions.includes("abdomen")) {
    return "Na barriga, fica mais acima do umbigo, abaixo ou nas duas partes?";
  }
  if (regions.includes("coxas")) {
    return "Nas coxas, fica mais na parte interna, externa, frente ou atras?";
  }
  if (regions.includes("gluteos")) {
    return "Nos gluteos, fica em um lado, nos dois ou mais na lateral proxima ao quadril?";
  }
  if (regions.includes("bracos")) {
    return "Nos bracos, fica mais na parte interna, proximo ao ombro ou em outra area?";
  }
  if (regions.includes("costas")) {
    return "Nas costas, fica mais na parte superior, inferior ou laterais?";
  }
  if (regions.includes("ombros")) {
    return "Nos ombros, fica em um ombro ou nos dois? Pega peitoral, costas ou braco?";
  }
  if (regions.includes("peitoral")) {
    return "No peitoral, aparece de um lado ou dos dois?";
  }

  return "Em qual parte dessa regiao ficam mais as estrias?";
}

function getAgendaQuestion(unit: string | null, period: string | null) {
  if (period === "sabado") {
    return "Para sabado eu preciso verificar manualmente quais horarios e unidades estao disponiveis.";
  }
  if (unit === "Tatuape") {
    return "Para Tatuape a tarde, temos quarta e sexta, das 15h as 18h. Qual fica melhor para voces?";
  }
  if (unit === "Paulista/Paraiso") {
    return "Para Paulista/Paraiso pela manha, temos quarta e sexta, das 09h as 12h. Qual fica melhor?";
  }
  if (unit === "Mairipora") {
    return "Em Mairipora, o atendimento acontece as segundas. Tem algum horario melhor para eu verificar?";
  }

  return "Qual unidade fica melhor e voces preferem semana ou sabado, manha ou tarde?";
}

function getCheckpointLabel(key: string) {
  const labels: Record<string, string> = {
    entrada: "entrada",
    funcionamento: "funcionamento",
    valor: "valor",
    regiao: "regiao",
    subregiao: "sub-regiao",
    unidade: "unidade",
    agenda: "agenda",
    sinal: "sinal/reserva",
    confirmacao: "confirmacao",
  };

  return labels[key] ?? key;
}

function buildObjective(nextKey: string | undefined) {
  switch (nextKey) {
    case "funcionamento":
    case "entrada":
      return "Confirmar interesse e explicar rapidamente o tratamento.";
    case "regiao":
      return "Descobrir a regiao do corpo.";
    case "subregiao":
      return "Detalhar a regiao para organizar o atendimento.";
    case "valor":
      return "Explicar valores antes de avancar para reserva.";
    case "unidade":
      return "Escolher a unidade de atendimento.";
    case "agenda":
      return "Definir dia ou periodo de atendimento.";
    case "sinal":
      return "Orientar reserva somente se valor, unidade e agenda ja estiverem alinhados.";
    case "confirmacao":
      return "Confirmar dados finais do agendamento.";
    default:
      return "Entender a pendencia principal e conduzir para o proximo passo.";
  }
}

function buildQuestions(input: {
  nextKey?: string;
  regions: string[];
  unit: string | null;
  period: string | null;
}) {
  const { nextKey, regions, unit, period } = input;

  switch (nextKey) {
    case "entrada":
    case "funcionamento":
      return [
        "Voce viu nossa mensagem sobre o tratamento?",
        "E para qual regiao do corpo?",
        "Posso te explicar rapidinho como funciona?",
      ];
    case "regiao":
      return [
        "Qual regiao voce gostaria de tratar? Barriga, flancos, gluteos, coxas, bracos, costas, ombros, peitoral ou outra?",
      ];
    case "subregiao":
      return [getSubregionQuestion(regions)];
    case "valor":
      return [
        "Antes de falarmos de reserva, posso te explicar rapidinho como funcionam os valores e regioes?",
        "1 regiao e R$ 377. Quando e bilateral, inclui os dois lados. Abdomen total, superior + inferior, e R$ 550.",
      ];
    case "unidade":
      return ["Qual unidade fica melhor: Paulista/Paraiso, Tatuape ou Mairipora?"];
    case "agenda":
      return [getAgendaQuestion(unit, period)];
    case "sinal":
      return ["Esse dia e horario funcionam para voce?"];
    case "confirmacao":
      return ["So confirmando: unidade, dia, horario e nome de quem sera avaliada."];
    default:
      return ["O que ficou faltando para voce seguir com o atendimento?"];
  }
}

function buildPostCallMessage(input: {
  nextKey?: string;
  unit: string | null;
  period: string | null;
}) {
  const { nextKey, unit, period } = input;

  if (nextKey === "agenda") {
    if (unit === "Tatuape") {
      return "Conforme conversamos, para Tatuape no periodo da tarde temos quarta e sexta, das 15h as 18h. Me confirma qual dia fica melhor para voces?";
    }
    if (unit === "Paulista/Paraiso") {
      return "Conforme conversamos, para Paulista/Paraiso no periodo da manha temos quarta e sexta, das 09h as 12h. Me confirma qual dia fica melhor?";
    }
    if (unit === "Mairipora") {
      return "Conforme conversamos, em Mairipora o atendimento acontece as segundas. Me fala qual horario fica melhor para eu verificar?";
    }
    if (period === "sabado") {
      return "Conforme conversamos, para sabado eu preciso verificar manualmente as opcoes disponiveis e te retorno por aqui.";
    }
  }

  if (nextKey === "valor") {
    return "Conforme conversamos, antes de avancar para reserva eu te explico por aqui os valores e a divisao das regioes para ficar tudo claro.";
  }

  return (
    getProspectingScript(
      PROSPECTING_CADENCE_ACTIONS.find((action) => action.key === "d2_post_call_message")
    ) ||
    "Oi, tudo bem? Tentei te ligar rapidinho para te orientar sobre o tratamento de estrias e tirar suas duvidas. Quando puder, me responde por aqui que eu te ajudo a seguir."
  );
}

export function buildLeadCallScript(input: {
  lead: Lead;
  history: LeadHistoryItem[];
}) {
  const { lead, history } = input;
  const text = historyText(history);
  const timeline = getQualificationTimelineStateForAI({
    lead,
    recentHistory: history,
  });
  const nextKey = timeline.nextBestKey ?? timeline.currentKey;
  const regions = timeline.detectedRegions ?? [];
  const regionLabels = timeline.detectedRegionLabels ?? [];
  const subregions = timeline.detectedSubregions ?? [];
  const unit = detectUnit(text);
  const period = detectPeriod(text);
  const cause = detectCause(text);
  const alreadyKnown = [
    regionLabels.length ? `Regiao informada: ${regionLabels.join(", ")}.` : "",
    subregions.length ? `Sub-regiao/detalhes: ${subregions.join(", ")}.` : "",
    cause ? `Causa informada: ${cause}.` : "",
    unit ? `Unidade escolhida: ${unit}.` : "",
    period ? `Preferencia: ${period}.` : "",
  ].filter(Boolean);
  const pendingCheckpoints = timeline.pendingKeys.map((key) =>
    titleCase(getCheckpointLabel(key))
  );
  const warnings = [
    !timeline.doneKeys.includes("valor") ? "Valor ainda nao explicado." : "",
    !timeline.doneKeys.includes("agenda") ? "Agenda ainda sem dia/horario escolhido." : "",
    "Nao falar Pix/sinal antes de valor, unidade e agenda estarem alinhados.",
  ].filter(Boolean);

  return {
    contextSummary: [
      lead.nome?.trim() ? `Lead: ${lead.nome.trim()}.` : "Lead sem nome informado.",
      lead.tel ? `Telefone: ${lead.tel}.` : "Telefone nao informado.",
      `Funil atual: ${lead.funnel}${lead.diaProsp ? ` / ${lead.diaProsp}` : ""}.`,
      text ? "Verifique o historico recente antes de ligar." : "Sem historico recente carregado.",
    ],
    alreadyKnown: alreadyKnown.length ? alreadyKnown : ["Poucos dados detectados no historico."],
    pendingCheckpoints,
    callObjective: buildObjective(nextKey),
    openingScript:
      "Oi, tudo bem? Aqui e do atendimento do Sr. e Sra. Estrias. Te liguei rapidinho para te orientar e deixar o proximo passo mais claro.",
    essentialQuestions: buildQuestions({
      nextKey,
      regions,
      unit,
      period,
    }).slice(0, 5),
    closingScript:
      "Vou deixar isso registrado no seu atendimento e te mando uma mensagem por WhatsApp para voce ter tudo por escrito.",
    postCallWhatsAppMessage: buildPostCallMessage({
      nextKey,
      unit,
      period,
    }),
    warnings,
    timeline,
  } satisfies LeadCallScript;
}
