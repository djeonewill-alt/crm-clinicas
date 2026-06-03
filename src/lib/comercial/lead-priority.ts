import { getAttemptProgress } from "@/lib/services/queue";
import type { Lead } from "@/types/lead";

export type LeadOperationalStatusTone =
  | "red"
  | "orange"
  | "yellow"
  | "blue"
  | "green"
  | "neutral"
  | "purple";

export type LeadOperationalStatus = {
  label: string;
  tone: LeadOperationalStatusTone;
  description: string;
};

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

function isOverdue(value?: string | null, date = new Date()) {
  const parsed = parseLocalDate(value);
  if (!parsed) return false;

  return parsed.getTime() < startOfToday(date).getTime();
}

function isToday(value?: string | null, date = new Date()) {
  const parsed = parseLocalDate(value);
  if (!parsed) return false;

  return parsed.getTime() === startOfToday(date).getTime();
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasPendingAttempt(lead: Lead) {
  return (lead.tentativas ?? []).some((attempt) => !attempt.resultado?.trim());
}

function hasAnyCompletedAttempt(lead: Lead) {
  return (lead.tentativas ?? []).some((attempt) => Boolean(attempt.resultado?.trim()));
}

export function getLeadOperationalStatus(lead: Lead, date = new Date()): LeadOperationalStatus {
  const funnel = normalizeText(lead.funnel);
  const progress = getAttemptProgress(lead);

  if (lead.archivedAt) {
    return {
      label: "Oculto",
      tone: "neutral",
      description: "Lead arquivado ou oculto.",
    };
  }

  if (lead.fechado || funnel === "clientes") {
    return {
      label: "Cliente",
      tone: "green",
      description: "Cliente ou lead fechado.",
    };
  }

  if (isOverdue(lead.retornoData, date)) {
    return {
      label: "Atrasado",
      tone: "red",
      description: "Retorno vencido.",
    };
  }

  if (isToday(lead.retornoData, date) || funnel === "retorno") {
    return {
      label: "Retorno",
      tone: "purple",
      description: isToday(lead.retornoData, date) ? "Retorno previsto para hoje." : "Lead em retorno.",
    };
  }

  if (funnel === "qualificacao") {
    if (hasPendingAttempt(lead) || !progress.isComplete) {
      return {
        label: "Qualif.",
        tone: "blue",
        description: "Qualificacao em andamento.",
      };
    }

    return {
      label: "Em dia",
      tone: "green",
      description: "Tentativas do dia concluidas.",
    };
  }

  if (!hasAnyCompletedAttempt(lead)) {
    return {
      label: "Novo",
      tone: "yellow",
      description: "Ainda sem tentativa concluida.",
    };
  }

  if (hasPendingAttempt(lead) || !progress.isComplete) {
    return {
      label: "Ação",
      tone: "orange",
      description: "Tem tentativa ou proximo contato pendente.",
    };
  }

  return {
    label: "Em dia",
    tone: "green",
    description: "Sem acao imediata clara.",
  };
}
