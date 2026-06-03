import type { LeadHistoryItem } from "@/types/lead-history";
import type { FunnelId, Lead } from "@/types/lead";

export type DailyCommercialReport = {
  date: string;
  formattedDate: string;
  newLeads: Lead[];
  workedLeadIds: Set<string>;
  newWorkedLeadIds: Set<string>;
  oldWorkedLeadIds: Set<string>;
  newLeadsByCampaign: Array<{ campaign: string; count: number }>;
  newLeadsByFunnel: Array<{ funnel: string; count: number }>;
  campaignSummary: Array<{
    campaign: string;
    newLeads: number;
    workedLeads: number;
    qualified: number;
    closed: number;
  }>;
  production: {
    messagesSent: number;
    customerReplies: number;
    callsMade: number;
    callsNoAnswer: number;
    postCallMessagesSent: number;
    materialsSent: number;
    notesAdded: number;
  };
  movement: {
    qualified: number;
    closed: number;
    returns: number;
    disqualified: number;
    scheduled: number;
  };
  conversion: {
    enteredToday: number;
    repliedToday: number;
    qualifiedToday: number;
    closedToday: number;
  };
};

const TIMEZONE = "America/Sao_Paulo";

const FUNNEL_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  retorno: "Retorno",
  clientes: "Clientes",
  remarketing: "Remarketing",
  desqualificado: "Desqualificados",
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateKeyInTimeZone(value: Date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function getSaoPauloDateKey(date = new Date()) {
  return formatDateKeyInTimeZone(date, TIMEZONE);
}

export function getDateKey(value?: string | number | null, timeZone = TIMEZONE) {
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return formatDateKeyInTimeZone(parsed, timeZone);
}

function formatPtBrDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}/${month}/${year}`;
}

function metadataEvent(item: LeadHistoryItem) {
  return String(item.metadata?.event ?? "");
}

function metadataText(item: LeadHistoryItem, key: string) {
  const value = item.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function isCallHistory(item: LeadHistoryItem) {
  const event = normalizeText(metadataEvent(item));
  const type = normalizeText(item.type);
  const attemptType = normalizeText(metadataText(item, "attemptType"));
  const titleDescription = normalizeText([item.title, item.description].filter(Boolean).join(" "));

  return (
    event === "call_logged" ||
    attemptType === "call" ||
    attemptType === "ligacao" ||
    (type === "attempt" && titleDescription.includes("ligacao")) ||
    titleDescription.includes("ligacao nao atendida")
  );
}

function isNoAnswerCall(item: LeadHistoryItem) {
  const text = normalizeText(
    [
      item.title,
      item.description,
      metadataText(item, "callResult"),
      metadataText(item, "callResultLabel"),
      metadataText(item, "resultado"),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return isCallHistory(item) && (text.includes("nao atendeu") || text.includes("no_answer"));
}

function groupCount<T>(
  items: T[],
  getLabel: (item: T) => string | undefined,
  emptyLabel: string
) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const label = getLabel(item)?.trim() || emptyLabel;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
}

function uniqueLeadIds(history: LeadHistoryItem[]) {
  return new Set(history.map((item) => String(item.lead_id)));
}

function leadEnteredOn(lead: Lead, dateKey: string, timeZone = TIMEZONE) {
  return getDateKey(lead.dataEntrada ?? null, timeZone) === dateKey;
}

function leadEnteredBefore(lead: Lead, dateKey: string, timeZone = TIMEZONE) {
  const entryKey = getDateKey(lead.dataEntrada ?? null, timeZone);
  return Boolean(entryKey && entryKey < dateKey);
}

function getFunnelLabel(funnel: FunnelId | string) {
  return FUNNEL_LABELS[funnel] ?? funnel;
}

export function buildDailyCommercialReport({
  leads,
  history,
  date,
  timezone = TIMEZONE,
}: {
  leads: Lead[];
  history: LeadHistoryItem[];
  date: string;
  timezone?: string;
}): DailyCommercialReport {
  const historyToday = history.filter(
    (item) => getDateKey(item.created_at, timezone) === date
  );
  const newLeads = leads.filter((lead) => leadEnteredOn(lead, date, timezone));
  const workedLeadIds = uniqueLeadIds(historyToday);
  const leadById = new Map(leads.map((lead) => [String(lead.id), lead]));
  const newLeadIds = new Set(newLeads.map((lead) => String(lead.id)));

  const newWorkedLeadIds = new Set(
    [...workedLeadIds].filter((leadId) => newLeadIds.has(leadId))
  );
  const oldWorkedLeadIds = new Set(
    [...workedLeadIds].filter((leadId) => {
      const lead = leadById.get(leadId);
      return lead ? leadEnteredBefore(lead, date, timezone) : false;
    })
  );

  const eventItems = historyToday.map((item) => ({
    item,
    event: metadataEvent(item),
  }));

  const customerReplyItems = eventItems.filter(
    ({ event }) => event === "customer_message_received"
  );
  const postCallItems = eventItems.filter(({ event }) => event === "post_call_message_sent");
  const prospectingCadenceMessageItems = eventItems.filter(
    ({ event }) =>
      event === "prospecting_followup_message_sent" ||
      event === "prospecting_final_message_sent"
  );
  const commercialReplyItems = eventItems.filter(
    ({ event }) => event === "commercial_reply_sent"
  );
  const materialItems = eventItems.filter(({ event }) => event === "lead_material_sent");
  const qualifiedItems = eventItems.filter(({ event }) => event === "lead_qualified");
  const closedItems = eventItems.filter(({ event }) => event === "lead_closed_with_schedule");
  const returnItems = eventItems.filter(
    ({ event }) => event === "return_scheduled" || event === "lead_sent_to_recovery"
  );
  const disqualifiedItems = eventItems.filter(({ event }) => event === "lead_disqualified");
  const callItems = historyToday.filter(isCallHistory);

  const campaignSummaryMap = new Map<
    string,
    { campaign: string; newLeads: number; workedLeads: Set<string>; qualified: number; closed: number }
  >();

  function ensureCampaign(campaign: string) {
    const label = campaign.trim() || "Sem campanha";
    const current =
      campaignSummaryMap.get(label) ??
      {
        campaign: label,
        newLeads: 0,
        workedLeads: new Set<string>(),
        qualified: 0,
        closed: 0,
      };

    campaignSummaryMap.set(label, current);
    return current;
  }

  newLeads.forEach((lead) => {
    ensureCampaign(lead.campanha ?? "").newLeads += 1;
  });

  workedLeadIds.forEach((leadId) => {
    const lead = leadById.get(leadId);
    if (lead) ensureCampaign(lead.campanha ?? "").workedLeads.add(leadId);
  });

  qualifiedItems.forEach(({ item }) => {
    const lead = leadById.get(String(item.lead_id));
    if (lead) ensureCampaign(lead.campanha ?? "").qualified += 1;
  });

  closedItems.forEach(({ item }) => {
    const lead = leadById.get(String(item.lead_id));
    if (lead) ensureCampaign(lead.campanha ?? "").closed += 1;
  });

  const campaignSummary = [...campaignSummaryMap.values()]
    .map((item) => ({
      campaign: item.campaign,
      newLeads: item.newLeads,
      workedLeads: item.workedLeads.size,
      qualified: item.qualified,
      closed: item.closed,
    }))
    .sort(
      (first, second) =>
        second.newLeads - first.newLeads ||
        second.workedLeads - first.workedLeads ||
        first.campaign.localeCompare(second.campaign)
    );

  return {
    date,
    formattedDate: formatPtBrDate(date),
    newLeads,
    workedLeadIds,
    newWorkedLeadIds,
    oldWorkedLeadIds,
    newLeadsByCampaign: groupCount(newLeads, (lead) => lead.campanha, "Sem campanha").map(
      ({ label, count }) => ({ campaign: label, count })
    ),
    newLeadsByFunnel: groupCount(newLeads, (lead) => getFunnelLabel(lead.funnel), "Outros").map(
      ({ label, count }) => ({ funnel: label, count })
    ),
    campaignSummary,
    production: {
      messagesSent:
        commercialReplyItems.length +
        postCallItems.length +
        prospectingCadenceMessageItems.length,
      customerReplies: customerReplyItems.length,
      callsMade: callItems.length,
      callsNoAnswer: historyToday.filter(isNoAnswerCall).length,
      postCallMessagesSent: postCallItems.length,
      materialsSent: materialItems.length,
      notesAdded: historyToday.filter((item) => item.type === "note" && !metadataEvent(item)).length,
    },
    movement: {
      qualified: qualifiedItems.length,
      closed: closedItems.length,
      returns: returnItems.length,
      disqualified: disqualifiedItems.length,
      scheduled: closedItems.length,
    },
    conversion: {
      enteredToday: newLeads.length,
      repliedToday: customerReplyItems.length,
      qualifiedToday: qualifiedItems.length,
      closedToday: closedItems.length,
    },
  };
}

export function formatDailyCommercialReportForCopy(report: DailyCommercialReport) {
  const campaignLines =
    report.newLeadsByCampaign.length > 0
      ? report.newLeadsByCampaign.map((item) => `* ${item.campaign}: ${item.count}`).join("\n")
      : "* Sem leads novos";

  return [
    `Relatório Comercial — ${report.formattedDate}`,
    "",
    "Leads novos:",
    `Total: ${report.newLeads.length}`,
    campaignLines,
    "",
    "Produção do dia:",
    `* Leads trabalhados: ${report.workedLeadIds.size}`,
    `* Mensagens enviadas: ${report.production.messagesSent}`,
    `* Respostas recebidas: ${report.production.customerReplies}`,
    `* Ligações feitas: ${report.production.callsMade}`,
    `* Ligações não atendidas: ${report.production.callsNoAnswer}`,
    `* Materiais enviados: ${report.production.materialsSent}`,
    "",
    "Movimentação:",
    `* Qualificados: ${report.movement.qualified}`,
    `* Fechados: ${report.movement.closed}`,
    `* Retorno/Futuro: ${report.movement.returns}`,
    `* Desqualificados: ${report.movement.disqualified}`,
    "",
    "Observação:",
    `* Leads antigos trabalhados hoje: ${report.oldWorkedLeadIds.size}`,
    `* Leads que entraram hoje e foram trabalhados: ${report.newWorkedLeadIds.size}`,
  ].join("\n");
}
