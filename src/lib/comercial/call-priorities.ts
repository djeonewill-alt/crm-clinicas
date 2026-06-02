import type { Lead, Tentativa } from "@/types/lead";

export type CallPriorityLevel = "alta" | "media" | "baixa";

export type CallPriorityItem = {
  leadId: string | number;
  lead: Lead;
  nome: string;
  tel: string;
  funnel: string;
  priority: CallPriorityLevel;
  reason: string;
  actionLabel: string;
  hasCallToday: boolean;
  hasMessageToday: boolean;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;

  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function startOfToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isTodayOrOverdue(value?: string | null, date = new Date()) {
  const parsed = parseLocalDate(value);
  if (!parsed) return false;

  return parsed.getTime() <= startOfToday(date).getTime();
}

function isAttemptFromToday(attempt: Tentativa, date = new Date()) {
  const rawDate = attempt.feitoEm ?? attempt.hora ?? null;
  if (!rawDate) return false;

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.toDateString() === date.toDateString();
}

function attemptMatchesType(attempt: Tentativa, type: "call" | "message") {
  const text = normalizeText(
    [attempt.tipo, attempt.acao, attempt.resultado, attempt.obs].filter(Boolean).join(" ")
  );

  if (type === "call") {
    return (
      text.includes("ligacao") ||
      text.includes("ligar") ||
      text.includes("call") ||
      text.includes("nao atendeu") ||
      text.includes("nao-atendeu")
    );
  }

  return (
    text.includes("mensagem") ||
    text.includes("whatsapp") ||
    text.includes("enviada") ||
    text.includes("msg")
  );
}

function hasCompletedAttempt(lead: Lead) {
  return (lead.tentativas ?? []).some((attempt) => Boolean(attempt.resultado?.trim()));
}

function hasPendingAttempt(lead: Lead) {
  return (lead.tentativas ?? []).some((attempt) => !attempt.resultado?.trim());
}

export function hasCallAttemptToday(lead: Lead, date = new Date()) {
  return (lead.tentativas ?? []).some(
    (attempt) => isAttemptFromToday(attempt, date) && attemptMatchesType(attempt, "call")
  );
}

export function hasMessageAttemptToday(lead: Lead, date = new Date()) {
  return (lead.tentativas ?? []).some(
    (attempt) => isAttemptFromToday(attempt, date) && attemptMatchesType(attempt, "message")
  );
}

function shouldExcludeLead(lead: Lead) {
  const funnel = normalizeText(lead.funnel);
  return (
    Boolean(lead.archivedAt) ||
    Boolean(lead.fechado) ||
    !lead.tel?.trim() ||
    funnel === "clientes" ||
    funnel === "desqualificado" ||
    funnel === "arquivado"
  );
}

export function getCallPriorityForLead(lead: Lead, date = new Date()): CallPriorityItem | null {
  if (shouldExcludeLead(lead)) return null;

  const hasCallToday = hasCallAttemptToday(lead, date);
  const hasMessageToday = hasMessageAttemptToday(lead, date);
  const funnel = normalizeText(lead.funnel);
  const dueReturn = isTodayOrOverdue(lead.retornoData, date);

  if (dueReturn && !hasCallToday) {
    return {
      leadId: lead.id,
      lead,
      nome: lead.nome?.trim() || lead.tel,
      tel: lead.tel,
      funnel: lead.funnel,
      priority: "alta",
      reason: "Retorno de hoje/vencido.",
      actionLabel: "Ligar para retomar contato",
      hasCallToday,
      hasMessageToday,
    };
  }

  if (funnel === "qualificacao" && !hasCallToday) {
    return {
      leadId: lead.id,
      lead,
      nome: lead.nome?.trim() || lead.tel,
      tel: lead.tel,
      funnel: lead.funnel,
      priority: "alta",
      reason: "Qualificacao em andamento - ligacao pode destravar o proximo passo.",
      actionLabel: "Ligar para qualificar",
      hasCallToday,
      hasMessageToday,
    };
  }

  if (funnel === "prospeccao" && hasPendingAttempt(lead) && !hasCallToday) {
    return {
      leadId: lead.id,
      lead,
      nome: lead.nome?.trim() || lead.tel,
      tel: lead.tel,
      funnel: lead.funnel,
      priority: "media",
      reason: "Prospeccao com tentativa de ligacao pendente.",
      actionLabel: "Tentar ligacao",
      hasCallToday,
      hasMessageToday,
    };
  }

  if (funnel === "qualificacao" && hasMessageToday) {
    return {
      leadId: lead.id,
      lead,
      nome: lead.nome?.trim() || lead.tel,
      tel: lead.tel,
      funnel: lead.funnel,
      priority: "media",
      reason: "Cliente demonstrou interesse, mas ainda precisa avancar.",
      actionLabel: "Ligar se nao respondeu",
      hasCallToday,
      hasMessageToday,
    };
  }

  if (
    funnel === "prospeccao" &&
    normalizeText(lead.diaProsp) === "d1" &&
    hasCompletedAttempt(lead)
  ) {
    return {
      leadId: lead.id,
      lead,
      nome: lead.nome?.trim() || lead.tel,
      tel: lead.tel,
      funnel: lead.funnel,
      priority: "baixa",
      reason: "Primeiro contato enviado - ligacao opcional se houver tempo.",
      actionLabel: "Ligar se couber na agenda",
      hasCallToday,
      hasMessageToday,
    };
  }

  return null;
}

const priorityWeight: Record<CallPriorityLevel, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export function getRecommendedCallLeads(leads: Lead[], date = new Date()) {
  return leads
    .map((lead) => getCallPriorityForLead(lead, date))
    .filter((item): item is CallPriorityItem => Boolean(item))
    .sort((first, second) => {
      const priorityDiff = priorityWeight[first.priority] - priorityWeight[second.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const firstDue = isTodayOrOverdue(first.lead.retornoData, date) ? 0 : 1;
      const secondDue = isTodayOrOverdue(second.lead.retornoData, date) ? 0 : 1;
      if (firstDue !== secondDue) return firstDue - secondDue;

      const firstFunnel = first.lead.funnel === "qualificacao" ? 0 : 1;
      const secondFunnel = second.lead.funnel === "qualificacao" ? 0 : 1;
      if (firstFunnel !== secondFunnel) return firstFunnel - secondFunnel;

      if (first.hasCallToday !== second.hasCallToday) {
        return first.hasCallToday ? 1 : -1;
      }

      return (first.lead.colAt ?? 0) - (second.lead.colAt ?? 0);
    });
}
