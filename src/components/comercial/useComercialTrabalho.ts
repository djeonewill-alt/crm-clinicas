"use client";

import { useMemo, useState } from "react";
import { FUNNELS } from "@/lib/constants/crm";
import {
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
import type { Lead } from "@/types/lead";

export type VisibleFunnelId = (typeof FUNNELS)[number]["id"];
export type ListMode = "smart" | "all";

type UseComercialTrabalhoParams = {
  initialLeads: Lead[];
  empresaId: string | number;
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

  const activeFunnel = useMemo(() => {
    return FUNNELS.find((funnel) => funnel.id === workFunnel) ?? FUNNELS[0];
  }, [workFunnel]);

  const queuesByFunnel = useMemo(() => {
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
  const queueCount = filteredLeads.length;
  const rawCount = rawCounts[workFunnel] ?? 0;
  const hiddenCount =
    listMode === "smart" ? Math.max(rawCount - queueCount, 0) : 0;

  const selectedLead = useMemo(() => {
    const preferred = filteredLeads.find(
      (lead) => String(lead.id) === String(selectedLeadId)
    );

    return preferred ?? filteredLeads[0] ?? null;
  }, [filteredLeads, selectedLeadId]);

  function handleChangeFunnel(funnelId: VisibleFunnelId) {
    setWorkFunnel(funnelId);

    const firstLead = queuesByFunnel[funnelId]?.[0];

    setSelectedLeadId(firstLead?.id ?? null);
  }

  function selectNextLeadAfter(currentLeadId: Lead["id"]) {
    const nextLead = filteredLeads.find(
      (item) => String(item.id) !== String(currentLeadId)
    );

    setSelectedLeadId(nextLead?.id ?? null);
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
      await updateLeadCommercialFields(updatedLead);
      setMessage(successMessage);
    } catch (error) {
      setLeads(previousLeads);
      setMessage(
        error instanceof Error
          ? `Erro ao salvar: ${error.message}`
          : "Erro ao salvar alteração."
      );
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

    await saveUpdatedLead(updatedLead, "Tentativa salva com sucesso.");
  }

  async function handleAdvanceQueue(lead: Lead) {
    const advancedLead = advanceLeadToNextDayIfComplete(lead);

    if (advancedLead.diaProsp === lead.diaProsp) {
      selectNextLeadAfter(lead.id);
      setMessage("Avançou para o próximo lead da fila.");
      return;
    }

    await saveUpdatedLead(
      advancedLead,
      `Lead avançou para ${advancedLead.diaProsp}.`
    );

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

    await saveUpdatedLead(updatedLead, "Lead movido para Qualificação.");
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

    await saveUpdatedLead(
      updatedLead,
      `Lead enviado para Retorno em ${formatDate(retornoDate)}.`
    );

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

    await saveUpdatedLead(updatedLead, "Lead fechado como Cliente.");
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

    await saveUpdatedLead(updatedLead, "Lead desqualificado.");
    selectNextLeadAfter(lead.id);
  }

  async function handlePreviousDay(lead: Lead) {
    const previousLead = moveLeadToPreviousDay(lead);

    if (previousLead.diaProsp === lead.diaProsp) {
      setMessage("Este lead já está no primeiro dia do funil.");
      return;
    }

    await saveUpdatedLead(
      previousLead,
      `Lead voltou para ${previousLead.diaProsp}.`
    );

    setSelectedLeadId(previousLead.id);
  }

  return {
    workFunnel,
    activeFunnel,
    queuesByFunnel,
    rawCounts,
    filteredLeads,
    queueCount,
    hiddenCount,
    selectedLead,

    savingLeadId,
    message,

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

    setSelectedLeadId,

    getLeadName,
    getLastAction,

    handleChangeFunnel,
    handleCreateLead,
    handleSetResultado,
    handleAdvanceQueue,
    handleMoveToQualificacao,
    handleMoveToRetorno,
    handleCloseClient,
    handleDisqualify,
    handlePreviousDay,
  };
}
