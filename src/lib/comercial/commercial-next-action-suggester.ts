import {
  normalizeCommercialSearchText,
  type CommercialResponseMatch,
} from "@/lib/comercial/commercial-response-matcher";

export type CommercialSuggestedFunnel =
  | "prospeccao"
  | "qualificacao"
  | "retorno"
  | "clientes"
  | "keep_current";

export type CommercialSuggestedActionType =
  | "send_opening"
  | "answer_question"
  | "ask_unit_preference"
  | "ask_schedule_preference"
  | "offer_evaluation"
  | "create_follow_up"
  | "human_review"
  | "confirm_payment_manually"
  | "do_not_auto_reply"
  | "keep_nurturing"
  | "disqualify"
  | "none";

export type CommercialNextActionSuggestion = {
  actionType: CommercialSuggestedActionType;
  title: string;
  description: string;
  suggestedFunnel: CommercialSuggestedFunnel;
  shouldMoveFunnel: boolean;
  requiresHuman: boolean;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
};

type SuggestCommercialNextActionInput = {
  message: string;
  bestMatch: CommercialResponseMatch | null;
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeCommercialSearchText(term)));
}

function createSuggestion(
  suggestion: CommercialNextActionSuggestion
): CommercialNextActionSuggestion {
  return suggestion;
}

export function suggestCommercialNextAction({
  message,
  bestMatch,
}: SuggestCommercialNextActionInput): CommercialNextActionSuggestion {
  const normalizedMessage = normalizeCommercialSearchText(message);
  const categorySlug = bestMatch?.categorySlug ?? null;
  const response = bestMatch?.response ?? null;
  const responseTags = normalizeCommercialSearchText(response?.tags.join(" ") ?? "");
  const responseTitle = normalizeCommercialSearchText(response?.title ?? "");
  const requiresHuman = response?.requiresHuman === true;
  const baseReasons = bestMatch
    ? [`Resposta aprovada encontrada: ${bestMatch.response.title}.`]
    : ["Nenhuma resposta aprovada encontrada para a mensagem."];

  if (!bestMatch) {
    return createSuggestion({
      actionType: "human_review",
      title: "Revisar manualmente",
      description: "Nenhuma resposta aprovada encontrada para a mensagem.",
      suggestedFunnel: "keep_current",
      shouldMoveFunnel: false,
      requiresHuman: true,
      riskLevel: "medium",
      reasons: baseReasons,
    });
  }

  if (
    includesAny(normalizedMessage, [
      "tenho interesse",
      "quero mais informacoes",
      "mais informacoes",
      "informacoes",
      "vi o anuncio",
    ]) &&
    (!categorySlug || categorySlug === "primeira-abordagem")
  ) {
    return createSuggestion({
      actionType: "send_opening",
      title: "Enviar mensagem de abertura",
      description: "Responder com abertura comercial e iniciar a conversa.",
      suggestedFunnel: "prospeccao",
      shouldMoveFunnel: false,
      requiresHuman: false,
      riskLevel: "low",
      reasons: [...baseReasons, "Mensagem parece ser contato inicial."],
    });
  }

  if (
    [
      "gestante-pos-parto",
      "menor-responsavel-legal",
      "profissional-certificacoes",
      "caso-sensivel-revisao-humana",
    ].includes(categorySlug ?? "") ||
    (categorySlug === "flacidez" && requiresHuman) ||
    (categorySlug === "avaliacao-por-foto" &&
      includesAny(normalizedMessage, ["regiao intima", "virilha", "seios", "foto intima"]))
  ) {
    return createSuggestion({
      actionType: "human_review",
      title: "Revisar caso sensível",
      description: "Caso sensível. Revisar antes de responder ou avançar.",
      suggestedFunnel: "qualificacao",
      shouldMoveFunnel: false,
      requiresHuman: true,
      riskLevel: "high",
      reasons: [...baseReasons, "Categoria exige cuidado humano."],
    });
  }

  if (
    [
      "reserva-sinal",
      "pagamento-pix-cartao",
      "promocao-validade",
      "follow-up-pagamento",
    ].includes(categorySlug ?? "") ||
    includesAny(responseTags, ["pix", "pagamento", "sinal", "reserva"])
  ) {
    return createSuggestion({
      actionType:
        categorySlug === "follow-up-pagamento"
          ? "create_follow_up"
          : "confirm_payment_manually",
      title: "Conferir pagamento manualmente",
      description: "Não confirmar pagamento automaticamente. Conferir manualmente.",
      suggestedFunnel: "retorno",
      shouldMoveFunnel: true,
      requiresHuman: true,
      riskLevel: "high",
      reasons: [...baseReasons, "Pagamento, Pix ou reserva exigem conferência manual."],
    });
  }

  if (
    [
      "agendamento-disponibilidade",
      "horario-indisponivel-alternativa",
      "confirmacao-horario",
    ].includes(categorySlug ?? "")
  ) {
    return createSuggestion({
      actionType: "ask_schedule_preference",
      title: "Verificar agenda manualmente",
      description: "Verificar agenda manualmente antes de confirmar horário.",
      suggestedFunnel: "retorno",
      shouldMoveFunnel: true,
      requiresHuman: true,
      riskLevel: "medium",
      reasons: [...baseReasons, "Agenda real não deve ser confirmada automaticamente."],
    });
  }

  if (["localizacao-unidades", "endereco-como-chegar"].includes(categorySlug ?? "")) {
    return createSuggestion({
      actionType: "ask_unit_preference",
      title: "Perguntar unidade de preferência",
      description: "Responder localização e perguntar qual unidade fica melhor.",
      suggestedFunnel: "qualificacao",
      shouldMoveFunnel: true,
      requiresHuman,
      riskLevel: requiresHuman ? "medium" : "low",
      reasons: [...baseReasons, "Cliente demonstrou interesse em localização."],
    });
  }

  if (
    ["resultados-antes-depois", "quantidade-sessoes", "flacidez"].includes(
      categorySlug ?? ""
    )
  ) {
    return createSuggestion({
      actionType: requiresHuman ? "human_review" : "answer_question",
      title: "Responder sem prometer resultado",
      description: "Evitar promessa de resultado. Conduzir para avaliação.",
      suggestedFunnel: "qualificacao",
      shouldMoveFunnel: true,
      requiresHuman: true,
      riskLevel: categorySlug === "flacidez" ? "high" : "medium",
      reasons: [...baseReasons, "Tema envolve expectativa de resultado."],
    });
  }

  if (
    [
      "preco-promocao",
      "como-funciona-tratamento",
      "pigmentacao-nao-usa-tinta",
      "produto-serum-utilizado",
      "tipos-de-estrias",
      "regioes-corpo",
    ].includes(categorySlug ?? "") ||
    includesAny(responseTitle, ["valor", "preco", "como funciona"])
  ) {
    return createSuggestion({
      actionType: "answer_question",
      title: "Responder dúvida e qualificar",
      description: "Responder dúvida e manter condução para avaliação.",
      suggestedFunnel: "qualificacao",
      shouldMoveFunnel: true,
      requiresHuman,
      riskLevel: requiresHuman ? "medium" : "low",
      reasons: [...baseReasons, "Mensagem contém dúvida comercial qualificável."],
    });
  }

  return createSuggestion({
    actionType: "keep_nurturing",
    title: "Manter condução comercial",
    description: "Responder com a resposta aprovada e continuar nutrindo o lead.",
    suggestedFunnel: "keep_current",
    shouldMoveFunnel: false,
    requiresHuman,
    riskLevel: requiresHuman ? "medium" : "low",
    reasons: baseReasons,
  });
}
