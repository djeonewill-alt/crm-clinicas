"use client";

import { useEffect, useMemo, useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import {
  createLeadHistoryEvent,
  createLeadHistoryNote,
  listLeadHistory,
} from "@/lib/services/lead-history-client";
import {
  archiveLeadById,
  createLeadForEmpresa,
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
import type { Lead } from "@/types/lead";

export type VisibleFunnelId = (typeof FUNNELS)[number]["id"];
export type ListMode = "smart" | "all";

const FILTER_ALL = "all";
const EMPTY_FILTER_VALUE = "__empty__";

type UseComercialTrabalhoParams = {
  initialLeads: Lead[];
  empresaId: string | number;
};

type LeadDetailsInput = {
  nome: string;
  tel: string;
  esp?: string;
  campanha?: string;
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
      const createdLead = await createLeadForEmpresa({
        empresaId,
        nome: newLeadName,
        tel: newLeadPhone,
        esp: newLeadInterest,
        campanha: newLeadCampaign,
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
      setMessage("Novo lead criado em Prospecção / d1.");

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

    const saved = await saveUpdatedLead(
      updatedLead,
      "Lead movido para Qualificação."
    );

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
    }

    selectNextLeadAfter(lead.id);
  }

  async function handleMoveToRetorno(lead: Lead) {
    if (!retornoDate) {
      setMessage("Escolha uma data de retorno.");
      return;
    }

    const updatedLead: Lead = {
      ...lead,
      funnel: "retorno",
      diaProsp: "r1",
      tentativas: createTentativasForDay("retorno", "r1"),
      fechado: false,
      retornoData: retornoDate,
      colAt: Date.now(),
    };

    const saved = await saveUpdatedLead(
      updatedLead,
      `Lead enviado para Retorno em ${formatDate(retornoDate)}.`
    );

    if (saved) {
      await recordLeadHistoryEvent({
        leadId: updatedLead.id,
        type: "return_scheduled",
        title: "Retorno agendado",
        description: `Lead enviado para Retorno em ${formatDate(retornoDate)}.`,
        metadata: {
          event: "return_scheduled",
          retornoData: retornoDate,
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

  async function handleArchiveLead(lead: Lead) {
    const confirmArchive = window.confirm(
      "Arquivar este lead? Ele sairá da fila e dos funis, mas os dados e o histórico serão preservados."
    );

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
        title: "Lead arquivado",
        description: "Lead arquivado. Dados e histórico preservados.",
        metadata: {
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
      setMessage("Lead arquivado. Dados e histórico preservados.");
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
    handleCreateLeadNote,
    loadLeadHistory,
    handleSetResultado,
    handleAdvanceQueue,
    handleMoveToQualificacao,
    handleMoveToRetorno,
    handleCloseClient,
    handleDisqualify,
    handleArchiveLead,
    handlePreviousDay,
  };
}
