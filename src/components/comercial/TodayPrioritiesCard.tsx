"use client";

import Link from "next/link";
import {
  getRecommendedCallLeads,
  type CallPriorityItem,
} from "@/lib/comercial/call-priorities";
import type { Lead } from "@/types/lead";

type TodayPrioritiesCardProps = {
  leads: Lead[];
  selectedLeadId?: string | number | null;
  onSelectLead?: (lead: Lead) => void;
  leadHref?: string;
};

type PriorityGroup = {
  id: string;
  title: string;
  description: string;
  leads: Lead[];
  actionLabel: string;
  badge: string;
  countOnly?: boolean;
};

const MAX_ITEMS_PER_GROUP = 5;
const MAX_CALL_ITEMS = 10;

function hasCompletedAttempt(lead: Lead) {
  return (lead.tentativas ?? []).some((tentativa) =>
    Boolean(tentativa.resultado?.trim())
  );
}

function hasPendingAttempt(lead: Lead) {
  return (lead.tentativas ?? []).some(
    (tentativa) => !tentativa.resultado?.trim()
  );
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;

  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function isTodayOrOverdue(value?: string | null) {
  const date = parseLocalDate(value);
  if (!date) return false;

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return date.getTime() <= todayOnly.getTime();
}

function sortByOldestActivity(first: Lead, second: Lead) {
  return (first.colAt ?? 0) - (second.colAt ?? 0);
}

function getGroups(leads: Lead[]): PriorityGroup[] {
  const activeLeads = leads.filter((lead) => !lead.archivedAt);
  const newProspection = activeLeads
    .filter(
      (lead) =>
        lead.funnel === "prospeccao" &&
        lead.diaProsp?.toLowerCase() === "d1" &&
        !hasCompletedAttempt(lead)
    )
    .sort(sortByOldestActivity);
  const pendingProspection = activeLeads
    .filter(
      (lead) =>
        lead.funnel === "prospeccao" &&
        !newProspection.some((item) => String(item.id) === String(lead.id)) &&
        hasPendingAttempt(lead)
    )
    .sort(sortByOldestActivity);
  const qualification = activeLeads
    .filter((lead) => lead.funnel === "qualificacao")
    .sort(sortByOldestActivity);
  const dueReturns = activeLeads
    .filter(
      (lead) =>
        (lead.funnel === "retorno" || Boolean(lead.retornoData)) &&
        isTodayOrOverdue(lead.retornoData)
    )
    .sort((first, second) => {
      const firstDate = parseLocalDate(first.retornoData)?.getTime() ?? 0;
      const secondDate = parseLocalDate(second.retornoData)?.getTime() ?? 0;
      return firstDate - secondDate;
    });
  const clients = activeLeads.filter((lead) => lead.funnel === "clientes");

  return [
    {
      id: "new-prospection",
      title: "Novos para primeiro contato",
      description: "D1 sem tentativa concluida.",
      leads: newProspection,
      actionLabel: "Fazer primeira acao",
      badge: "Novo",
    },
    {
      id: "pending-prospection",
      title: "Prospeccao com tentativa pendente",
      description: "Leads de prospeccao com tentativa ainda aberta.",
      leads: pendingProspection,
      actionLabel: "Continuar prospeccao",
      badge: "Prospeccao",
    },
    {
      id: "qualification",
      title: "Qualificacao em andamento",
      description: "Leads que ja estao em qualificacao.",
      leads: qualification,
      actionLabel: "Continuar atendimento",
      badge: "Qualificacao",
    },
    {
      id: "due-returns",
      title: "Retornos de hoje ou vencidos",
      description: "Retornos com data ate hoje.",
      leads: dueReturns,
      actionLabel: "Retomar contato",
      badge: "Retorno",
    },
    {
      id: "clients",
      title: "Clientes/fechados",
      description: "Contador simples de clientes carregados.",
      leads: clients,
      actionLabel: "Ver cliente",
      badge: "Cliente",
      countOnly: true,
    },
  ];
}

function formatLeadMeta(lead: Lead) {
  return [lead.funnel, lead.diaProsp].filter(Boolean).join(" / ");
}

function getLeadName(lead: Lead) {
  return lead.nome?.trim() || lead.tel || "Lead sem nome";
}

function getCallPriorityClass(priority: CallPriorityItem["priority"]) {
  if (priority === "alta") return "border-red-500/40 bg-red-500/10 text-red-300";
  if (priority === "media") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-[var(--border2)] bg-[var(--bg2)] text-[var(--text2)]";
}

function getItemClass(active: boolean) {
  return [
    "block w-full rounded-lg border bg-[var(--bg3)] p-3 text-left transition",
    "hover:border-[var(--accent)] hover:bg-[var(--bg4)]",
    active
      ? "border-[var(--accent)] ring-1 ring-[rgba(232,197,71,.35)]"
      : "border-[var(--border2)]",
  ].join(" ");
}

function OpenAction({ label }: { label: string }) {
  return (
    <span className="mt-3 inline-flex rounded-md border border-[var(--border2)] bg-[var(--bg2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
      {label}
    </span>
  );
}

function renderLeadItem(input: {
  lead: Lead;
  active: boolean;
  label: string;
  onSelectLead?: (lead: Lead) => void;
  leadHref?: string;
}) {
  const { lead, active, label, onSelectLead, leadHref } = input;
  const content = (
    <>
      <span className="block truncate text-xs font-semibold text-[var(--text)]">
        {getLeadName(lead)}
      </span>
      {lead.tel && (
        <span className="mt-1 block text-[11px] text-[var(--text3)]">
          {lead.tel}
        </span>
      )}
      <span className="mt-2 block text-[11px] text-[var(--text2)]">
        {formatLeadMeta(lead)}
      </span>
      <OpenAction label={label} />
    </>
  );
  const itemClass = getItemClass(active);

  return onSelectLead ? (
    <button
      key={lead.id}
      type="button"
      onClick={() => onSelectLead(lead)}
      className={itemClass}
    >
      {content}
    </button>
  ) : (
    <Link
      key={lead.id}
      href={leadHref ?? "/comercial/trabalho"}
      className={itemClass}
    >
      {content}
    </Link>
  );
}

export function TodayPrioritiesCard({
  leads,
  selectedLeadId = null,
  onSelectLead,
  leadHref,
}: TodayPrioritiesCardProps) {
  const groups = getGroups(leads);
  const callItems = getRecommendedCallLeads(leads);
  const recommendedCalls = callItems.slice(0, MAX_CALL_ITEMS);
  const hiddenCallCount = Math.max(callItems.length - recommendedCalls.length, 0);
  const totalPriorities = groups
    .filter((group) => !group.countOnly)
    .reduce((total, group) => total + group.leads.length, 0);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Prioridades de hoje
          </p>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Use esta lista para decidir quem atender primeiro hoje.
          </p>
        </div>

        <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-3 py-1 text-xs font-semibold text-[var(--text2)]">
          {totalPriorities} lead(s) com acao
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {groups.map((group) => {
          const visibleLeads = group.leads.slice(0, MAX_ITEMS_PER_GROUP);
          const hiddenCount = Math.max(group.leads.length - visibleLeads.length, 0);

          return (
            <div
              key={group.id}
              className="min-h-[220px] rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {group.title}
                    </p>
                    <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text3)]">
                      {group.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text3)]">
                    {group.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--border2)] px-2 py-0.5 text-xs font-semibold text-[var(--text2)]">
                  {group.leads.length}
                </span>
              </div>

              {group.countOnly ? (
                <p className="mt-3 text-xs text-[var(--text3)]">
                  Sem acao automatica nesta base.
                </p>
              ) : visibleLeads.length > 0 ? (
                <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {visibleLeads.map((lead) =>
                    renderLeadItem({
                      lead,
                      active: String(selectedLeadId) === String(lead.id),
                      label: leadHref ? "Abrir em Trabalho" : group.actionLabel,
                      onSelectLead,
                      leadHref,
                    })
                  )}

                  {hiddenCount > 0 && (
                    <p className="text-xs text-[var(--text3)]">
                      + {hiddenCount} outro(s)
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[var(--text3)]">
                  Nada urgente aqui agora.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">
              Ligacoes recomendadas
            </p>
            <p className="mt-1 text-xs text-[var(--text3)]">
              Clientes que podem precisar de ligacao agora.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-xs font-semibold text-[var(--text2)]">
            {callItems.length}
          </span>
        </div>

        {recommendedCalls.length > 0 ? (
          <div className="mt-3 grid max-h-[460px] grid-cols-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-2 xl:grid-cols-3">
            {recommendedCalls.map((item) => {
              const active = String(selectedLeadId) === String(item.leadId);
              const content = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[var(--text)]">
                        {item.nome}
                      </span>
                      <span className="mt-1 block text-[11px] text-[var(--text3)]">
                        {item.tel}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getCallPriorityClass(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                      {item.funnel}
                    </span>
                    <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                      {item.hasCallToday ? "ligacao ja feita hoje" : "sem ligacao hoje"}
                    </span>
                    {item.hasMessageToday && (
                      <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                        mensagem hoje
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--text2)]">
                    {item.reason}
                  </p>
                  <OpenAction label={leadHref ? "Abrir em Trabalho" : item.actionLabel} />
                </>
              );
              const itemClass = getItemClass(active);

              return onSelectLead ? (
                <button
                  key={item.leadId}
                  type="button"
                  onClick={() => onSelectLead(item.lead)}
                  className={itemClass}
                >
                  {content}
                </button>
              ) : (
                <Link
                  key={item.leadId}
                  href={leadHref ?? "/comercial/trabalho"}
                  className={itemClass}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-[var(--text3)]">
            Sem ligacoes recomendadas agora.
          </p>
        )}

        {hiddenCallCount > 0 && (
          <p className="mt-3 text-xs text-[var(--text3)]">
            + {hiddenCallCount} outro(s)
          </p>
        )}
      </div>
    </section>
  );
}
