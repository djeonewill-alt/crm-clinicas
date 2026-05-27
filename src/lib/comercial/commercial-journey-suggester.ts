import type { Lead, Tentativa } from "@/types/lead";

export type CommercialJourneySuggestionType =
  | "send_message"
  | "make_call"
  | "wait_customer"
  | "move_to_qualificacao"
  | "schedule_return"
  | "move_to_next_day"
  | "move_to_recovery"
  | "follow_up_return"
  | "close_client"
  | "manual_review";

export type CommercialJourneySuggestion = {
  type: CommercialJourneySuggestionType;
  title: string;
  description: string;
  recommendedFunnel?:
    | "prospeccao"
    | "qualificacao"
    | "retorno"
    | "clientes"
    | "arquivados"
    | null;
  actionLabel?: string;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
};

function todayInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();

  return new Date(now.getTime() - timezoneOffset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function hasResult(tentativa: Tentativa) {
  return Boolean(tentativa.resultado?.trim());
}

function getAttemptStats(tentativas: Tentativa[] = []) {
  const total = tentativas.length;
  const completed = tentativas.filter(hasResult).length;
  const nextPending = tentativas.find((tentativa) => !hasResult(tentativa));
  const hasPendingMessage = tentativas.some(
    (tentativa) => tentativa.tipo === "mensagem" && !hasResult(tentativa)
  );
  const hasPendingCall = tentativas.some(
    (tentativa) => tentativa.tipo === "ligacao" && !hasResult(tentativa)
  );

  return {
    total,
    completed,
    isComplete: total > 0 && completed >= total,
    nextPending,
    hasPendingMessage,
    hasPendingCall,
  };
}

function createSuggestion(
  suggestion: CommercialJourneySuggestion
): CommercialJourneySuggestion {
  return suggestion;
}

export function suggestCommercialJourneyNextStep(input: {
  lead: Lead;
  tentativas?: Tentativa[];
}): CommercialJourneySuggestion {
  const { lead } = input;
  const tentativas = input.tentativas ?? lead.tentativas ?? [];
  const stats = getAttemptStats(tentativas);
  const diaProsp = lead.diaProsp?.toLowerCase() ?? "";

  if (lead.funnel === "prospeccao") {
    if (stats.isComplete && ["d3", "d4", "d5"].includes(diaProsp)) {
      return createSuggestion({
        type: "move_to_recovery",
        title: "Enviar para recuperacao futura",
        description:
          "O lead recebeu as tentativas previstas e nao respondeu. Arquive como recuperacao futura para reaproveitar em campanhas posteriores.",
        recommendedFunnel: "arquivados",
        actionLabel: "Enviar para recuperacao futura",
        riskLevel: "medium",
        reasons: [
          "Tentativas da etapa concluidas.",
          "Lead sem resposta apos cadencia.",
          "Pode ser reativado em campanha futura.",
        ],
      });
    }

    if (stats.completed === 0) {
      return createSuggestion({
        type: "send_message",
        title: "Enviar primeira mensagem",
        description:
          "O lead ainda nao recebeu uma tentativa nesta etapa. Comece enviando a mensagem inicial pelo WhatsApp.",
        recommendedFunnel: null,
        actionLabel: "Enviar mensagem",
        riskLevel: "low",
        reasons: ["Nenhuma tentativa concluida nesta etapa."],
      });
    }

    if (stats.hasPendingCall && !stats.hasPendingMessage) {
      return createSuggestion({
        type: "make_call",
        title: "Fazer ligacao de acompanhamento",
        description:
          "A mensagem ja foi enviada. Se o cliente nao respondeu, a proxima acao recomendada e tentar ligacao.",
        recommendedFunnel: null,
        actionLabel: "Registrar ligacao",
        riskLevel: "low",
        reasons: [
          "Ja existe tentativa de mensagem concluida.",
          "Ainda ha ligacao pendente nesta etapa.",
        ],
      });
    }

    if (stats.isComplete) {
      return createSuggestion({
        type: "move_to_next_day",
        title: "Tentativas do dia concluidas",
        description:
          "As tentativas desta etapa foram concluidas. Avalie avancar para o proximo dia da cadencia ou agendar retorno.",
        recommendedFunnel: null,
        actionLabel: "Avaliar proximo dia",
        riskLevel: "medium",
        reasons: ["Todas as tentativas da etapa estao concluidas."],
      });
    }

    return createSuggestion({
      type: stats.nextPending?.tipo === "ligacao" ? "make_call" : "send_message",
      title:
        stats.nextPending?.tipo === "ligacao"
          ? "Fazer proxima ligacao"
          : "Enviar proxima mensagem",
      description:
        "Ainda existe tentativa pendente nesta etapa. Conclua a proxima acao antes de avancar a cadencia.",
      recommendedFunnel: null,
      riskLevel: "low",
      reasons: ["Ha tentativa pendente nesta etapa."],
    });
  }

  if (lead.funnel === "qualificacao") {
    if (!stats.isComplete && stats.nextPending?.tipo === "ligacao") {
      return createSuggestion({
        type: "make_call",
        title: "Ligar para qualificar",
        description:
          "O lead demonstrou interesse. Uma ligacao pode ajudar a destravar o agendamento.",
        recommendedFunnel: null,
        actionLabel: "Registrar ligacao",
        riskLevel: "low",
        reasons: ["Proxima tentativa pendente e uma ligacao."],
      });
    }

    if (!stats.isComplete) {
      return createSuggestion({
        type: "send_message",
        title: "Responder e conduzir",
        description:
          "Continue a qualificacao respondendo a duvida principal e conduzindo para agendamento ou sinal.",
        recommendedFunnel: null,
        actionLabel: "Enviar resposta",
        riskLevel: "low",
        reasons: ["Ainda ha tentativa pendente na qualificacao."],
      });
    }

    return createSuggestion({
      type: "schedule_return",
      title: "Definir proximo passo",
      description:
        "As tentativas de qualificacao foram concluidas. Se o cliente pediu tempo, agende retorno. Se nao respondeu mais, avalie recuperacao futura.",
      recommendedFunnel: "retorno",
      actionLabel: "Agendar retorno",
      riskLevel: "medium",
      reasons: ["Tentativas de qualificacao concluidas."],
    });
  }

  if (lead.funnel === "retorno") {
    if (!lead.retornoData) {
      return createSuggestion({
        type: "manual_review",
        title: "Retorno sem data",
        description:
          "O lead esta em Retorno, mas nao ha data definida. Revise manualmente.",
        recommendedFunnel: "retorno",
        actionLabel: "Revisar retorno",
        riskLevel: "high",
        reasons: ["Lead em Retorno sem retornoData."],
      });
    }

    if (lead.retornoData <= todayInputValue()) {
      return createSuggestion({
        type: "follow_up_return",
        title: "Retorno pendente",
        description:
          "Este lead tem retorno programado. Entre em contato hoje e registre a mensagem ou ligacao.",
        recommendedFunnel: "retorno",
        actionLabel: "Fazer retorno",
        riskLevel: "medium",
        reasons: [`Data de retorno: ${lead.retornoData}.`],
      });
    }

    return createSuggestion({
      type: "wait_customer",
      title: "Aguardar data de retorno",
      description: "Este lead tem retorno agendado para uma data futura.",
      recommendedFunnel: "retorno",
      riskLevel: "low",
      reasons: [`Data de retorno: ${lead.retornoData}.`],
    });
  }

  if (lead.funnel === "clientes") {
    return createSuggestion({
      type: "close_client",
      title: "Acompanhar cliente",
      description:
        "Lead ja esta como cliente. Acompanhe agenda, pagamento, endereco e confirmacao.",
      recommendedFunnel: "clientes",
      riskLevel: "low",
      reasons: ["Lead no funil de clientes."],
    });
  }

  return createSuggestion({
    type: "manual_review",
    title: "Revisar manualmente",
    description: "Verifique a proxima acao no historico do lead.",
    recommendedFunnel: null,
    riskLevel: "medium",
    reasons: [`Funil atual: ${lead.funnel}.`],
  });
}
