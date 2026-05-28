"use client";

import { useEffect, useState } from "react";
import { LeadCallLogForm } from "@/components/comercial/LeadCallLogForm";
import {
  findBestCommercialResponses,
  normalizeCommercialSearchText,
  type CommercialResponseMatch,
} from "@/lib/comercial/commercial-response-matcher";
import {
  suggestCommercialNextAction,
  type CommercialNextActionSuggestion,
  type CommercialSuggestedFunnel,
} from "@/lib/comercial/commercial-next-action-suggester";
import { createCommercialResponse } from "@/lib/services/commercial-responses-client";
import { createLeadHistoryEvent } from "@/lib/services/lead-history-client";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";
import type { CommercialContext } from "@/types/commercial-contexts";
import type { LeadHistoryItem } from "@/types/lead-history";

type AttemptMarkResult = {
  marked: boolean;
  message: string;
};

type AiAdaptationResult = {
  adaptedReply: string;
  confidence: number;
  requiresHumanReview: boolean;
  safetyNotes: string[];
  usedApprovedAnswerOnly: boolean;
};

type ConversationStage =
  | "opening"
  | "direct_follow_up"
  | "information_answer"
  | "qualification"
  | "schedule_intent"
  | "payment_or_reservation"
  | "return_follow_up"
  | "unknown";

type RecentAiHistoryItem = {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

type LeadAssistedServicePanelProps = {
  leadId: string | number;
  empresaId: string | number;
  leadName?: string;
  onHistoryChanged?: () => Promise<void> | void;
  onMoveToQualification?: () => Promise<void> | void;
  onCommercialReplySentAttempt?: () =>
    | Promise<AttemptMarkResult>
    | AttemptMarkResult;
  onCallLoggedAttempt?: (input: {
    callResult?: string;
    note?: string;
  }) => Promise<AttemptMarkResult> | AttemptMarkResult;
  onScheduleReturn?: (input: {
    returnDate: string;
    note?: string;
  }) => Promise<void> | void;
  currentFunnel?: string | null;
  currentJourneyStep?: string | null;
  currentCommercialContext?: CommercialContext | null;
  leadHistory?: LeadHistoryItem[];
  commercialResponseCategories: CommercialResponseCategory[];
  commercialResponses: CommercialResponse[];
};

type QuickReplyBlock = {
  label: string;
  categorySlug?: string;
  titleIncludes?: string[];
};

const QUICK_REPLY_BLOCKS: QuickReplyBlock[] = [
  {
    label: "Abertura",
    categorySlug: "primeira-abordagem",
    titleIncludes: ["Primeira abordagem"],
  },
  {
    label: "Como funciona",
    categorySlug: "como-funciona-tratamento",
    titleIncludes: ["Explicação simples"],
  },
  {
    label: "Como funciona + valor",
    titleIncludes: ["Como funciona e valor"],
  },
  {
    label: "Preço",
    categorySlug: "preco-promocao",
    titleIncludes: ["Valor promocional"],
  },
  {
    label: "Regiões",
    categorySlug: "regioes-corpo",
    titleIncludes: ["Como funciona o valor por região"],
  },
  {
    label: "Unidades",
    categorySlug: "localizacao-unidades",
    titleIncludes: ["Unidades disponíveis"],
  },
  {
    label: "Endereço Tatuapé",
    titleIncludes: ["Endereço da unidade Tatuapé"],
  },
  {
    label: "Endereço Paulista",
    titleIncludes: ["Endereço da unidade Paulista"],
  },
  {
    label: "Reserva/Sinal",
    categorySlug: "reserva-sinal",
    titleIncludes: ["Taxa de reserva"],
  },
  {
    label: "Gestante/Pós-parto",
    categorySlug: "gestante-pos-parto",
  },
  {
    label: "Menor de idade",
    categorySlug: "menor-responsavel-legal",
  },
  {
    label: "Profissional/Certificações",
    categorySlug: "profissional-certificacoes",
  },
  {
    label: "Não usa tinta",
    categorySlug: "pigmentacao-nao-usa-tinta",
  },
  {
    label: "Flacidez",
    categorySlug: "flacidez",
  },
  {
    label: "Antes e depois",
    categorySlug: "resultados-antes-depois",
  },
];

const FUNNEL_LABELS: Record<CommercialSuggestedFunnel, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  retorno: "Retorno",
  clientes: "Clientes",
  keep_current: "Manter funil atual",
};

const RISK_LABELS: Record<CommercialNextActionSuggestion["riskLevel"], string> =
  {
    low: "baixo",
    medium: "médio",
    high: "alto",
  };

const RELEVANT_HISTORY_EVENTS = new Set([
  "customer_message_received",
  "commercial_reply_sent",
  "call_logged",
  "return_scheduled",
  "commercial_context_updated",
]);

function formatContextDate(value: string | null) {
  if (!value) return "";
  const [date] = value.split("T");
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function truncateContextText(value: string | null, maxLength = 150) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getHistoryEvent(item: LeadHistoryItem) {
  const event = item.metadata?.event;
  return typeof event === "string" ? event : "";
}

function getRecentAiHistory(history: LeadHistoryItem[] = []) {
  return history
    .filter((item) => RELEVANT_HISTORY_EVENTS.has(getHistoryEvent(item)))
    .slice(0, 10)
    .map<RecentAiHistoryItem>((item) => ({
      title: item.title,
      description: item.description,
      type: item.type,
      createdAt: item.created_at,
      metadata: item.metadata,
    }))
    .reverse();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function detectConversationStage(input: {
  message: string;
  recentHistory: RecentAiHistoryItem[];
  currentFunnel?: string | null;
}): ConversationStage {
  const normalized = normalizeCommercialSearchText(input.message);
  const hasPriorConversation = input.recentHistory.length > 0;

  if (
    includesAny(normalized, [
      "pix",
      "sinal",
      "reserva",
      "pagamento",
      "cartao",
      "comprovante",
      "pagar",
      "parcela",
    ])
  ) {
    return "payment_or_reservation";
  }

  if (
    includesAny(normalized, [
      "agendar",
      "agenda",
      "horario",
      "disponibilidade",
      "marcar",
      "sabado",
      "vaga",
      "avaliacao",
    ])
  ) {
    return "schedule_intent";
  }

  if (
    includesAny(normalized, [
      "mes que vem",
      "vou ver",
      "depois",
      "te chamo",
      "chamar depois",
      "falo com",
      "confirmar depois",
    ])
  ) {
    return "return_follow_up";
  }

  if (
    includesAny(normalized, [
      "quero fazer",
      "como faco",
      "qual unidade",
      "unidade",
      "quando tem",
      "tenho interesse",
    ])
  ) {
    return hasPriorConversation ? "qualification" : "opening";
  }

  if (
    includesAny(normalized, [
      "valor",
      "preco",
      "quanto",
      "funciona",
      "onde",
      "endereco",
      "sessao",
      "sessoes",
      "foto",
      "tinta",
      "resultado",
      "antes",
      "depois",
      "flacidez",
      "doe",
    ])
  ) {
    return hasPriorConversation && normalized.split(" ").length <= 8
      ? "direct_follow_up"
      : "information_answer";
  }

  if (
    !hasPriorConversation &&
    input.currentFunnel === "prospeccao" &&
    includesAny(normalized, ["interesse", "informacoes", "anuncio"])
  ) {
    return "opening";
  }

  if (hasPriorConversation && normalized.split(" ").length <= 8) {
    return "direct_follow_up";
  }

  return hasPriorConversation ? "information_answer" : "unknown";
}

function shouldOfferEvaluationNow(input: {
  stage: ConversationStage;
  message: string;
  recentHistory: RecentAiHistoryItem[];
}) {
  const normalized = normalizeCommercialSearchText(input.message);

  if (
    input.stage === "schedule_intent" ||
    input.stage === "payment_or_reservation"
  ) {
    return true;
  }

  if (
    includesAny(normalized, [
      "quero fazer",
      "como agendar",
      "como marcar",
      "quero agendar",
      "quero reservar",
      "tem horario",
      "tem vaga",
    ])
  ) {
    return true;
  }

  const historyText = input.recentHistory
    .map((item) => `${item.title ?? ""} ${item.description ?? ""}`)
    .join(" ");
  const normalizedHistory = normalizeCommercialSearchText(historyText);

  return (
    includesAny(normalizedHistory, ["valor", "preco", "unidade"]) &&
    includesAny(normalized, ["quero", "fazer", "agendar", "marcar"])
  );
}

function getConversationStageLabel(stage: ConversationStage) {
  const labels: Record<ConversationStage, string> = {
    opening: "abertura",
    direct_follow_up: "pergunta objetiva",
    information_answer: "dúvida informativa",
    qualification: "qualificação",
    schedule_intent: "intenção de agenda",
    payment_or_reservation: "pagamento/reserva",
    return_follow_up: "retorno",
    unknown: "indefinido",
  };

  return labels[stage];
}

export function LeadAssistedServicePanel({
  leadId,
  empresaId,
  leadName,
  onHistoryChanged,
  onMoveToQualification,
  onCommercialReplySentAttempt,
  onCallLoggedAttempt,
  onScheduleReturn,
  currentFunnel,
  currentJourneyStep,
  currentCommercialContext,
  leadHistory = [],
  commercialResponseCategories,
  commercialResponses,
}: LeadAssistedServicePanelProps) {
  const [receivedMessage, setReceivedMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copyFeedbackMessage, setCopyFeedbackMessage] = useState("");
  const [suggestionMatch, setSuggestionMatch] =
    useState<CommercialResponseMatch | null>(null);
  const [nextActionSuggestion, setNextActionSuggestion] =
    useState<CommercialNextActionSuggestion | null>(null);
  const [isAdaptingWithAi, setIsAdaptingWithAi] = useState(false);
  const [aiAdaptationError, setAiAdaptationError] = useState("");
  const [aiAdaptationInfo, setAiAdaptationInfo] = useState("");
  const [aiSafetyNotes, setAiSafetyNotes] = useState<string[]>([]);
  const [aiRequiresHumanReview, setAiRequiresHumanReview] = useState(false);
  const [aiAdapted, setAiAdapted] = useState(false);
  const [isRegisteringReceived, setIsRegisteringReceived] = useState(false);
  const [isRegisteringReply, setIsRegisteringReply] = useState(false);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [isRegisteringReview, setIsRegisteringReview] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [isSchedulingReturn, setIsSchedulingReturn] = useState(false);
  const [showCallLogForm, setShowCallLogForm] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [localCommercialResponses, setLocalCommercialResponses] =
    useState(commercialResponses);
  const [showApprovedResponseForm, setShowApprovedResponseForm] =
    useState(false);
  const [newResponseCategoryId, setNewResponseCategoryId] = useState("");
  const [newResponseTitle, setNewResponseTitle] = useState("");
  const [newResponseAnswerText, setNewResponseAnswerText] = useState("");
  const [newResponseQuestions, setNewResponseQuestions] = useState("");
  const [newResponseTags, setNewResponseTags] = useState("");
  const [newResponseInternalNotes, setNewResponseInternalNotes] = useState(
    "Resposta criada a partir do Atendimento Assistido."
  );
  const [newResponseIsActive, setNewResponseIsActive] = useState(true);
  const [newResponseCanAutoReply, setNewResponseCanAutoReply] = useState(false);
  const [newResponseRequiresHuman, setNewResponseRequiresHuman] = useState(true);
  const [newResponseUseCurrentContext, setNewResponseUseCurrentContext] =
    useState(true);
  const [isCreatingApprovedResponse, setIsCreatingApprovedResponse] =
    useState(false);
  const [approvedResponseMessage, setApprovedResponseMessage] = useState("");

  useEffect(() => {
    setLocalCommercialResponses(commercialResponses);
  }, [commercialResponses]);

  useEffect(() => {
    if (!copyFeedbackMessage) return;

    const timer = window.setTimeout(() => {
      setCopyFeedbackMessage("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [copyFeedbackMessage]);

  useEffect(() => {
    setReceivedMessage("");
    setReplyText("");
    setStatusMessage("");
    setCopyFeedbackMessage("");
    setSuggestionMatch(null);
    setNextActionSuggestion(null);
    resetAiAdaptationState();
    setIsRegisteringReceived(false);
    setIsRegisteringReply(false);
    setIsApplyingAction(false);
    setIsRegisteringReview(false);
    setReturnDate("");
    setReturnNote("");
    setIsSchedulingReturn(false);
    setShowCallLogForm(false);
    setShowQuickReplies(false);
    setShowApprovedResponseForm(false);
    resetApprovedResponseForm();
  }, [leadId]);

  function resetApprovedResponseForm() {
    setNewResponseCategoryId("");
    setNewResponseTitle("");
    setNewResponseAnswerText("");
    setNewResponseQuestions("");
    setNewResponseTags("");
    setNewResponseInternalNotes(
      "Resposta criada a partir do Atendimento Assistido."
    );
    setNewResponseIsActive(true);
    setNewResponseCanAutoReply(false);
    setNewResponseRequiresHuman(true);
    setNewResponseUseCurrentContext(true);
    setApprovedResponseMessage("");
    setIsCreatingApprovedResponse(false);
  }

  function resetAiAdaptationState() {
    setIsAdaptingWithAi(false);
    setAiAdaptationError("");
    setAiAdaptationInfo("");
    setAiSafetyNotes([]);
    setAiRequiresHumanReview(false);
    setAiAdapted(false);
  }

  function toggleApprovedResponseForm() {
    setShowApprovedResponseForm((current) => {
      const next = !current;

      if (!current) {
        setNewResponseAnswerText(replyText);
        setNewResponseQuestions(receivedMessage);
        setNewResponseUseCurrentContext(true);
        setApprovedResponseMessage("");
      }

      return next;
    });
  }

  function getResponseCategory(response: CommercialResponse) {
    if (!response.categoryId) return null;

    return (
      commercialResponseCategories.find(
        (category) => category.id === response.categoryId
      ) ?? null
    );
  }

  function findQuickReplyResponse(block: QuickReplyBlock) {
    const normalizedTitleIncludes =
      block.titleIncludes?.map(normalizeCommercialSearchText) ?? [];
    const currentContextId = currentCommercialContext?.id ?? null;
    const scopedResponses = localCommercialResponses.filter((response) => {
      if (!response.isActive) return false;

      if (currentContextId) {
        return (
          response.contextId === null || response.contextId === currentContextId
        );
      }

      return response.contextId === null;
    });
    const contextResponses = currentContextId
      ? scopedResponses.filter(
          (response) => response.contextId === currentContextId
        )
      : [];
    const globalResponses = scopedResponses.filter(
      (response) => response.contextId === null
    );

    function matchesTitle(response: CommercialResponse) {
      if (normalizedTitleIncludes.length === 0) return false;

      const normalizedTitle = normalizeCommercialSearchText(response.title);
      return normalizedTitleIncludes.some((titlePart) =>
        normalizedTitle.includes(titlePart)
      );
    }

    function matchesCategory(response: CommercialResponse) {
      const category = getResponseCategory(response);
      return Boolean(block.categorySlug) && category?.slug === block.categorySlug;
    }

    return (
      contextResponses.find(matchesTitle) ??
      contextResponses.find(matchesCategory) ??
      globalResponses.find(matchesTitle) ??
      globalResponses.find(matchesCategory) ??
      null
    );
  }

  function handleApplyQuickReply(block: QuickReplyBlock) {
    const response = findQuickReplyResponse(block);

    if (!response) {
      setStatusMessage(
        "Nenhuma resposta aprovada encontrada para este bloco rápido. Verifique a aba Respostas."
      );
      return;
    }

    if (
      response.contextId &&
      (!currentCommercialContext ||
        response.contextId !== currentCommercialContext.id)
    ) {
      setStatusMessage("Resposta ignorada por pertencer a outro contexto.");
      return;
    }

    const category = getResponseCategory(response);
    const contextScope =
      currentCommercialContext &&
      response.contextId === currentCommercialContext.id
        ? "current_context"
        : "global";

    setReplyText(response.answerText);
    resetAiAdaptationState();
    setSuggestionMatch({
      response,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      contextScope,
      contextName:
        contextScope === "current_context"
          ? currentCommercialContext?.name ?? null
          : null,
      score: 0,
      matchedTerms: [],
    });
    setNextActionSuggestion(null);
    setStatusMessage(
      contextScope === "current_context"
        ? `Bloco rápido aplicado do contexto: ${currentCommercialContext?.name}.`
        : "Bloco rápido global aplicado como apoio."
    );
  }

  function todayInputValue() {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  async function adaptApprovedResponseWithAi(input: {
    customerMessage: string;
    match: CommercialResponseMatch;
  }): Promise<AiAdaptationResult> {
    const response = input.match.response;
    const recentHistory = getRecentAiHistory(leadHistory);
    const conversationStage = detectConversationStage({
      message: input.customerMessage,
      recentHistory,
      currentFunnel,
    });
    const hasPriorConversation = recentHistory.length > 0;
    const canOfferEvaluation = shouldOfferEvaluationNow({
      stage: conversationStage,
      message: input.customerMessage,
      recentHistory,
    });

    const result = await fetch("/api/comercial/ai/adapt-approved-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerMessage: input.customerMessage,
        approvedAnswerText: response.answerText,
        approvedResponseTitle: response.title,
        approvedResponseCategory: input.match.categoryName,
        contextName: currentCommercialContext?.name ?? null,
        contextPriceNotes: currentCommercialContext?.priceNotes ?? null,
        contextPaymentNotes: currentCommercialContext?.paymentNotes ?? null,
        contextScheduleNotes: currentCommercialContext?.scheduleNotes ?? null,
        contextUnitsNotes: currentCommercialContext?.unitsNotes ?? null,
        contextSafetyNotes: currentCommercialContext?.safetyNotes ?? null,
        leadName: leadName ?? null,
        leadFunnel: currentFunnel ?? null,
        leadJourneyStep: currentJourneyStep ?? null,
        requiresHuman: response.requiresHuman,
        canAutoReply: response.canAutoReply,
        recentHistory,
        conversationStage,
        hasPriorConversation,
        shouldAvoidGreeting: hasPriorConversation,
        shouldAvoidEmoji: hasPriorConversation,
        shouldOfferEvaluationNow: canOfferEvaluation,
      }),
    });

    const data = (await result.json().catch(() => ({}))) as
      | AiAdaptationResult
      | { error?: string };

    if (!result.ok) {
      throw new Error(
        "error" in data && data.error
          ? data.error
          : "Erro ao adaptar resposta com IA."
      );
    }

    if (!("adaptedReply" in data) || !data.adaptedReply?.trim()) {
      throw new Error("Resposta inválida da IA.");
    }

    return data;
  }

  async function handleAnalyzeMessage() {
    const trimmedMessage = receivedMessage.trim();

    if (!trimmedMessage) {
      setStatusMessage("Cole a mensagem recebida antes de analisar.");
      return;
    }

    resetAiAdaptationState();

    const result = findBestCommercialResponses({
      message: trimmedMessage,
      categories: commercialResponseCategories,
      responses: localCommercialResponses,
      currentContextId: currentCommercialContext?.id ?? null,
      currentContextName: currentCommercialContext?.name ?? null,
    });

    if (!result.bestMatch) {
      setNextActionSuggestion(
        suggestCommercialNextAction({
          message: trimmedMessage,
          bestMatch: null,
        })
      );
      setSuggestionMatch(null);
      setReplyText("");
      setStatusMessage(
        "Nenhuma resposta aprovada encontrada para essa mensagem. Revise manualmente ou crie uma nova resposta aprovada depois."
      );
      return;
    }

    const nextAction = suggestCommercialNextAction({
      message: trimmedMessage,
      bestMatch: result.bestMatch,
    });

    setSuggestionMatch(result.bestMatch);
    setNextActionSuggestion(nextAction);
    setReplyText(result.bestMatch.response.answerText);
    setStatusMessage("Resposta aprovada encontrada. Adaptando com IA...");
    setIsAdaptingWithAi(true);
    const recentHistoryForAi = getRecentAiHistory(leadHistory);
    const conversationStage = detectConversationStage({
      message: trimmedMessage,
      recentHistory: recentHistoryForAi,
      currentFunnel,
    });
    const stageLabel = getConversationStageLabel(conversationStage);

    try {
      const adapted = await adaptApprovedResponseWithAi({
        customerMessage: trimmedMessage,
        match: result.bestMatch,
      });

      setReplyText(adapted.adaptedReply);
      setAiAdapted(true);
      setAiRequiresHumanReview(
        adapted.requiresHumanReview || result.bestMatch.response.requiresHuman
      );
      setAiSafetyNotes(adapted.safetyNotes);
      setAiAdaptationInfo(
        recentHistoryForAi.length > 0
          ? `Adaptada com IA usando resposta aprovada e histórico recente (${stageLabel}).`
          : `Adaptada com IA usando resposta aprovada (${stageLabel}).`
      );
      setStatusMessage("Resposta aprovada adaptada com IA.");
    } catch (error) {
      setReplyText(result.bestMatch.response.answerText);
      setAiAdapted(false);
      setAiRequiresHumanReview(result.bestMatch.response.requiresHuman);
      setAiSafetyNotes([]);
      setAiAdaptationError(
        error instanceof Error
          ? error.message
          : "Erro ao adaptar resposta com IA."
      );
      setAiAdaptationInfo("Fallback para resposta aprovada original.");
      setStatusMessage(
        "Não foi possível adaptar com IA. Usei a resposta aprovada original."
      );
    } finally {
      setIsAdaptingWithAi(false);
    }
  }

  async function handleRegisterReceived() {
    const trimmedMessage = receivedMessage.trim();

    if (!trimmedMessage) {
      setStatusMessage("Cole a mensagem recebida antes de registrar.");
      return;
    }

    setIsRegisteringReceived(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Mensagem recebida do cliente",
        description: trimmedMessage,
        metadata: {
          event: "customer_message_received",
          source: "whatsapp_manual",
          messageText: trimmedMessage,
          assistedPanel: true,
        },
      });

      await onHistoryChanged?.();
      setStatusMessage(
        "Mensagem recebida registrada. Você ainda pode analisar e sugerir resposta."
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar mensagem recebida: ${error.message}`
          : "Erro ao registrar mensagem recebida."
      );
    } finally {
      setIsRegisteringReceived(false);
    }
  }

  async function handleRegisterReplySent() {
    const trimmedReply = replyText.trim();

    if (!trimmedReply) {
      setStatusMessage("Escreva ou cole a resposta antes de registrar.");
      return;
    }

    setIsRegisteringReply(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Resposta enviada ao cliente",
        description: trimmedReply,
        metadata: {
          event: "commercial_reply_sent",
          source: "whatsapp_manual",
          replyText: trimmedReply,
          assistedPanel: true,
          aiAdapted,
          approvedResponseId: suggestionMatch?.response.id ?? null,
          approvedResponseTitle: suggestionMatch?.response.title ?? null,
          requiresHumanReview:
            aiRequiresHumanReview ||
            suggestionMatch?.response.requiresHuman === true,
        },
      });

      await onHistoryChanged?.();
      let attemptMessage = "";

      if (onCommercialReplySentAttempt) {
        try {
          const attemptResult = await onCommercialReplySentAttempt();
          attemptMessage = ` ${attemptResult.message}`;
        } catch {
          attemptMessage =
            " Registro salvo, mas não foi possível marcar a tentativa automaticamente.";
        }
      }

      setStatusMessage(
        `Resposta enviada registrada no histórico.${attemptMessage}`
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar resposta enviada: ${error.message}`
          : "Erro ao registrar resposta enviada."
      );
    } finally {
      setIsRegisteringReply(false);
    }
  }

  async function handleMoveToQualification() {
    if (!nextActionSuggestion) return;

    if (!onMoveToQualification) {
      setStatusMessage("Ação ainda não conectada.");
      return;
    }

    const confirmed = window.confirm("Mover este lead para Qualificação?");

    if (!confirmed) return;

    setIsApplyingAction(true);
    setStatusMessage("");

    try {
      await onMoveToQualification();
      setStatusMessage("Lead movido para Qualificação.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao mover para Qualificação: ${error.message}`
          : "Erro ao mover para Qualificação."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  async function handleScheduleReturn() {
    const trimmedReturnDate = returnDate.trim();
    const trimmedReturnNote = returnNote.trim();

    if (!onScheduleReturn) {
      setStatusMessage("Ação de retorno ainda não conectada.");
      return;
    }

    if (!trimmedReturnDate) {
      setStatusMessage("Informe a data de retorno.");
      return;
    }

    if (trimmedReturnDate < todayInputValue()) {
      setStatusMessage("Escolha uma data de retorno de hoje em diante.");
      return;
    }

    const confirmed = window.confirm("Agendar retorno para este lead?");

    if (!confirmed) return;

    setIsSchedulingReturn(true);
    setStatusMessage("");

    try {
      await onScheduleReturn({
        returnDate: trimmedReturnDate,
        note: trimmedReturnNote || undefined,
      });
      setReturnDate("");
      setReturnNote("");
      setStatusMessage("Retorno agendado.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao agendar retorno: ${error.message}`
          : "Erro ao agendar retorno."
      );
    } finally {
      setIsSchedulingReturn(false);
    }
  }

  async function handleRegisterHumanReview() {
    if (!nextActionSuggestion) return;

    setIsRegisteringReview(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Revisão humana recomendada",
        description: [
          "O Atendimento Assistido recomendou revisão humana.",
          `Motivo: ${nextActionSuggestion.title} - ${nextActionSuggestion.description}`,
          `Risco: ${nextActionSuggestion.riskLevel}`,
          `Razões: ${nextActionSuggestion.reasons.join(" ")}`,
        ].join("\n"),
        metadata: {
          event: "human_review_recommended",
          source: "assisted_panel",
          actionType: nextActionSuggestion.actionType,
          suggestedFunnel: nextActionSuggestion.suggestedFunnel,
          riskLevel: nextActionSuggestion.riskLevel,
          reasons: nextActionSuggestion.reasons,
          currentFunnel: currentFunnel ?? null,
        },
      });

      await onHistoryChanged?.();
      setStatusMessage("Revisão humana registrada no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar revisão humana: ${error.message}`
          : "Erro ao registrar revisão humana."
      );
    } finally {
      setIsRegisteringReview(false);
    }
  }

  function parseLines(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseTags(value: string) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleCreateApprovedResponse() {
    const title = newResponseTitle.trim();
    const answerText = newResponseAnswerText.trim();

    if (!newResponseCategoryId) {
      setApprovedResponseMessage("Selecione uma categoria.");
      return;
    }

    if (!title) {
      setApprovedResponseMessage("Informe um título interno.");
      return;
    }

    if (!answerText) {
      setApprovedResponseMessage("Informe a resposta aprovada.");
      return;
    }

    setIsCreatingApprovedResponse(true);
    setApprovedResponseMessage("");

    try {
      const createdResponse = await createCommercialResponse({
        empresaId,
        data: {
          categoryId: newResponseCategoryId,
          title,
          answerText,
          exampleQuestions: parseLines(newResponseQuestions),
          tags: parseTags(newResponseTags),
          isActive: newResponseIsActive,
          canAutoReply: newResponseCanAutoReply,
          requiresHuman: newResponseRequiresHuman,
          internalNotes: newResponseInternalNotes,
          contextId:
            currentCommercialContext && newResponseUseCurrentContext
              ? currentCommercialContext.id
              : null,
          priority: 50,
        },
      });

      setLocalCommercialResponses((current) => [createdResponse, ...current]);
      resetApprovedResponseForm();
      setShowApprovedResponseForm(false);
      setStatusMessage("Resposta aprovada criada com sucesso.");
    } catch (error) {
      setApprovedResponseMessage(
        error instanceof Error
          ? `Erro ao criar resposta aprovada: ${error.message}`
          : "Erro ao criar resposta aprovada."
      );
    } finally {
      setIsCreatingApprovedResponse(false);
    }
  }

  async function handleCopyReply() {
    const trimmedReply = replyText.trim();

    if (!trimmedReply) {
      setStatusMessage("Escreva uma resposta antes de copiar.");
      setCopyFeedbackMessage("");
      return;
    }

    if (!navigator.clipboard) {
      const message =
        "Não foi possível copiar automaticamente. Selecione o texto manualmente."
      setStatusMessage(message);
      setCopyFeedbackMessage(message);
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmedReply);
      const message = "Mensagem copiada. Agora cole no WhatsApp com Ctrl+V.";
      setStatusMessage(message);
      setCopyFeedbackMessage(message);
    } catch {
      const message =
        "Não foi possível copiar automaticamente. Selecione o texto manualmente."
      setStatusMessage(message);
      setCopyFeedbackMessage(message);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Atendimento Assistido
        </p>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Cole a mensagem do cliente, gere uma resposta sugerida, revise, copie
          para o WhatsApp e registre o envio.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text2)]">
          {leadName && <span>Lead: {leadName}</span>}
          <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-0.5 font-semibold text-[var(--text2)]">
            {currentCommercialContext
              ? `Contexto: ${currentCommercialContext.name}`
              : "Base global"}
          </span>
          {currentCommercialContext?.priceNotes && (
            <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-0.5 text-[var(--text3)]">
              Preco: {truncateContextText(currentCommercialContext.priceNotes)}
            </span>
          )}
          {currentCommercialContext?.safetyNotes && (
            <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-0.5 text-[var(--text3)]">
              Seguranca:{" "}
              {truncateContextText(currentCommercialContext.safetyNotes)}
            </span>
          )}
          {(currentCommercialContext?.startsAt ||
            currentCommercialContext?.endsAt) && (
            <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-0.5 text-[var(--text3)]">
              Periodo:{" "}
              {formatContextDate(currentCommercialContext.startsAt) ||
                "sem inicio"}{" "}
              ate{" "}
              {formatContextDate(currentCommercialContext.endsAt) || "sem fim"}
            </span>
          )}
        </div>
        {!currentCommercialContext && (
          <p className="mt-2 text-xs text-[var(--text3)]">
            Se esta campanha tiver preco ou abordagem propria, selecione um
            contexto no detalhe do lead.
          </p>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
            Mensagem recebida do cliente
          </label>
          <textarea
            value={receivedMessage}
            onChange={(event) => {
              setReceivedMessage(event.target.value);
              setSuggestionMatch(null);
              setNextActionSuggestion(null);
              resetAiAdaptationState();
            }}
            rows={5}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
            placeholder="Cole aqui a última mensagem que o cliente enviou no WhatsApp..."
          />
          <button
            type="button"
            disabled={isRegisteringReceived}
            onClick={() => void handleRegisterReceived()}
            className="mt-2 rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegisteringReceived ? "Registrando..." : "Registrar recebida"}
          </button>
          <button
            type="button"
            disabled={isAdaptingWithAi}
            onClick={() => void handleAnalyzeMessage()}
            className="ml-2 mt-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdaptingWithAi
              ? "Adaptando com IA..."
              : "Analisar e sugerir resposta"}
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
            Resposta sugerida / mensagem para enviar
          </label>
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            rows={5}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
            placeholder="A resposta sugerida aparecerá aqui. Você pode editar antes de copiar."
          />
          <p className="mt-2 text-xs text-[var(--text3)]">
            Esta sugestão usa apenas respostas aprovadas cadastradas. Revise
            antes de enviar no WhatsApp.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyReply()}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)]"
            >
              Copiar resposta
            </button>

            <button
              type="button"
              disabled={isRegisteringReply}
              onClick={() => void handleRegisterReplySent()}
              className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRegisteringReply ? "Registrando..." : "Registrar como enviada"}
            </button>

            <button
              type="button"
              onClick={toggleApprovedResponseForm}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              {showApprovedResponseForm
                ? "Fechar criação de resposta"
                : "Salvar esta resposta na base"}
            </button>
          </div>
          {copyFeedbackMessage && (
            <p className="mt-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300">
              {copyFeedbackMessage}
            </p>
          )}
        </div>
      </div>

      {suggestionMatch && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Resposta encontrada
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {suggestionMatch.response.title}
              </p>
              <p className="mt-1 text-xs text-[var(--text2)]">
                Categoria: {suggestionMatch.categoryName ?? "sem categoria"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestionMatch.contextScope === "current_context" && (
                <span className="rounded-full border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {suggestionMatch.score === 0
                    ? "Bloco do contexto"
                    : "Resposta do contexto"}
                </span>
              )}

              {suggestionMatch.contextScope === "global" && (
                <span className="rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                  {suggestionMatch.score === 0 ? "Bloco global" : "Resposta global"}
                </span>
              )}

              {suggestionMatch.response.requiresHuman &&
                !aiRequiresHumanReview && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Revisar antes de enviar
                </span>
              )}

              {aiAdapted && (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                  Adaptada com IA
                </span>
              )}

              {aiAdaptationInfo && !aiAdapted && (
                <span className="rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                  Fallback para resposta aprovada
                </span>
              )}

              {aiRequiresHumanReview && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Revisar antes de enviar
                </span>
              )}

              {suggestionMatch.response.canAutoReply && (
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-300">
                  Candidata a auto resposta futura
                </span>
              )}
            </div>
          </div>

          <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text2)]">
            {suggestionMatch.score === 0 &&
            suggestionMatch.contextScope === "current_context"
              ? `Resposta aplicada do contexto: ${
                  suggestionMatch.contextName ?? "contexto atual"
                }.`
              : suggestionMatch.score === 0
                ? "Resposta global usada como apoio."
                : suggestionMatch.contextScope === "current_context"
              ? `Esta resposta pertence ao contexto: ${
                  suggestionMatch.contextName ?? "contexto atual"
                }.`
              : "Esta resposta e global e pode ser usada quando nao houver resposta especifica do contexto."}
          </p>

          <p className="mt-2 text-xs text-[var(--text3)]">
            {currentCommercialContext
              ? "O matcher considera respostas globais e respostas deste contexto. Respostas de outros contextos sao ignoradas."
              : "Sem contexto no lead: o matcher considera apenas respostas globais."}
          </p>

          {(aiAdaptationInfo || aiAdaptationError || aiSafetyNotes.length > 0) && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text2)]">
              {aiAdaptationInfo && (
                <p className="font-semibold text-[var(--text)]">
                  {aiAdaptationInfo}
                </p>
              )}
              {aiAdaptationError && (
                <p className="mt-1 text-amber-300">{aiAdaptationError}</p>
              )}
              {aiSafetyNotes.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--text3)]">
                  {aiSafetyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-3 grid gap-2 text-xs text-[var(--text2)] sm:grid-cols-2">
            <div>Pontuação: {suggestionMatch.score.toFixed(1)}</div>
            <div>
              Termos encontrados:{" "}
              {suggestionMatch.matchedTerms.length
                ? suggestionMatch.matchedTerms.join(", ")
                : "nenhum"}
            </div>
          </div>
        </div>
      )}

      {nextActionSuggestion && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Próxima ação sugerida
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {nextActionSuggestion.title}
              </p>
              <p className="mt-1 text-sm text-[var(--text2)]">
                {nextActionSuggestion.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "qualificacao" && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                    Mover para Qualificação
                  </span>
                )}

              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "retorno" && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                    Mover para Retorno
                  </span>
                )}

              {nextActionSuggestion.requiresHuman && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Precisa humano
                </span>
              )}

              {nextActionSuggestion.riskLevel === "high" && (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                  Risco alto
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-[var(--text2)] sm:grid-cols-3">
            <div>Funil sugerido: {FUNNEL_LABELS[nextActionSuggestion.suggestedFunnel]}</div>
            <div>
              Recomenda mover:{" "}
              {nextActionSuggestion.shouldMoveFunnel ? "sim" : "não"}
            </div>
            <div>Risco: {RISK_LABELS[nextActionSuggestion.riskLevel]}</div>
          </div>

          {nextActionSuggestion.reasons.length > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text2)]">
              <span className="font-semibold text-[var(--text)]">Razões: </span>
              {nextActionSuggestion.reasons.join(" ")}
            </div>
          )}

          <p className="mt-3 text-xs text-[var(--text3)]">
            Esta é apenas uma sugestão local. O CRM não move o lead
            automaticamente nesta etapa.
          </p>

          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Aplicar manualmente
            </p>
            <p className="mt-1 text-xs text-[var(--text2)]">
              Estas ações não acontecem automaticamente. Você escolhe se quer
              aplicar.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "qualificacao" && (
                  <button
                    type="button"
                    disabled={isApplyingAction}
                    onClick={() => void handleMoveToQualification()}
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isApplyingAction ? "Movendo..." : "Mover para Qualificação"}
                  </button>
                )}

              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "retorno" && (
                  <div className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Agendar retorno
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(event) => setReturnDate(event.target.value)}
                        className="rounded-lg border border-purple-500/30 bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text)] outline-none"
                      />
                      <input
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                        className="rounded-lg border border-purple-500/30 bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
                        placeholder="Ex: Cliente pediu para chamar no dia do pagamento."
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isSchedulingReturn || !onScheduleReturn}
                        onClick={() => void handleScheduleReturn()}
                        className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSchedulingReturn ? "Agendando..." : "Agendar Retorno"}
                      </button>

                      {!onScheduleReturn && (
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
                          Ação de retorno ainda não conectada.
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {(nextActionSuggestion.requiresHuman ||
                nextActionSuggestion.riskLevel === "high") && (
                <button
                  type="button"
                  disabled={isRegisteringReview}
                  onClick={() => void handleRegisterHumanReview()}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRegisteringReview
                    ? "Registrando..."
                    : "Registrar revisão humana"}
                </button>
              )}

              {nextActionSuggestion.suggestedFunnel === "keep_current" && (
                <span className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
                  Nenhuma movimentação de funil sugerida agora.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {showApprovedResponseForm && (
      <section className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Salvar como resposta aprovada
            </p>
            <p className="mt-1 text-xs text-[var(--text2)]">
              Use quando você editou uma resposta, consultou a especialista ou
              criou uma resposta melhor para uma pergunta nova. Depois de
              salvar, ela ficará disponível na base de respostas comerciais.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleApprovedResponseForm}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {showApprovedResponseForm
              ? "Ocultar criação de resposta aprovada"
              : "Mostrar criação de resposta aprovada"}
          </button>
        </div>

          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Categoria
                <select
                  value={newResponseCategoryId}
                  onChange={(event) =>
                    setNewResponseCategoryId(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Selecione uma categoria</option>
                  {commercialResponseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Título interno
                <input
                  value={newResponseTitle}
                  onChange={(event) => setNewResponseTitle(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                  placeholder="Ex: Pergunta sobre queloide / cuidado com pele sensível"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Resposta aprovada
              <textarea
                value={newResponseAnswerText}
                onChange={(event) =>
                  setNewResponseAnswerText(event.target.value)
                }
                rows={5}
                className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Escreva a resposta aprovada que poderá ser reutilizada."
              />
            </label>

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Perguntas parecidas
              <textarea
                value={newResponseQuestions}
                onChange={(event) =>
                  setNewResponseQuestions(event.target.value)
                }
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Coloque uma pergunta por linha."
              />
              <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[var(--text3)]">
                Coloque uma pergunta por linha. Isso ajuda o CRM a encontrar
                essa resposta depois.
              </span>
            </label>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Tags
                <input
                  value={newResponseTags}
                  onChange={(event) => setNewResponseTags(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                  placeholder="Ex: queloide, pele sensível, contraindicação"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Observações internas
                <input
                  value={newResponseInternalNotes}
                  onChange={(event) =>
                    setNewResponseInternalNotes(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={newResponseIsActive}
                  onChange={(event) =>
                    setNewResponseIsActive(event.target.checked)
                  }
                />
                Ativa
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={newResponseCanAutoReply}
                  onChange={(event) =>
                    setNewResponseCanAutoReply(event.target.checked)
                  }
                />
                Candidata a auto resposta futura
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={newResponseRequiresHuman}
                  onChange={(event) =>
                    setNewResponseRequiresHuman(event.target.checked)
                  }
                />
                Precisa revisão humana
              </label>
            </div>

            {currentCommercialContext && (
              <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={newResponseUseCurrentContext}
                  onChange={(event) =>
                    setNewResponseUseCurrentContext(event.target.checked)
                  }
                />
                Vincular esta resposta ao contexto atual
              </label>
            )}

            <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
              {currentCommercialContext
                ? "Use o vinculo ao contexto quando a resposta so vale para este publico/campanha. Desmarque para salvar como resposta global."
                : "Sem contexto no lead. Esta resposta sera salva como global."}
            </p>

            <div className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
              <p>
                Não salve como resposta aprovada informações que ainda não
                foram confirmadas pela especialista ou pela clínica.
              </p>
              <p>
                Valores, promoções, contraindicações, gestantes, menores de
                idade e certificações devem ser marcados como revisão humana.
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isCreatingApprovedResponse}
                onClick={() => void handleCreateApprovedResponse()}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingApprovedResponse
                  ? "Salvando..."
                  : "Salvar na base de respostas"}
              </button>

              {approvedResponseMessage && (
                <span className="text-xs text-[var(--text2)]">
                  {approvedResponseMessage}
                </span>
              )}
            </div>
          </div>
      </section>
      )}

      <section className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Registrar ligação
            </p>
            <p className="mt-1 text-xs text-[var(--text2)]">
              Registre manualmente o resultado de uma ligação feita pelo
              WhatsApp ou celular.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCallLogForm((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {showCallLogForm
              ? "Ocultar registro de ligação"
              : "Mostrar registro de ligação"}
          </button>
        </div>

        {showCallLogForm && (
          <div className="mt-3">
            <LeadCallLogForm
              leadId={leadId}
              empresaId={empresaId}
              onHistoryChanged={onHistoryChanged}
              onCallLoggedAttempt={onCallLoggedAttempt}
            />
          </div>
        )}
      </section>

      <section className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Ferramentas extras
            </p>
            <p className="mt-1 text-xs text-[var(--text3)]">
              Atalhos de apoio para casos pontuais. O fluxo principal fica na
              mensagem recebida e na resposta sugerida.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickReplies((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {showQuickReplies ? "Ocultar extras" : "Mostrar extras"}
          </button>
        </div>

        {showQuickReplies && (
          <div className="mt-3">
            <p className="text-xs text-[var(--text2)]">
              Blocos rápidos priorizam respostas do contexto comercial do lead.
              Se não houver resposta específica, usam uma resposta global.
            </p>
            <p className="mt-1 text-xs text-[var(--text3)]">
              {currentCommercialContext
                ? `Contexto atual: ${currentCommercialContext.name}. Respostas de outros contextos são ignoradas.`
                : "Este lead está sem contexto. Os blocos rápidos usam apenas respostas globais."}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_REPLY_BLOCKS.map((block) => (
                <button
                  key={block.label}
                  type="button"
                  onClick={() => handleApplyQuickReply(block)}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-left text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  {block.label}
                </button>
              ))}
            </div>

            <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text3)]">
              Blocos com preço, promoção, pagamento, gestante, menor de idade
              ou certificações devem ser revisados antes do envio.
            </p>
          </div>
        )}
      </section>

      {statusMessage && (
        <div className="mt-3 rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs text-[var(--text2)]">
          {statusMessage}
        </div>
      )}
    </section>
  );
}
