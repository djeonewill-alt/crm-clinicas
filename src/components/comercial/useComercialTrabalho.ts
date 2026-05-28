"use client";

import { useEffect, useMemo, useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import { resolveCommercialContextForCampaign } from "@/lib/comercial/commercial-context-resolver";
import {
  createLeadHistoryEvent,
  createLeadHistoryNote,
  listLeadHistory,
} from "@/lib/services/lead-history-client";
import {
  archiveLeadById,
  createLeadForEmpresa,
  deleteLeadAndHistory,
  updateLeadCommercialContext,
  updateLeadCommercialFields,
} from "@/lib/services/leads-client";
import {
  advanceLeadToNextDayIfComplete,
  createTentativasForDay,
  ensureTentativasForLead,
  getAllFunnelLeads,
  getQueueLeads,
  getRawFunnelCount,
  moveLeadToPreviousDay,
} from "@/lib/services/queue";
import type { LeadHistoryItem } from "@/types/lead-history";
import type { LeadHistoryType } from "@/types/lead-history";
import type { CommercialContext } from "@/types/commercial-contexts";
import type { Lead } from "@/types/lead";

export type VisibleFunnelId = (typeof FUNNELS)[number]["id"];
export type ListMode = "smart" | "all";

const FILTER_ALL = "all";
const EMPTY_FILTER_VALUE = "__empty__";

type UseComercialTrabalhoParams = {
  initialLeads: Lead[];
  empresaId: string | number;
  commercialContexts?: CommercialContext[];
};

type LeadDetailsInput = {
  nome: string;
  tel: string;
  esp?: string;
  campanha?: string;
};

type ScheduleReturnInput = {
  returnDate?: string;
  note?: string;
};

type ArchiveLeadOptions = {
  recovery?: boolean;
  source?: string;
  reason?: string;
  skipConfirm?: boolean;
};

export type MarkLeadAttemptResult = {
  marked: boolean;
  message: string;
};

type MarkLeadAttemptInput = {
  leadId: string | number;
  attemptType: "message" | "call";
  source: "assisted_reply_sent" | "call_logged";
  result?: string;
  note?: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function leadMatchesSearch(lead: Lead, normalizedSearch: string) {
  if (!normalizedSearch) return true;

  const searchable = [
    lead.nome,
    lead.tel,
    lead.esp,
    lead.campanha,
    lead.diaProsp,
    String(lead.valor ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedSearch);
}

function normalizeFilterValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : EMPTY_FILTER_VALUE;
}

function getCampaignLabel(value: string) {
  return value === EMPTY_FILTER_VALUE ? "Sem campanha" : value;
}

function getInterestLabel(value: string) {
  return value === EMPTY_FILTER_VALUE ? "Sem interesse" : value;
}

function getAttemptTipo(attemptType: MarkLeadAttemptInput["attemptType"]) {
  return attemptType === "call" ? "ligacao" : "mensagem";
}

function getAttemptResult(input: MarkLeadAttemptInput) {
  if (input.attemptType === "message") return "enviada";

  const resultMap: Record<string, string> = {
    answered: "respondeu",
    no_answer: "nao-atendeu",
    dropped: "caiu",
    busy: "ocupado",
    asked_return: "respondeu",
    not_interested: "rejeitou",
    scheduled: "respondeu",
    pay_later: "respondeu",
    needs_human: "respondeu",
  };

  return resultMap[input.result ?? ""] ?? "respondeu";
}

function buildFilterOptions(
  leads: Lead[],
  getValue: (lead: Lead) => string | undefined,
  getLabel: (value: string) => string
) {
  const options = new Map<string, string>();

  leads.forEach((lead) => {
    const rawValue = getValue(lead)?.trim();
    const value = normalizeFilterValue(rawValue);

    if (!options.has(value)) {
      options.set(value, rawValue || getLabel(value));
    }
  });

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function getLeadName(lead: Lead) {
  return lead.nome?.trim() || lead.tel || "Lead sem nome";
}

export function getLastAction(lead: Lead) {
  const tentativas = lead.tentativas ?? [];
  const completed = tentativas.filter((tentativa) => tentativa.resultado);
  const last = completed[completed.length - 1];

  if (!last) return "🆕 Sem contato";

  const key = last.resultado || last.acao || "";

  const labels: Record<string, string> = {
    respondeu: "✅ Respondeu",
    agendou: "📅 Agendou",
    enviada: "📤 Mensagem enviada",
    enviado: "📤 Enviado",
    msg_enviada: "📱 Mensagem enviada",
    "nao-atendeu": "📵 Não atendeu",
    nao_atendeu: "📵 Não atendeu",
    "nao-entregue": "❌ Não entregue",
    nao_respondeu: "❌ Não respondeu",
    visualizado: "👁️ Visualizado",
    aberto: "👁️ Aberto",
    caiu: "📞 Caiu",
    rejeitou: "🚫 Rejeitou",
    ocupado: "💼 Ocupado",
  };

  return labels[key] ?? `📍 ${key || "Ação registrada"}`;
}

export function useComercialTrabalho({
  initialLeads,
  empresaId,
  commercialContexts = [],
}: UseComercialTrabalhoParams) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [workFunnel, setWorkFunnel] = useState<VisibleFunnelId>("prospeccao");
  const [selectedLeadId, setSelectedLeadId] = useState<string | number | null>(
    null
  );
  const [savingLeadId, setSavingLeadId] = useState<string | number | null>(null);
  const [message, setMessage] = useState("");
  const [retornoDate, setRetornoDate] = useState(todayInputValue());
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadInterest, setNewLeadInterest] = useState("");
  const [newLeadCampaign, setNewLeadCampaign] = useState("");
  const [listMode, setListMode] = useState<ListMode>("smart");
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState(FILTER_ALL);
  const [selectedInterest, setSelectedInterest] = useState(FILTER_ALL);
  const [leadHistory, setLeadHistory] = useState<LeadHistoryItem[]>([]);
  const [isLoadingLeadHistory, setIsLoadingLeadHistory] = useState(false);
  const [isSavingLeadHistory, setIsSavingLeadHistory] = useState(false);
  const [leadHistoryError, setLeadHistoryError] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const hasActiveSearch = normalizedSearch.length > 0;
  const hasActiveFilters =
    hasActiveSearch ||
    selectedCampaign !== FILTER_ALL ||
    selectedInterest !== FILTER_ALL;

  const activeFunnel = useMemo(() => {
    return FUNNELS.find((funnel) => funnel.id === workFunnel) ?? FUNNELS[0];
  }, [workFunnel]);

  const queuesBeforeSearch = useMemo(() => {
    return FUNNELS.reduce(
      (acc, funnel) => {
        acc[funnel.id] =
          listMode === "smart"
            ? getQueueLeads(leads, funnel.id, "oldest")
            : getAllFunnelLeads(leads, funnel.id, "oldest");

        return acc;
      },
      {} as Record<VisibleFunnelId, Lead[]>
    );
  }, [leads, listMode]);

  const campaignOptions = useMemo(
    () => buildFilterOptions(leads, (lead) => lead.campanha, getCampaignLabel),
    [leads]
  );

  const interestOptions = useMemo(
    () => buildFilterOptions(leads, (lead) => lead.esp, getInterestLabel),
    [leads]
  );
  const newLeadContextResolution = useMemo(
    () =>
      resolveCommercialContextForCampaign({
        campaign: newLeadCampaign,
        contexts: commercialContexts,
      }),
    [commercialContexts, newLeadCampaign]
  );
  const newLeadSuggestedContext = newLeadContextResolution.context;
  const newLeadContextSuggestionMessage = newLeadCampaign.trim()
    ? "Base global: nenhum contexto compatível encontrado."
    : "";

  const queuesByFunnel = useMemo(() => {
    if (!hasActiveFilters) return queuesBeforeSearch;

    return FUNNELS.reduce(
      (acc, funnel) => {
        acc[funnel.id] = queuesBeforeSearch[funnel.id].filter((lead) => {
          const matchesCampaign =
            selectedCampaign === FILTER_ALL ||
            normalizeFilterValue(lead.campanha) === selectedCampaign;
          const matchesInterest =
            selectedInterest === FILTER_ALL ||
            normalizeFilterValue(lead.esp) === selectedInterest;

          return (
            leadMatchesSearch(lead, normalizedSearch) &&
            matchesCampaign &&
            matchesInterest
          );
        });
        return acc;
      },
      {} as Record<VisibleFunnelId, Lead[]>
    );
  }, [
    hasActiveFilters,
    normalizedSearch,
    queuesBeforeSearch,
    selectedCampaign,
    selectedInterest,
  ]);

  const rawCounts = useMemo(() => {
    return FUNNELS.reduce(
      (acc, funnel) => {
        acc[funnel.id] = getRawFunnelCount(leads, funnel.id);
        return acc;
      },
      {} as Record<VisibleFunnelId, number>
    );
  }, [leads]);

  const filteredLeads = queuesByFunnel[workFunnel] ?? [];
  const queueCount = queuesBeforeSearch[workFunnel]?.length ?? 0;
  const filteredCount = filteredLeads.length;
  const rawCount = rawCounts[workFunnel] ?? 0;
  const hiddenCount =
    listMode === "smart" ? Math.max(rawCount - queueCount, 0) : 0;

  const selectedLead = useMemo(() => {
    const preferred = filteredLeads.find(
      (lead) => String(lead.id) === String(selectedLeadId)
    );

    return preferred ?? filteredLeads[0] ?? null;
  }, [filteredLeads, selectedLeadId]);

  useEffect(() => {
    const isSelectedLeadVisible = filteredLeads.some(
      (lead) => String(lead.id) === String(selectedLeadId)
    );

    if (isSelectedLeadVisible) return;

    const nextSelectedLeadId = filteredLeads[0]?.id ?? null;

    if (String(selectedLeadId) === String(nextSelectedLeadId)) return;

    setSelectedLeadId(nextSelectedLeadId);
  }, [filteredLeads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      setLeadHistory([]);
      setLeadHistoryError(null);
      return;
    }

    void loadLeadHistory(String(selectedLead.id));
  }, [selectedLead?.id]);

  async function loadLeadHistory(leadId: string) {
    setIsLoadingLeadHistory(true);
    setLeadHistoryError(null);

    try {
      const items = await listLeadHistory({
        leadId,
        empresaId: String(empresaId),
      });
      setLeadHistory(items);
    } catch (error) {
      setLeadHistory([]);
      setLeadHistoryError(
        error instanceof Error
          ? `Erro ao carregar histórico: ${error.message}`
          : "Erro ao carregar histórico."
      );
    } finally {
      setIsLoadingLeadHistory(false);
    }
  }

  function handleChangeFunnel(funnelId: VisibleFunnelId) {
    setWorkFunnel(funnelId);

    const firstLead = queuesByFunnel[funnelId]?.[0];

    setSelectedLeadId(firstLead?.id ?? null);
  }

  function clearSearch() {
    setSearch("");
  }

  function clearFilters() {
    setSearch("");
    setSelectedCampaign(FILTER_ALL);
    setSelectedInterest(FILTER_ALL);
  }

  function selectNextLeadAfter(currentLeadId: Lead["id"]) {
    const nextLead = filteredLeads.find(
      (item) => String(item.id) !== String(currentLeadId)
    );

    setSelectedLeadId(nextLead?.id ?? null);
  }

  async function recordLeadHistoryEvent(input: {
    leadId: Lead["id"];
    type: LeadHistoryType;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      const createdItem = await createLeadHistoryEvent({
        leadId: String(input.leadId),
        empresaId: String(empresaId),
        type: input.type,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
      });

      if (selectedLead && String(selectedLead.id) === String(input.leadId)) {
        setLeadHistory((current) => [createdItem, ...current]);
      }
    } catch (error) {
      console.error("Erro ao registrar histórico automático:", error);
    }
  }

  async function saveUpdatedLead(updatedLead: Lead, successMessage: string) {
    setSavingLeadId(updatedLead.id);
    setMessage("");

    const previousLeads = leads;

    setLeads((current) =>
      current.map((lead) =>
        String(lead.id) === String(updatedLead.id) ? updatedLead : lead
      )
    );

    try {
      await updateLeadCommercialFields({
        empresaId,
        lead: updatedLead,
      });
      setMessage(successMessage);
      return true;
    } catch (error) {
      setLeads(previousLeads);
      setMessage(
        error instanceof Error
          ? `Erro ao salvar: ${error.message}`
          : "Erro ao salvar alteração."
      );
      return false;
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handleCreateLead() {
    setMessage("");

    if (!newLeadPhone.trim()) {
      setMessage("Digite ao menos o telefone do lead.");
      return;
    }

    setSavingLeadId("new-lead");

    try {
      const contextResolution = resolveCommercialContextForCampaign({
        campaign: newLeadCampaign,
        contexts: commercialContexts,
      });
      const autoContext = contextResolution.context;
      const createdLead = await createLeadForEmpresa({
        empresaId,
        nome: newLeadName,
        tel: newLeadPhone,
        esp: newLeadInterest,
        campanha: newLeadCampaign,
        commercialContextId: autoContext?.id ?? null,
        tentativas: createTentativasForDay("prospeccao", "d1"),
      });

      setLeads((current) => [createdLead, ...current]);
      setWorkFunnel("prospeccao");
      setListMode("smart");
      setSelectedLeadId(createdLead.id);
      setShowNewLeadForm(false);
      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadInterest("");
      setNewLeadCampaign("");
      setMessage(
        autoContext
          ? `Novo lead criado em Prospecção / d1. Contexto aplicado automaticamente: ${autoContext.name}.`
          : "Novo lead criado em Prospecção / d1."
      );

      await recordLeadHistoryEvent({
        leadId: createdLead.id,
        type: "status_change",
        title: "Lead criado",
        description: "Lead criado manualmente em Prospecção / d1.",
        metadata: {
          event: "lead_created",
          source: "manual",
          funnel: "prospeccao",
          diaProsp: "d1",
          commercialContextAutoApplied: Boolean(autoContext),
          commercialContextId: autoContext?.id ?? null,
          commercialContextName: autoContext?.name ?? null,
          campaignUsedForContext: newLeadCampaign.trim() || null,
          commercialContextMatchReason: contextResolution.reason,
        },
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Erro ao criar lead: ${error.message}`
          : "Erro ao criar lead."
      );
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handleUpdateLeadDetails(input: LeadDetailsInput) {
    setMessage("");

    if (!selectedLead) {
      setMessage("Selecione um lead para editar.");
      return false;
    }

    if (!input.tel.trim()) {
      setMessage("Digite ao menos o telefone do lead.");
      return false;
    }

    const updatedLead: Lead = {
      ...selectedLead,
      nome: input.nome.trim(),
      tel: input.tel.trim(),
      esp: input.esp?.trim() || "",
      campanha: input.campanha?.trim() || "",
      colAt: Date.now(),
    };

    const saved = await saveUpdatedLead(
      updatedLead,
      "Lead atualizado com sucesso."
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "status_change",
        title: "Lead atualizado",
        description: "Dados do lead atualizados.",
        metadata: {
          event: "lead_updated",
        },
      });
    }

    return saved;
  }

  async function handleUpdateCommercialContext(contextId: string | null) {
    setMessage("");

    if (!selectedLead) {
      setMessage("Selecione um lead para alterar o contexto.");
      return false;
    }

    const previousContextId = selectedLead.commercialContextId ?? null;
    const newContextId = contextId || null;

    if (previousContextId === newContextId) {
      setMessage("Contexto comercial mantido.");
      return true;
    }

    const newContext =
      commercialContexts.find((context) => context.id === newContextId) ?? null;

    const previousLeads = leads;
    setSavingLeadId(selectedLead.id);

    try {
      const updatedLead = await updateLeadCommercialContext({
        empresaId,
        leadId: selectedLead.id,
        commercialContextId: newContextId,
      });

      setLeads((current) =>
        current.map((lead) =>
          String(lead.id) === String(updatedLead.id) ? updatedLead : lead
        )
      );
      setMessage("Contexto comercial atualizado.");

      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "note",
        title: "Contexto comercial atualizado",
        description: newContext
          ? `Contexto comercial alterado para: ${newContext.name}`
          : "Contexto comercial removido do lead.",
        metadata: {
          event: "commercial_context_updated",
          source: "lead_detail",
          previousContextId,
          newContextId,
          newContextName: newContext?.name ?? null,
        },
      });

      return true;
    } catch (error) {
      setLeads(previousLeads);
      setMessage(
        error instanceof Error
          ? `Erro ao salvar contexto: ${error.message}`
          : "Erro ao salvar contexto."
      );
      return false;
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handleCreateLeadNote(description: string) {
    setLeadHistoryError(null);

    if (!selectedLead) {
      setLeadHistoryError("Selecione um lead para registrar observação.");
      return false;
    }

    if (!empresaId) {
      setLeadHistoryError("Empresa atual não encontrada.");
      return false;
    }

    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setLeadHistoryError("Digite uma observação antes de salvar.");
      return false;
    }

    setIsSavingLeadHistory(true);

    try {
      const createdItem = await createLeadHistoryNote({
        leadId: String(selectedLead.id),
        empresaId: String(empresaId),
        description: trimmedDescription,
      });

      setLeadHistory((current) => [createdItem, ...current]);
      setLeadHistoryError(null);
      return true;
    } catch (error) {
      setLeadHistoryError(
        error instanceof Error
          ? `Erro ao salvar observação: ${error.message}`
          : "Erro ao salvar observação."
      );
      return false;
    } finally {
      setIsSavingLeadHistory(false);
    }
  }

  async function handleSetResultado(
    lead: Lead,
    tentativaIndex: number,
    resultado: string
  ) {
    const tentativas = ensureTentativasForLead(lead);
    const now = new Date();

    const updatedTentativas = tentativas.map((tentativa, index) => {
      if (index !== tentativaIndex) return tentativa;

      return {
        ...tentativa,
        resultado,
        hora: now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        feitoEm: now.toISOString(),
      };
    });

    const updatedLead: Lead = {
      ...lead,
      tentativas: updatedTentativas,
      colAt: Date.now(),
      prospectadoEm: lead.prospectadoEm ?? Date.now(),
      respondeuAt:
        resultado === "respondeu" || resultado === "agendou"
          ? Date.now()
          : lead.respondeuAt ?? null,
    };

    const saved = await saveUpdatedLead(
      updatedLead,
      "Tentativa salva com sucesso."
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "attempt",
        title: "Tentativa registrada",
        description: `Resultado registrado: ${resultado}.`,
        metadata: {
          event: "attempt_recorded",
          tentativaIndex,
          resultado,
        },
      });
    }
  }

  async function handleMarkNextLeadAttempt(
    input: MarkLeadAttemptInput
  ): Promise<MarkLeadAttemptResult> {
    const lead =
      leads.find((item) => String(item.id) === String(input.leadId)) ?? null;

    if (!lead) {
      return {
        marked: false,
        message: "Registro salvo, mas o lead não está mais visível na fila.",
      };
    }

    const attemptTipo = getAttemptTipo(input.attemptType);
    const tentativas = ensureTentativasForLead(lead);
    const tentativaIndex = tentativas.findIndex(
      (tentativa) => tentativa.tipo === attemptTipo && !tentativa.resultado
    );

    if (tentativaIndex < 0) {
      return {
        marked: false,
        message: "Registro salvo, mas não havia tentativa pendente para marcar.",
      };
    }

    const now = new Date();
    const resultado = getAttemptResult(input);
    const updatedTentativas = tentativas.map((tentativa, index) => {
      if (index !== tentativaIndex) return tentativa;

      return {
        ...tentativa,
        resultado,
        hora: now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        feitoEm: now.toISOString(),
        obs: input.note?.trim() || tentativa.obs || "",
      };
    });

    const updatedLead: Lead = {
      ...lead,
      tentativas: updatedTentativas,
      colAt: Date.now(),
      prospectadoEm: lead.prospectadoEm ?? Date.now(),
      respondeuAt:
        resultado === "respondeu"
          ? Date.now()
          : lead.respondeuAt ?? null,
    };

    const saved = await saveUpdatedLead(
      updatedLead,
      "Tentativa marcada automaticamente."
    );

    if (!saved) {
      return {
        marked: false,
        message:
          "Registro salvo, mas não foi possível marcar a tentativa automaticamente.",
      };
    }

    await recordLeadHistoryEvent({
      leadId: updatedLead.id,
      type: "attempt",
      title:
        input.attemptType === "call"
          ? "Tentativa de ligação marcada"
          : "Tentativa de mensagem marcada",
      description:
        input.attemptType === "call"
          ? "Tentativa de ligação marcada a partir do registro de ligação."
          : "Tentativa de mensagem marcada a partir da resposta enviada.",
      metadata: {
        event: "attempt_marked_from_assisted_flow",
        attemptType: input.attemptType,
        source: input.source,
        tentativaIndex,
        resultado,
      },
    });

    return {
      marked: true,
      message:
        input.attemptType === "call"
          ? "Tentativa de ligação marcada."
          : "Tentativa de mensagem marcada.",
    };
  }

  async function handleAdvanceQueue(lead: Lead) {
    const advancedLead = advanceLeadToNextDayIfComplete(lead);

    if (advancedLead.diaProsp === lead.diaProsp) {
      selectNextLeadAfter(lead.id);
      setMessage("Avançou para o próximo lead da fila.");
      return;
    }

    const saved = await saveUpdatedLead(
      advancedLead,
      `Lead avançou para ${advancedLead.diaProsp}.`
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: advancedLead.id,
        type: "status_change",
        title: "Lead avançou de dia",
        description: `Lead avançou para ${advancedLead.diaProsp}.`,
        metadata: {
          event: "lead_day_advanced",
          fromDiaProsp: lead.diaProsp,
          toDiaProsp: advancedLead.diaProsp,
        },
      });
    }

    selectNextLeadAfter(lead.id);
  }

  async function handleMoveToQualificacao(lead: Lead) {
    const previousWorkFunnel = workFunnel;
    const previousSelectedLeadId = selectedLeadId;

    const updatedLead: Lead = {
      ...lead,
      funnel: "qualificacao",
      diaProsp: "q1",
      tentativas: createTentativasForDay("qualificacao", "q1"),
      fechado: false,
      retornoData: null,
      qualificadoEm: Date.now(),
      colAt: Date.now(),
    };

    setWorkFunnel("qualificacao");
    setSelectedLeadId(updatedLead.id);

    const saved = await saveUpdatedLead(
      updatedLead,
      "Lead movido para Qualificação."
    );

    if (!saved) {
      setWorkFunnel(previousWorkFunnel);
      setSelectedLeadId(previousSelectedLeadId);
      return;
    }

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "status_change",
        title: "Lead movido para Qualificação",
        description: "Lead movido para Qualificação / q1.",
        metadata: {
          event: "lead_qualified",
          fromFunnel: lead.funnel,
          toFunnel: "qualificacao",
          diaProsp: "q1",
        },
      });

      await loadLeadHistory(String(updatedLead.id));
    }
  }

  async function handleMoveToRetorno(lead: Lead, input?: ScheduleReturnInput) {
    const scheduledReturnDate = input?.returnDate || retornoDate;
    const returnNote = input?.note?.trim();

    if (!scheduledReturnDate) {
      setMessage("Escolha uma data de retorno.");
      return;
    }

    const updatedLead: Lead = {
      ...lead,
      funnel: "retorno",
      diaProsp: "r1",
      tentativas: createTentativasForDay("retorno", "r1"),
      fechado: false,
      retornoData: scheduledReturnDate,
      colAt: Date.now(),
    };

    const saved = await saveUpdatedLead(
      updatedLead,
      `Lead enviado para Retorno em ${formatDate(scheduledReturnDate)}.`
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "return_scheduled",
        title: "Retorno agendado",
        description: [
          `Lead enviado para Retorno em ${formatDate(scheduledReturnDate)}.`,
          returnNote ? `Observação: ${returnNote}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: {
          event: "return_scheduled",
          retornoData: scheduledReturnDate,
          note: returnNote ?? null,
          fromFunnel: lead.funnel,
          toFunnel: "retorno",
        },
      });
    }

    selectNextLeadAfter(lead.id);
  }

  async function handleCloseClient(lead: Lead) {
    const confirmClose = window.confirm(
      `Fechar ${getLeadName(lead)} como cliente?`
    );

    if (!confirmClose) return;

    const updatedLead: Lead = {
      ...lead,
      funnel: "clientes",
      fechado: true,
      fechadoEm: Date.now(),
      colAt: Date.now(),
    };

    const saved = await saveUpdatedLead(
      updatedLead,
      "Lead fechado como Cliente."
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "closed",
        title: "Lead fechado como Cliente",
        description: "Lead fechado como Cliente.",
        metadata: {
          event: "lead_closed",
          fromFunnel: lead.funnel,
          toFunnel: "clientes",
        },
      });
    }

    selectNextLeadAfter(lead.id);
  }

  async function handleDisqualify(lead: Lead) {
    const confirmDisqualify = window.confirm(
      `Desqualificar ${getLeadName(lead)}?`
    );

    if (!confirmDisqualify) return;

    const updatedLead: Lead = {
      ...lead,
      funnel: "desqualificado",
      fechado: false,
      colAt: Date.now(),
    };

    const saved = await saveUpdatedLead(updatedLead, "Lead desqualificado.");

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "disqualified",
        title: "Lead desqualificado",
        description: "Lead desqualificado.",
        metadata: {
          event: "lead_disqualified",
          fromFunnel: lead.funnel,
          toFunnel: "desqualificado",
        },
      });
    }

    selectNextLeadAfter(lead.id);
  }

  async function handleArchiveLead(lead: Lead, options?: ArchiveLeadOptions) {
    const isRecovery = options?.recovery === true;
    const confirmMessage = isRecovery
      ? "Enviar este lead para recuperação futura? Ele sairá da fila principal, mas poderá ser restaurado depois em Arquivados."
      : "Arquivar este lead? Ele sairá da fila e dos funis, mas os dados e o histórico serão preservados.";
    const confirmArchive = options?.skipConfirm
      ? true
      : window.confirm(confirmMessage);

    if (!confirmArchive) return;

    const nextLead = filteredLeads.find(
      (item) => String(item.id) !== String(lead.id)
    );

    setSavingLeadId(lead.id);
    setMessage("");

    try {
      await archiveLeadById({
        empresaId,
        leadId: lead.id,
      });

      await recordLeadHistoryEvent({
        leadId: lead.id,
        type: "status_change",
        title: isRecovery
          ? "Lead enviado para recuperação futura"
          : "Lead arquivado",
        description: isRecovery
          ? "Lead arquivado como recuperação futura. Dados e histórico preservados para reativação posterior."
          : "Lead arquivado. Dados e histórico preservados.",
        metadata: isRecovery
          ? {
              event: "lead_sent_to_recovery",
              source: options?.source ?? "manual",
              reason: options?.reason ?? "cadence_exhausted",
              funnelBefore: lead.funnel,
              diaProsp: lead.diaProsp,
              tentativas: lead.tentativas ?? [],
            }
          : {
              event: "lead_archived",
              fromFunnel: lead.funnel,
            },
      });

      setLeads((current) =>
        current.filter((item) => String(item.id) !== String(lead.id))
      );
      setSelectedLeadId((current) =>
        String(current) === String(lead.id) ? nextLead?.id ?? null : current
      );
      setMessage(
        isRecovery
          ? "Lead enviado para recuperação futura. Ele pode ser restaurado em Arquivados."
          : "Lead arquivado. Dados e histórico preservados."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Erro ao arquivar lead: ${error.message}`
          : "Erro ao arquivar lead."
      );
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handleDeleteLead(lead: Lead) {
    const confirmed = window.confirm(
      "Excluir este cliente definitivamente? O histórico dele também será removido. Essa ação não pode ser desfeita."
    );

    if (!confirmed) return;

    const typedConfirmation = window.prompt(
      'Digite "EXCLUIR" para confirmar a exclusão definitiva.'
    );

    if (typedConfirmation !== "EXCLUIR") {
      setMessage("Exclusão cancelada.");
      return;
    }

    setSavingLeadId(lead.id);
    setMessage("");

    try {
      await deleteLeadAndHistory({
        empresaId,
        leadId: lead.id,
      });

      setLeads((current) =>
        current.filter((item) => String(item.id) !== String(lead.id))
      );
      setLeadHistory([]);
      setSelectedLeadId(null);
      setMessage("Cliente excluído com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Não foi possível excluir. Verifique permissões do banco. Detalhe: ${error.message}`
          : "Não foi possível excluir. Verifique permissões do banco."
      );
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handlePreviousDay(lead: Lead) {
    const previousLead = moveLeadToPreviousDay(lead);

    if (previousLead.diaProsp === lead.diaProsp) {
      setMessage("Este lead já está no primeiro dia do funil.");
      return;
    }

    const saved = await saveUpdatedLead(
      previousLead,
      `Lead voltou para ${previousLead.diaProsp}.`
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: previousLead.id,
        type: "status_change",
        title: "Lead voltou de dia",
        description: `Lead voltou para ${previousLead.diaProsp}.`,
        metadata: {
          event: "lead_day_reverted",
          fromDiaProsp: lead.diaProsp,
          toDiaProsp: previousLead.diaProsp,
        },
      });
    }

    setSelectedLeadId(previousLead.id);
  }

  return {
    workFunnel,
    activeFunnel,
    queuesByFunnel,
    rawCounts,
    filteredLeads,
    queueCount,
    filteredCount,
    hiddenCount,
    selectedLead,
    leadHistory,

    savingLeadId,
    message,
    isLoadingLeadHistory,
    isSavingLeadHistory,
    leadHistoryError,

    retornoDate,
    setRetornoDate,

    showNewLeadForm,
    setShowNewLeadForm,

    newLeadName,
    setNewLeadName,
    newLeadPhone,
    setNewLeadPhone,
    newLeadInterest,
    setNewLeadInterest,
    newLeadCampaign,
    setNewLeadCampaign,
    newLeadSuggestedContext,
    newLeadContextSuggestionMessage,

    listMode,
    setListMode,
    search,
    setSearch,
    selectedCampaign,
    setSelectedCampaign,
    campaignOptions,
    selectedInterest,
    setSelectedInterest,
    interestOptions,
    hasActiveSearch,
    hasActiveFilters,
    clearSearch,
    clearFilters,

    setSelectedLeadId,

    getLeadName,
    getLastAction,

    handleChangeFunnel,
    handleCreateLead,
    handleUpdateLeadDetails,
    handleUpdateCommercialContext,
    handleCreateLeadNote,
    loadLeadHistory,
    handleSetResultado,
    handleMarkNextLeadAttempt,
    handleAdvanceQueue,
    handleMoveToQualificacao,
    handleMoveToRetorno,
    handleCloseClient,
    handleDisqualify,
    handleArchiveLead,
    handleDeleteLead,
    handlePreviousDay,
  };
}
