"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LeadCallLogForm } from "@/components/comercial/LeadCallLogForm";
import { QualificationTimeline } from "@/components/comercial/QualificationTimeline";
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
import {
  buildHistoryEventFingerprint,
  isDuplicateHistoryEvent,
} from "@/lib/comercial/history-duplicates";
import {
  getQualificationJourneyState,
  getQualificationTimelineStateForAI,
} from "@/lib/comercial/qualification-journey";
import { getEstimatedWhatsAppWindowState } from "@/lib/comercial/whatsapp-window";
import {
  listCommercialMaterials,
  type CommercialMaterial,
} from "@/lib/services/commercial-materials-client";
import { createCommercialResponse } from "@/lib/services/commercial-responses-client";
import { createLeadHistoryEvent } from "@/lib/services/lead-history-client";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";
import type { CommercialContext } from "@/types/commercial-contexts";
import type { Lead } from "@/types/lead";
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

type AiKnowledgeCandidate = {
  id: string;
  title: string;
  categoryName?: string | null;
  answerText: string;
  exampleQuestions?: string[];
  tags?: string[];
  score?: number;
  contextScope?: "current_context" | "global";
  requiresHuman?: boolean;
  canAutoReply?: boolean;
};

type CallScriptResult = {
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

type LeadAttachmentType =
  | "pix_receipt"
  | "customer_photo"
  | "document"
  | "other";

type LeadMaterialSentType =
  | "before_after"
  | "evolution_1_session"
  | "evolution_2_sessions"
  | "evolution_4_sessions"
  | "address"
  | "payment_pix"
  | "schedule"
  | "certification"
  | "document"
  | "other";

type MaterialSentMode = "catalog" | "manual";

type LeadAssistedServicePanelProps = {
  lead: Lead;
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
  onCreateNote?: (description: string) => boolean | void | Promise<boolean | void>;
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

const ATTACHMENT_TYPE_OPTIONS: Array<{
  value: LeadAttachmentType;
  label: string;
}> = [
  { value: "pix_receipt", label: "Comprovante Pix" },
  { value: "customer_photo", label: "Foto enviada pelo cliente" },
  { value: "document", label: "Documento" },
  { value: "other", label: "Outro" },
];

const MATERIAL_SENT_TYPE_OPTIONS: Array<{
  value: LeadMaterialSentType;
  label: string;
}> = [
  { value: "before_after", label: "Antes e depois" },
  { value: "evolution_1_session", label: "Evolução 1 sessão" },
  { value: "evolution_2_sessions", label: "Evolução 2 sessões" },
  { value: "evolution_4_sessions", label: "Evolução 4 sessões" },
  { value: "address", label: "Endereço" },
  { value: "payment_pix", label: "Pix / pagamento" },
  { value: "schedule", label: "Agenda / horário" },
  { value: "certification", label: "Certificação / profissional" },
  { value: "document", label: "Documento" },
  { value: "other", label: "Outro" },
];

const MATERIAL_CATEGORY_LABELS: Record<string, string> = {
  before_after: "Antes e depois",
  address: "Endereço",
  payment_pix: "Pix / pagamento",
  schedule: "Agenda / horário",
  certification: "Certificação",
  document: "Documento",
  other: "Outro",
};

const DEFAULT_MATERIAL_CAPTION =
  "Vou te mandar um exemplo para você ter uma noção visual da evolução.";
const IMAGE_CLIPBOARD_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RELEVANT_HISTORY_EVENTS = new Set([
  "customer_message_received",
  "commercial_reply_sent",
  "call_logged",
  "return_scheduled",
  "commercial_context_updated",
]);
const RECENT_DUPLICATE_HISTORY_LIMIT = 50;
const MAX_AI_KNOWLEDGE_CANDIDATES = 5;
const MAX_AI_KNOWLEDGE_ANSWER_LENGTH = 1800;
const deferToNextFrame = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

function getHistoryEvent(item: LeadHistoryItem) {
  const event = item.metadata?.event;
  return typeof event === "string" ? event : "";
}

function getAttachmentTitle(attachmentType: LeadAttachmentType) {
  if (attachmentType === "pix_receipt") return "Comprovante Pix recebido";
  if (attachmentType === "customer_photo") return "Foto recebida do cliente";
  return "Anexo recebido do cliente";
}

function getMaterialSentTitle(materialType: LeadMaterialSentType) {
  if (materialType === "before_after") return "Antes e depois enviado";
  if (
    materialType === "evolution_1_session" ||
    materialType === "evolution_2_sessions" ||
    materialType === "evolution_4_sessions"
  ) {
    return "Material de evolução enviado";
  }
  if (materialType === "address") return "Endereço enviado";
  if (materialType === "payment_pix") return "Pix/pagamento enviado";
  if (materialType === "schedule") return "Informação de agenda enviada";
  return "Material enviado ao cliente";
}

function getMaterialCategoryLabel(category?: string | null) {
  return MATERIAL_CATEGORY_LABELS[category ?? ""] ?? "Outro";
}

function getMaterialSessionsLabel(value?: number | null) {
  if (!value) return "";
  return value === 1 ? "1 sessão" : `${value} sessões`;
}

function truncateMaterialText(value?: string | null, maxLength = 110) {
  const normalized = value?.trim() ?? "";

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function getUniqueMaterialOptions(
  materials: CommercialMaterial[],
  key: "category" | "region" | "skinTone" | "audience"
) {
  return Array.from(
    new Set(
      materials
        .map((material) => material[key])
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function materialMatchesFilters(input: {
  material: CommercialMaterial;
  category: string;
  region: string;
  skinTone: string;
  audience: string;
  sessionsCount: string;
}) {
  const { material, category, region, skinTone, audience, sessionsCount } =
    input;

  return (
    (!category || material.category === category) &&
    (!region || material.region === region) &&
    (!skinTone || material.skinTone === skinTone) &&
    (!audience || material.audience === audience) &&
    (!sessionsCount || String(material.sessionsCount ?? "") === sessionsCount)
  );
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
      "qual dia",
      "que dia",
      "quando posso",
      "quando consigo",
      "quando tem",
      "horario",
      "horarios",
      "disponibilidade",
      "marcar",
      "sabado",
      "semana",
      "manha",
      "tarde",
      "vaga",
      "avaliacao",
      "fazer avaliacao",
      "posso fazer avaliacao",
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
  lead,
  leadId,
  empresaId,
  leadName,
  onHistoryChanged,
  onMoveToQualification,
  onCommercialReplySentAttempt,
  onCallLoggedAttempt,
  onScheduleReturn,
  onCreateNote,
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
  const [aiKnowledgeCandidateCount, setAiKnowledgeCandidateCount] =
    useState(0);
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
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] =
    useState<LeadAttachmentType>("pix_receipt");
  const [attachmentNote, setAttachmentNote] = useState("");
  const [isRegisteringAttachment, setIsRegisteringAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [showMaterialSentForm, setShowMaterialSentForm] = useState(false);
  const [materialSentMode, setMaterialSentMode] =
    useState<MaterialSentMode>("catalog");
  const [commercialMaterials, setCommercialMaterials] = useState<
    CommercialMaterial[]
  >([]);
  const [isLoadingCommercialMaterials, setIsLoadingCommercialMaterials] =
    useState(false);
  const [commercialMaterialsError, setCommercialMaterialsError] = useState("");
  const [materialFilterCategory, setMaterialFilterCategory] = useState("");
  const [materialFilterRegion, setMaterialFilterRegion] = useState("");
  const [materialFilterSkinTone, setMaterialFilterSkinTone] = useState("");
  const [materialFilterSessions, setMaterialFilterSessions] = useState("");
  const [materialFilterAudience, setMaterialFilterAudience] = useState("");
  const [materialSentType, setMaterialSentType] =
    useState<LeadMaterialSentType>("before_after");
  const [materialSentName, setMaterialSentName] = useState("");
  const [materialSentFile, setMaterialSentFile] = useState<File | null>(null);
  const [materialSentNote, setMaterialSentNote] = useState("");
  const [isRegisteringMaterialSent, setIsRegisteringMaterialSent] =
    useState(false);
  const materialSentInputRef = useRef<HTMLInputElement | null>(null);
  const recentSavedHistoryFingerprintsRef = useRef<Set<string>>(new Set());
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [callScriptResult, setCallScriptResult] =
    useState<CallScriptResult | null>(null);
  const [isGeneratingCallScript, setIsGeneratingCallScript] = useState(false);
  const [callScriptError, setCallScriptError] = useState("");
  const journeyState = useMemo(
    () =>
      getQualificationJourneyState({
        lead,
        recentHistory: leadHistory,
      }),
    [lead, leadHistory]
  );
  const whatsappWindowState = useMemo(
    () =>
      getEstimatedWhatsAppWindowState({
        lead,
        recentHistory: leadHistory,
      }),
    [lead, leadHistory]
  );
  const materialCategoryOptions = useMemo(
    () => getUniqueMaterialOptions(commercialMaterials, "category"),
    [commercialMaterials]
  );
  const materialRegionOptions = useMemo(
    () => getUniqueMaterialOptions(commercialMaterials, "region"),
    [commercialMaterials]
  );
  const materialSkinToneOptions = useMemo(
    () => getUniqueMaterialOptions(commercialMaterials, "skinTone"),
    [commercialMaterials]
  );
  const materialAudienceOptions = useMemo(
    () => getUniqueMaterialOptions(commercialMaterials, "audience"),
    [commercialMaterials]
  );
  const materialSessionsOptions = useMemo(
    () =>
      Array.from(
        new Set(
          commercialMaterials
            .map((material) => material.sessionsCount)
            .filter((value): value is number => Boolean(value))
        )
      ).sort((a, b) => a - b),
    [commercialMaterials]
  );
  const filteredCommercialMaterials = useMemo(
    () =>
      commercialMaterials.filter((material) =>
        materialMatchesFilters({
          material,
          category: materialFilterCategory,
          region: materialFilterRegion,
          skinTone: materialFilterSkinTone,
          audience: materialFilterAudience,
          sessionsCount: materialFilterSessions,
        })
      ),
    [
      commercialMaterials,
      materialFilterAudience,
      materialFilterCategory,
      materialFilterRegion,
      materialFilterSessions,
      materialFilterSkinTone,
    ]
  );

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
    recentSavedHistoryFingerprintsRef.current = new Set();
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
    setShowAttachmentForm(false);
    setAttachmentFile(null);
    setAttachmentType("pix_receipt");
    setAttachmentNote("");
    setIsRegisteringAttachment(false);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
    setShowMaterialSentForm(false);
    setMaterialSentMode("catalog");
    setCommercialMaterials([]);
    setCommercialMaterialsError("");
    setMaterialFilterCategory("");
    setMaterialFilterRegion("");
    setMaterialFilterSkinTone("");
    setMaterialFilterSessions("");
    setMaterialFilterAudience("");
    setMaterialSentType("before_after");
    setMaterialSentName("");
    setMaterialSentFile(null);
    setMaterialSentNote("");
    setIsRegisteringMaterialSent(false);
    if (materialSentInputRef.current) {
      materialSentInputRef.current.value = "";
    }
    setShowNoteForm(false);
    setNoteText("");
    setIsSavingNote(false);
    setCallScriptResult(null);
    setIsGeneratingCallScript(false);
    setCallScriptError("");
    setShowApprovedResponseForm(false);
    resetApprovedResponseForm();
  }, [leadId]);

  useEffect(() => {
    if (!showMaterialSentForm || materialSentMode !== "catalog") return;
    if (commercialMaterials.length > 0 || isLoadingCommercialMaterials) return;
    if (commercialMaterialsError) return;

    void loadCommercialMaterials();
  }, [
    commercialMaterialsError,
    commercialMaterials.length,
    isLoadingCommercialMaterials,
    materialSentMode,
    showMaterialSentForm,
  ]);

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

  async function loadCommercialMaterials() {
    setIsLoadingCommercialMaterials(true);
    setCommercialMaterialsError("");

    try {
      const materials = await listCommercialMaterials(empresaId, {
        activeStatus: "active",
      });
      setCommercialMaterials(materials);
    } catch (error) {
      setCommercialMaterialsError(
        error instanceof Error
          ? error.message
          : "Erro ao carregar materiais cadastrados."
      );
    } finally {
      setIsLoadingCommercialMaterials(false);
    }
  }

  function hasDuplicateEvent(input: {
    eventName: string;
    description?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return isDuplicateHistoryEvent({
      history: leadHistory,
      eventName: input.eventName,
      description: input.description,
      metadata: input.metadata,
      recentFingerprints: recentSavedHistoryFingerprintsRef.current,
      limit: RECENT_DUPLICATE_HISTORY_LIMIT,
    });
  }

  function rememberSavedEvent(input: {
    eventName: string;
    description?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const fingerprint = buildHistoryEventFingerprint(input);

    if (fingerprint) {
      recentSavedHistoryFingerprintsRef.current.add(fingerprint);
    }
  }

  function resetAiAdaptationState() {
    setIsAdaptingWithAi(false);
    setAiAdaptationError("");
    setAiAdaptationInfo("");
    setAiSafetyNotes([]);
    setAiRequiresHumanReview(false);
    setAiAdapted(false);
    setAiKnowledgeCandidateCount(0);
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
    knowledgeCandidates: AiKnowledgeCandidate[];
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
    const aiJourneyState = getQualificationJourneyState({
      lead,
      recentHistory: leadHistory,
      currentMessage: input.customerMessage,
    });
    const timelineContext = getQualificationTimelineStateForAI({
      lead,
      recentHistory: leadHistory,
      currentMessage: input.customerMessage,
      journeyState: aiJourneyState,
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
        primaryApprovedResponse: {
          id: response.id,
          title: response.title,
          answerText: response.answerText.slice(0, MAX_AI_KNOWLEDGE_ANSWER_LENGTH),
          categoryName: input.match.categoryName,
          contextScope:
            input.match.contextScope === "current_context"
              ? "current_context"
              : "global",
          requiresHuman: response.requiresHuman,
          canAutoReply: response.canAutoReply,
        },
        knowledgeCandidates: input.knowledgeCandidates,
        useStrongModel: true,
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
        journeyContext: {
          currentCheckpoint: aiJourneyState.currentCheckpoint,
          currentLabel: aiJourneyState.currentLabel,
          nextCheckpoint: aiJourneyState.nextCheckpoint,
          nextLabel: aiJourneyState.nextLabel,
          pendingQuestion: aiJourneyState.pendingQuestion,
          knownFields: aiJourneyState.knownFields,
          guidance: aiJourneyState.guidance,
          timeline: {
            checkpoints: timelineContext.checkpoints,
            doneKeys: timelineContext.doneKeys,
            pendingKeys: timelineContext.pendingKeys,
            touchedKeys: timelineContext.touchedKeys,
            currentKey: timelineContext.currentKey ?? null,
            nextBestKey: timelineContext.nextBestKey ?? null,
            nextBestLabel: timelineContext.nextBestLabel ?? null,
            nextBestQuestion: timelineContext.nextBestQuestion ?? null,
            summaryForAI: timelineContext.summaryForAI,
          },
        },
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

  function createAiKnowledgeCandidates(matches: CommercialResponseMatch[]) {
    return matches
      .filter(
        (match) =>
          match.contextScope === "current_context" ||
          match.contextScope === "global"
      )
      .slice(0, MAX_AI_KNOWLEDGE_CANDIDATES)
      .map<AiKnowledgeCandidate>((match) => ({
        id: match.response.id,
        title: match.response.title,
        categoryName: match.categoryName,
        answerText: match.response.answerText.slice(
          0,
          MAX_AI_KNOWLEDGE_ANSWER_LENGTH
        ),
        exampleQuestions: match.response.exampleQuestions.slice(0, 8),
        tags: match.response.tags.slice(0, 10),
        score: match.score,
        contextScope:
          match.contextScope === "current_context"
            ? "current_context"
            : "global",
        requiresHuman: match.response.requiresHuman,
        canAutoReply: match.response.canAutoReply,
      }));
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
    const knowledgeCandidates = createAiKnowledgeCandidates(result.matches);

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
        knowledgeCandidates,
      });

      setReplyText(adapted.adaptedReply);
      setAiAdapted(true);
      setAiKnowledgeCandidateCount(knowledgeCandidates.length);
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
      setAiKnowledgeCandidateCount(0);
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
    const metadata = {
      event: "customer_message_received",
      source: "whatsapp_manual",
      messageText: trimmedMessage,
      assistedPanel: true,
    };

    if (!trimmedMessage) {
      setStatusMessage("Cole a mensagem recebida antes de registrar.");
      return;
    }

    if (
      hasDuplicateEvent({
        eventName: "customer_message_received",
        description: trimmedMessage,
        metadata,
      })
    ) {
      setStatusMessage(
        "Essa mensagem recebida já foi registrada neste atendimento."
      );
      return;
    }

    setIsRegisteringReceived(true);
    setStatusMessage("");

    try {
      await deferToNextFrame();
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Mensagem recebida do cliente",
        description: trimmedMessage,
        metadata,
      });

      rememberSavedEvent({
        eventName: "customer_message_received",
        description: trimmedMessage,
        metadata,
      });
      await onHistoryChanged?.();
      setReceivedMessage("");
      setStatusMessage("Mensagem recebida registrada.");
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
    const metadata = {
      event: "commercial_reply_sent",
      source: "whatsapp_manual",
      sendMode: "manual_whatsapp_desktop",
      channel: "whatsapp",
      sentByApi: false,
      apiMessageSent: false,
      manualSendConfirmed: true,
      registeredAfterManualSend: true,
      replyText: trimmedReply,
      assistedPanel: true,
      aiAdapted,
      aiKnowledgeCandidateCount,
      aiUsedKnowledgeBase: aiAdapted && aiKnowledgeCandidateCount > 0,
      approvedResponseId: suggestionMatch?.response.id ?? null,
      approvedResponseTitle: suggestionMatch?.response.title ?? null,
      journeyCheckpoint: journeyState.currentCheckpoint,
      journeyLabel: journeyState.currentLabel,
      whatsappWindowSnapshot: {
        lastCustomerMessageAt: whatsappWindowState.lastCustomerMessageAt,
        inside24hServiceWindow: whatsappWindowState.inside24hServiceWindow,
        hoursSinceLastCustomerMessage:
          whatsappWindowState.hoursSinceLastCustomerMessage,
        likelyInside72hAdWindow: whatsappWindowState.likelyInside72hAdWindow,
        estimatedCostRisk: whatsappWindowState.estimatedCostRisk,
      },
      requiresHumanReview:
        aiRequiresHumanReview || suggestionMatch?.response.requiresHuman === true,
    };

    if (!trimmedReply) {
      setStatusMessage("Escreva ou cole a resposta antes de registrar.");
      return;
    }

    if (
      hasDuplicateEvent({
        eventName: "commercial_reply_sent",
        description: trimmedReply,
        metadata,
      })
    ) {
      setStatusMessage("Essa resposta já foi registrada neste atendimento.");
      return;
    }

    setIsRegisteringReply(true);
    setStatusMessage("");

    try {
      await deferToNextFrame();
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Resposta enviada ao cliente",
        description: trimmedReply,
        metadata,
      });

      rememberSavedEvent({
        eventName: "commercial_reply_sent",
        description: trimmedReply,
        metadata,
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

      setReplyText("");
      setSuggestionMatch(null);
      setNextActionSuggestion(null);
      resetAiAdaptationState();
      setStatusMessage(`Resposta enviada registrada.${attemptMessage}`);
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

  async function handleRegisterAttachment() {
    if (!attachmentFile) {
      setStatusMessage("Escolha um arquivo para registrar.");
      return;
    }

    setIsRegisteringAttachment(true);
    setStatusMessage("");

    try {
      await deferToNextFrame();
      const trimmedNote = attachmentNote.trim();
      const description = trimmedNote
        ? `${attachmentFile.name}\n\n${trimmedNote}`
        : attachmentFile.name;
      const metadata = {
        event: "lead_attachment_received",
        source: "assisted_panel",
        attachmentType,
        fileName: attachmentFile.name,
        fileSize: attachmentFile.size,
        mimeType: attachmentFile.type || "application/octet-stream",
        assistedPanel: true,
      };

      if (
        hasDuplicateEvent({
          eventName: "lead_attachment_received",
          description,
          metadata,
        })
      ) {
        setStatusMessage("Esse anexo já foi registrado neste atendimento.");
        return;
      }

      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: getAttachmentTitle(attachmentType),
        description,
        metadata,
      });

      rememberSavedEvent({
        eventName: "lead_attachment_received",
        description,
        metadata,
      });
      await onHistoryChanged?.();
      setAttachmentFile(null);
      setAttachmentNote("");
      setShowAttachmentForm(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      setStatusMessage(
        "Upload de arquivos ainda não configurado. Registrei o anexo no histórico sem salvar o arquivo."
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar anexo: ${error.message}`
          : "Erro ao registrar anexo."
      );
    } finally {
      setIsRegisteringAttachment(false);
    }
  }

  function resetMaterialSentForm() {
    setMaterialSentMode("catalog");
    setMaterialFilterCategory("");
    setMaterialFilterRegion("");
    setMaterialFilterSkinTone("");
    setMaterialFilterSessions("");
    setMaterialFilterAudience("");
    setMaterialSentType("before_after");
    setMaterialSentName("");
    setMaterialSentFile(null);
    setMaterialSentNote("");
    if (materialSentInputRef.current) {
      materialSentInputRef.current.value = "";
    }
  }

  async function handleRegisterMaterialSent() {
    const materialLabel =
      MATERIAL_SENT_TYPE_OPTIONS.find(
        (option) => option.value === materialSentType
      )?.label ?? "Outro";
    const trimmedName = materialSentName.trim();
    const trimmedNote = materialSentNote.trim();
    const description = [
      trimmedName || materialSentFile?.name || materialLabel,
      trimmedNote,
    ]
      .filter(Boolean)
      .join("\n\n");
    const metadata = {
      event: "lead_material_sent",
      source: "assisted_panel",
      materialType: materialSentType,
      materialLabel,
      ...(materialSentFile
        ? {
            fileName: materialSentFile.name,
            fileSize: materialSentFile.size,
            mimeType: materialSentFile.type || "application/octet-stream",
          }
        : {}),
      assistedPanel: true,
    };

    if (
      hasDuplicateEvent({
        eventName: "lead_material_sent",
        description,
        metadata,
      })
    ) {
      setStatusMessage(
        "Esse material já foi registrado como enviado neste atendimento."
      );
      return;
    }

    setIsRegisteringMaterialSent(true);
    setStatusMessage("");

    try {
      await deferToNextFrame();
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: getMaterialSentTitle(materialSentType),
        description,
        metadata,
      });

      rememberSavedEvent({
        eventName: "lead_material_sent",
        description,
        metadata,
      });
      await onHistoryChanged?.();
      resetMaterialSentForm();
      setShowMaterialSentForm(false);
      setStatusMessage("Material enviado registrado no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar material enviado: ${error.message}`
          : "Erro ao registrar material enviado."
      );
    } finally {
      setIsRegisteringMaterialSent(false);
    }
  }

  async function handleCopyMaterialCaption(material: CommercialMaterial) {
    try {
      await navigator.clipboard.writeText(
        material.caption?.trim() || DEFAULT_MATERIAL_CAPTION
      );
      setCopyFeedbackMessage("Legenda copiada.");
    } catch {
      setCopyFeedbackMessage(
        "Não foi possível copiar a legenda automaticamente."
      );
    }
  }

  async function handleCopyMaterialImage(material: CommercialMaterial) {
    if (!material.publicUrl) {
      setCopyFeedbackMessage("Este material não tem imagem pública para copiar.");
      return;
    }

    if (
      !("ClipboardItem" in window) ||
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== "function"
    ) {
      setCopyFeedbackMessage(
        "Não foi possível copiar a imagem automaticamente. Abra a imagem e copie/baixe manualmente."
      );
      return;
    }

    try {
      const response = await fetch(material.publicUrl);
      const blob = await response.blob();
      const mimeType = blob.type || material.fileMimeType || "";

      if (!IMAGE_CLIPBOARD_TYPES.includes(mimeType)) {
        setCopyFeedbackMessage(
          "Só é possível copiar imagens JPG, PNG ou WebP. Abra a imagem e copie/baixe manualmente."
        );
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [mimeType]: blob,
        }),
      ]);
      setCopyFeedbackMessage("Imagem copiada. Agora cole no WhatsApp com Ctrl+V.");
    } catch {
      setCopyFeedbackMessage(
        "Não foi possível copiar a imagem automaticamente. Abra a imagem e copie/baixe manualmente."
      );
    }
  }

  async function handleRegisterCatalogMaterialSent(material: CommercialMaterial) {
    const description = `Material enviado: ${material.title}`;
    const metadata = {
      event: "lead_material_sent",
      source: "assisted_panel",
      materialId: material.id,
      materialTitle: material.title,
      materialType: material.materialType,
      materialCategory: material.category,
      materialRegion: material.region,
      materialSkinTone: material.skinTone,
      materialSessionsCount: material.sessionsCount,
      materialAudience: material.audience,
      fileName: material.fileName,
      mimeType: material.fileMimeType,
      fileSize: material.fileSize,
      publicUrl: material.publicUrl,
      storageBucket: material.storageBucket,
      storagePath: material.storagePath,
      caption: material.caption,
      sentMode: "manual_whatsapp_desktop",
      channel: "whatsapp",
      sentByApi: false,
      assistedPanel: true,
    };

    if (
      hasDuplicateEvent({
        eventName: "lead_material_sent",
        description,
        metadata,
      })
    ) {
      setStatusMessage(
        "Esse material já foi registrado como enviado neste atendimento."
      );
      return;
    }

    setIsRegisteringMaterialSent(true);
    setStatusMessage("");

    try {
      await deferToNextFrame();
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Material enviado",
        description,
        metadata,
      });

      rememberSavedEvent({
        eventName: "lead_material_sent",
        description,
        metadata,
      });
      await onHistoryChanged?.();
      setStatusMessage("Material enviado registrado no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar material enviado: ${error.message}`
          : "Erro ao registrar material enviado."
      );
    } finally {
      setIsRegisteringMaterialSent(false);
    }
  }

  async function handleCreateNote() {
    const trimmedNote = noteText.trim();

    if (!trimmedNote) {
      setStatusMessage("Digite uma observação antes de salvar.");
      return;
    }

    if (!onCreateNote) {
      setStatusMessage("Registro de observação ainda não conectado.");
      return;
    }

    setIsSavingNote(true);
    setStatusMessage("");

    try {
      const saved = await onCreateNote(trimmedNote);
      if (saved !== false) {
        setNoteText("");
        setShowNoteForm(false);
        setStatusMessage("Observação registrada no histórico.");
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar observação: ${error.message}`
          : "Erro ao registrar observação."
      );
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleMoveToQualification() {
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

  function formatCallScriptForCopy(script: CallScriptResult) {
    return [
      `Objetivo: ${script.callScript.objective}`,
      "",
      `Abertura: ${script.callScript.opening}`,
      "",
      "Perguntas essenciais:",
      ...script.callScript.keyQuestions.map((item) => `- ${item}`),
      "",
      "O que registrar:",
      ...script.callScript.whatToRegister.map((item) => `- ${item}`),
      "",
      `Proximo passo: ${script.callScript.nextStepIfPositive}`,
      "",
      `Se nao puder falar: ${script.callScript.ifClientCannotTalk}`,
    ].join("\n");
  }

  async function handleGenerateCallScript() {
    setIsGeneratingCallScript(true);
    setCallScriptError("");
    setStatusMessage("Gerando roteiro de ligação...");

    try {
      const result = await fetch("/api/comercial/ai/generate-call-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead: {
            id: lead.id,
            nome: lead.nome,
            telefone: lead.tel,
            funnel: lead.funnel,
            diaProsp: lead.diaProsp,
            campanha: lead.campanha ?? null,
          },
          journeyContext: {
            currentCheckpoint: journeyState.currentCheckpoint,
            currentLabel: journeyState.currentLabel,
            nextCheckpoint: journeyState.nextCheckpoint,
            nextLabel: journeyState.nextLabel,
            pendingQuestion: journeyState.pendingQuestion,
            knownFields: journeyState.knownFields,
            guidance: journeyState.guidance,
          },
          recentHistory: getRecentAiHistory(leadHistory).slice(0, 15),
          commercialContext: currentCommercialContext
            ? {
                name: currentCommercialContext.name,
                audienceLabel: currentCommercialContext.audienceLabel,
                campaignLabel: currentCommercialContext.campaignLabel,
              }
            : null,
        }),
      });

      const data = (await result.json().catch(() => ({}))) as
        | CallScriptResult
        | { error?: string };

      if (!result.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Erro ao gerar roteiro de ligação."
        );
      }

      if (!("callScript" in data)) {
        throw new Error("Resposta inválida da IA.");
      }

      setCallScriptResult(data);
      setStatusMessage("Roteiro de ligação gerado.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao gerar roteiro de ligação.";
      setCallScriptError(message);
      setStatusMessage(message);
    } finally {
      setIsGeneratingCallScript(false);
    }
  }

  async function handleCopyCallScript() {
    if (!callScriptResult) return;

    const text = formatCallScriptForCopy(callScriptResult);

    if (!navigator.clipboard) {
      setCallScriptError(
        "Não foi possível copiar automaticamente. Selecione o roteiro manualmente."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage("Roteiro copiado.");
      setCallScriptError("");
    } catch {
      setCallScriptError(
        "Não foi possível copiar automaticamente. Selecione o roteiro manualmente."
      );
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
        <p className="mt-1 text-xs text-[var(--text3)]">
          Envio manual: copie e envie pelo WhatsApp; depois registre aqui.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text2)]">
          {leadName && <span>Lead: {leadName}</span>}
          <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-0.5 font-semibold text-[var(--text2)]">
            {currentCommercialContext
              ? `Base usada: ${currentCommercialContext?.name ?? "contexto selecionado"}`
              : "Base usada: Global"}
          </span>
        </div>
        <QualificationTimeline
          lead={lead}
          history={leadHistory}
          journeyState={journeyState}
          isApplyingAction={isApplyingAction}
          onQualify={() => void handleMoveToQualification()}
        />
        <p className="mt-2 text-xs text-[var(--text3)]">
          {whatsappWindowState.label}
          {whatsappWindowState.estimatedCostRisk === "outside_window"
            ? " - envio manual registrado; se fosse API, poderia exigir template/custo."
            : ""}
        </p>
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
          <button
            type="button"
            onClick={() => setShowAttachmentForm((current) => !current)}
            className="ml-2 mt-2 rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            + Anexo
          </button>

          {showAttachmentForm && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Tipo
                  <select
                    value={attachmentType}
                    onChange={(event) =>
                      setAttachmentType(event.target.value as LeadAttachmentType)
                    }
                    className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  >
                    {ATTACHMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Arquivo
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) =>
                      setAttachmentFile(event.target.files?.[0] ?? null)
                    }
                    className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black"
                  />
                </label>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Observação opcional
                <input
                  value={attachmentNote}
                  onChange={(event) => setAttachmentNote(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                  placeholder="Ex: comprovante do sinal, foto da região, documento enviado..."
                />
              </label>

              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Upload de arquivos ainda não está configurado neste projeto. O
                CRM vai registrar o nome do arquivo no histórico.
              </p>

              <button
                type="button"
                disabled={isRegisteringAttachment || !attachmentFile}
                onClick={() => void handleRegisterAttachment()}
                className="mt-3 rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRegisteringAttachment ? "Registrando..." : "Registrar anexo"}
              </button>
            </div>
          )}
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

            <button
              type="button"
              onClick={() => setShowMaterialSentForm((current) => !current)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              + Material enviado
            </button>

            <button
              type="button"
              onClick={() => setShowNoteForm((current) => !current)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
            >
              + Observação
            </button>
          </div>
          {copyFeedbackMessage && (
            <p className="mt-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300">
              {copyFeedbackMessage}
            </p>
          )}

          {showMaterialSentForm && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMaterialSentMode("catalog")}
                  className={
                    materialSentMode === "catalog"
                      ? "rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-3 py-2 text-xs font-semibold text-[var(--accent)]"
                      : "rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                  }
                >
                  Escolher material cadastrado
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialSentMode("manual")}
                  className={
                    materialSentMode === "manual"
                      ? "rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-3 py-2 text-xs font-semibold text-[var(--accent)]"
                      : "rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                  }
                >
                  Registrar manualmente
                </button>
              </div>

              {materialSentMode === "catalog" && (
                <div>
                  <div className="grid gap-2 md:grid-cols-5">
                    <select
                      value={materialFilterCategory}
                      onChange={(event) =>
                        setMaterialFilterCategory(event.target.value)
                      }
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Todas categorias</option>
                      {materialCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {getMaterialCategoryLabel(category)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={materialFilterRegion}
                      onChange={(event) =>
                        setMaterialFilterRegion(event.target.value)
                      }
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Todas regiões</option>
                      {materialRegionOptions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>

                    <select
                      value={materialFilterSkinTone}
                      onChange={(event) =>
                        setMaterialFilterSkinTone(event.target.value)
                      }
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Todas peles</option>
                      {materialSkinToneOptions.map((skinTone) => (
                        <option key={skinTone} value={skinTone}>
                          {skinTone}
                        </option>
                      ))}
                    </select>

                    <select
                      value={materialFilterSessions}
                      onChange={(event) =>
                        setMaterialFilterSessions(event.target.value)
                      }
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Todas sessões</option>
                      {materialSessionsOptions.map((sessionsCount) => (
                        <option key={sessionsCount} value={sessionsCount}>
                          {getMaterialSessionsLabel(sessionsCount)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={materialFilterAudience}
                      onChange={(event) =>
                        setMaterialFilterAudience(event.target.value)
                      }
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Todos públicos</option>
                      {materialAudienceOptions.map((audience) => (
                        <option key={audience} value={audience}>
                          {audience}
                        </option>
                      ))}
                    </select>
                  </div>

                  {commercialMaterialsError && (
                    <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {commercialMaterialsError}
                    </p>
                  )}

                  {isLoadingCommercialMaterials ? (
                    <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)]">
                      Carregando materiais cadastrados...
                    </p>
                  ) : filteredCommercialMaterials.length === 0 ? (
                    <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
                      Nenhum material ativo encontrado com esses filtros.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      {filteredCommercialMaterials.map((material) => (
                        <article
                          key={material.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3"
                        >
                          <div className="flex gap-3">
                            {material.publicUrl ? (
                              <img
                                src={material.publicUrl}
                                alt={material.title}
                                className="h-20 w-20 rounded-lg border border-[var(--border2)] object-cover"
                              />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--border2)] bg-[var(--bg3)] text-center text-[10px] text-[var(--text3)]">
                                Sem imagem
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-[var(--text)]">
                                {material.title}
                              </h4>
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                                  {getMaterialCategoryLabel(material.category)}
                                </span>
                                {material.region && (
                                  <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                                    {material.region}
                                  </span>
                                )}
                                {material.skinTone && (
                                  <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                                    {material.skinTone}
                                  </span>
                                )}
                                {material.sessionsCount && (
                                  <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                                    {getMaterialSessionsLabel(
                                      material.sessionsCount
                                    )}
                                  </span>
                                )}
                                {material.audience && (
                                  <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                                    {material.audience}
                                  </span>
                                )}
                              </div>
                              {material.caption && (
                                <p className="mt-2 text-xs text-[var(--text3)]">
                                  {truncateMaterialText(material.caption)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!material.publicUrl}
                              onClick={() =>
                                void handleCopyMaterialImage(material)
                              }
                              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Copiar imagem
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyMaterialCaption(material)
                              }
                              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                            >
                              Copiar legenda
                            </button>
                            <button
                              type="button"
                              disabled={isRegisteringMaterialSent}
                              onClick={() =>
                                void handleRegisterCatalogMaterialSent(material)
                              }
                              className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Registrar enviado
                            </button>
                            {material.publicUrl && (
                              <a
                                href={material.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                              >
                                Abrir imagem
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {materialSentMode === "manual" && (
                <div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Tipo do material
                  <select
                    value={materialSentType}
                    onChange={(event) =>
                      setMaterialSentType(
                        event.target.value as LeadMaterialSentType
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  >
                    {MATERIAL_SENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Nome do arquivo ou material
                  <input
                    value={materialSentName}
                    onChange={(event) => setMaterialSentName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                    placeholder="Ex: Antes e depois - 1 sessão"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Arquivo opcional
                  <input
                    ref={materialSentInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) =>
                      setMaterialSentFile(event.target.files?.[0] ?? null)
                    }
                    className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Observação opcional
                  <input
                    value={materialSentNote}
                    onChange={(event) => setMaterialSentNote(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                    placeholder="Ex: enviei 1, 2 e 4 sessões."
                  />
                </label>
              </div>

              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Upload de arquivos ainda não está configurado neste projeto. O
                CRM vai registrar apenas as informações do material no
                histórico.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isRegisteringMaterialSent}
                  onClick={() => void handleRegisterMaterialSent()}
                  className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRegisteringMaterialSent
                    ? "Registrando..."
                    : "Registrar material enviado"}
                </button>

                <button
                  type="button"
                  disabled={isRegisteringMaterialSent}
                  onClick={() => {
                    resetMaterialSentForm();
                    setShowMaterialSentForm(false);
                  }}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
                </div>
              )}
            </div>
          )}

          {showNoteForm && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: pediu preço, ficou de responder amanhã, quer agendar..."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSavingNote || !noteText.trim()}
                  onClick={() => void handleCreateNote()}
                  className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingNote ? "Salvando..." : "Salvar observação"}
                </button>
                <button
                  type="button"
                  disabled={isSavingNote}
                  onClick={() => {
                    setShowNoteForm(false);
                    setNoteText("");
                  }}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
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
              {aiAdapted && aiKnowledgeCandidateCount > 1 && (
                <p className="mt-1 text-[var(--text3)]">
                  IA usou {aiKnowledgeCandidateCount} respostas aprovadas como
                  base.
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isGeneratingCallScript}
              onClick={() => void handleGenerateCallScript()}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingCallScript
                ? "Gerando roteiro..."
                : "Gerar roteiro de ligacao"}
            </button>

            <button
              type="button"
              onClick={() => setShowCallLogForm((current) => !current)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
            >
              {showCallLogForm
                ? "Ocultar registro de ligacao"
                : "Mostrar registro de ligacao"}
            </button>
          </div>
        </div>

        {callScriptError && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {callScriptError}
          </p>
        )}

        {callScriptResult && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3 text-sm text-[var(--text2)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Roteiro de ligacao
                </p>
                <p className="mt-1 text-xs text-[var(--text3)]">
                  Depois da ligacao, registre o resultado em Registrar ligacao.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyCallScript()}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                >
                  Copiar roteiro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallScriptResult(null);
                    setCallScriptError("");
                  }}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                >
                  Ocultar roteiro
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">
                  Objetivo
                </p>
                <p className="mt-1">{callScriptResult.callScript.objective}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text)]">
                  Abertura
                </p>
                <p className="mt-1">{callScriptResult.callScript.opening}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">
                    Perguntas essenciais
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {callScriptResult.callScript.keyQuestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">
                    O que registrar
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {callScriptResult.callScript.whatToRegister.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">
                    Proximo passo
                  </p>
                  <p className="mt-1">
                    {callScriptResult.callScript.nextStepIfPositive}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">
                    Se nao puder falar
                  </p>
                  <p className="mt-1">
                    {callScriptResult.callScript.ifClientCannotTalk}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {false && (
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
                ? `Contexto atual: ${currentCommercialContext?.name ?? "contexto selecionado"}. Respostas de outros contextos são ignoradas.`
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
      )}

      {statusMessage && (
        <div className="mt-3 rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs text-[var(--text2)]">
          {statusMessage}
        </div>
      )}
    </section>
  );
}
