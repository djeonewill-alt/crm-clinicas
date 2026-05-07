import { DIAS_PROSP, DIAS_QUALIF, DIAS_RETORNO } from "@/lib/constants/crm";
import type { FunnelId, Lead, Tentativa } from "@/types/lead";

export type QueueSort = "oldest" | "newest";

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getDiasByFunnel(funnel: string) {
  if (funnel === "qualificacao") return DIAS_QUALIF;
  if (funnel === "retorno") return DIAS_RETORNO;
  return DIAS_PROSP;
}

export function getExpectedDayForFunnel(funnel: FunnelId) {
  if (funnel === "qualificacao") return "q1";
  if (funnel === "retorno") return "r1";
  return "d1";
}

export function getDayConfig(lead: Lead) {
  const dias = getDiasByFunnel(lead.funnel);
  return dias.find((dia) => dia.id === lead.diaProsp) ?? dias[0];
}

export function getDayIndex(funnel: FunnelId, diaId: string) {
  const dias = getDiasByFunnel(funnel);
  return dias.findIndex((dia) => dia.id === diaId);
}

export function createTentativasForDay(funnel: FunnelId, diaId: string): Tentativa[] {
  const dias = getDiasByFunnel(funnel);
  const dayConfig = dias.find((dia) => dia.id === diaId) ?? dias[0];

  return dayConfig.tentativas.map((tentativa) => ({
    tipo: tentativa.tipo,
    resultado: "",
    obs: "",
    hora: "",
    feitoEm: null,
  }));
}

export function ensureTentativasForLead(lead: Lead): Tentativa[] {
  const dayConfig = getDayConfig(lead);
  const current = [...(lead.tentativas ?? [])];

  if (current.length >= dayConfig.tentativas.length) {
    return current;
  }

  const created = createTentativasForDay(lead.funnel, lead.diaProsp || dayConfig.id);

  return created.map((tentativa, index) => ({
    ...tentativa,
    ...(current[index] ?? {}),
  }));
}

export function countCompletedTentativas(tentativas?: Tentativa[]) {
  return (tentativas ?? []).filter((tentativa) => {
    return Boolean(tentativa.resultado && tentativa.resultado.trim() !== "");
  }).length;
}

export function getAttemptProgress(lead: Lead) {
  const dayConfig = getDayConfig(lead);
  const total = dayConfig?.tentativas?.length ?? 0;
  const completed = countCompletedTentativas(lead.tentativas);

  return {
    completed,
    total,
    isComplete: total > 0 && completed >= total,
  };
}

export function advanceLeadToNextDayIfComplete(lead: Lead): Lead {
  const progress = getAttemptProgress(lead);

  if (!progress.isComplete || lead.funnel === "clientes") {
    return lead;
  }

  const dias = getDiasByFunnel(lead.funnel);
  const currentIndex = getDayIndex(lead.funnel, lead.diaProsp);

  if (currentIndex < 0 || currentIndex >= dias.length - 1) {
    return lead;
  }

  const nextDay = dias[currentIndex + 1];

  return {
    ...lead,
    diaProsp: nextDay.id,
    tentativas: createTentativasForDay(lead.funnel, nextDay.id),
    colAt: Date.now(),
  };
}

export function moveLeadToPreviousDay(lead: Lead): Lead {
  if (lead.funnel === "clientes") {
    return lead;
  }

  const dias = getDiasByFunnel(lead.funnel);
  const currentIndex = getDayIndex(lead.funnel, lead.diaProsp);

  if (currentIndex <= 0) {
    return lead;
  }

  const previousDay = dias[currentIndex - 1];

  return {
    ...lead,
    diaProsp: previousDay.id,
    tentativas: createTentativasForDay(lead.funnel, previousDay.id),
    colAt: Date.now(),
  };
}

export function canMoveLeadToPreviousDay(lead: Lead) {
  if (lead.funnel === "clientes") return false;
  return getDayIndex(lead.funnel, lead.diaProsp) > 0;
}

export function shouldShowInSmartQueue(lead: Lead, funnel: FunnelId) {
  if (funnel === "clientes") {
    return lead.funnel === "clientes";
  }

  if (funnel === "retorno") {
    if (lead.funnel !== "retorno") return false;
    if (lead.fechado) return false;
    if (!lead.retornoData) return false;
    return lead.retornoData <= todayStr();
  }

  if (lead.funnel !== funnel) return false;
  if (lead.fechado) return false;

  const expectedDay = getExpectedDayForFunnel(funnel);
  const diaAtual = lead.diaProsp || expectedDay;

  if (diaAtual !== expectedDay) return false;

  const progress = getAttemptProgress(lead);

  if (progress.isComplete) return false;

  return true;
}

export function getQueueLeads(
  leads: Lead[],
  funnel: FunnelId,
  sort: QueueSort = "oldest"
) {
  const queue = leads.filter((lead) => shouldShowInSmartQueue(lead, funnel));

  return sortLeadsByDate(queue, sort);
}

export function getAllFunnelLeads(
  leads: Lead[],
  funnel: FunnelId,
  sort: QueueSort = "oldest"
) {
  const filtered = leads.filter((lead) => {
    if (funnel === "clientes") return lead.funnel === "clientes";
    if (funnel === "retorno") return lead.funnel === "retorno" && !lead.fechado;
    return lead.funnel === funnel && !lead.fechado;
  });

  return sortLeadsByDate(filtered, sort);
}

export function sortLeadsByDate(leads: Lead[], sort: QueueSort) {
  return [...leads].sort((a, b) => {
    const aTime = a.colAt ?? 0;
    const bTime = b.colAt ?? 0;

    if (sort === "newest") {
      return bTime - aTime;
    }

    return aTime - bTime;
  });
}

export function getRawFunnelCount(leads: Lead[], funnel: FunnelId) {
  if (funnel === "clientes") {
    return leads.filter((lead) => lead.funnel === "clientes").length;
  }

  if (funnel === "retorno") {
    return leads.filter((lead) => lead.funnel === "retorno" && !lead.fechado).length;
  }

  return leads.filter((lead) => lead.funnel === funnel && !lead.fechado).length;
}
