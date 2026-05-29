"use client";

import type { Lead } from "@/types/lead";

type TodayPrioritiesCardProps = {
  leads: Lead[];
  selectedLeadId: string | number | null;
  onSelectLead: (lead: Lead) => void;
  getLeadName: (lead: Lead) => string;
};

type PriorityGroup = {
  id: string;
  title: string;
  description: string;
  leads: Lead[];
  actionLabel: string;
  countOnly?: boolean;
};

const MAX_ITEMS_PER_GROUP = 5;

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
  const firstValue = first.colAt ?? 0;
  const secondValue = second.colAt ?? 0;

  return firstValue - secondValue;
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
      description: "D1 sem tentativa concluída.",
      leads: newProspection,
      actionLabel: "Fazer primeira ação",
    },
    {
      id: "pending-prospection",
      title: "Prospecção com tentativa pendente",
      description: "Leads de prospecção com tentativa ainda aberta.",
      leads: pendingProspection,
      actionLabel: "Continuar prospecção",
    },
    {
      id: "qualification",
      title: "Qualificação em andamento",
      description: "Leads que já estão em qualificação.",
      leads: qualification,
      actionLabel: "Continuar atendimento",
    },
    {
      id: "due-returns",
      title: "Retornos de hoje ou vencidos",
      description: "Retornos com data até hoje.",
      leads: dueReturns,
      actionLabel: "Retomar contato",
    },
    {
      id: "clients",
      title: "Clientes/fechados",
      description: "Contador simples de clientes carregados.",
      leads: clients,
      actionLabel: "Ver cliente",
      countOnly: true,
    },
  ];
}

function formatLeadMeta(lead: Lead) {
  return [lead.funnel, lead.diaProsp].filter(Boolean).join(" / ");
}

export function TodayPrioritiesCard({
  leads,
  selectedLeadId,
  onSelectLead,
  getLeadName,
}: TodayPrioritiesCardProps) {
  const groups = getGroups(leads);
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
          {totalPriorities} lead(s) com ação
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {groups.map((group) => {
          const visibleLeads = group.leads.slice(0, MAX_ITEMS_PER_GROUP);
          const hiddenCount = Math.max(
            group.leads.length - visibleLeads.length,
            0
          );

          return (
            <div
              key={group.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {group.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text3)]">
                    {group.description}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-xs font-semibold text-[var(--text2)]">
                  {group.leads.length}
                </span>
              </div>

              {group.countOnly ? (
                <p className="mt-3 text-xs text-[var(--text3)]">
                  Sem ação automática nesta base.
                </p>
              ) : visibleLeads.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {visibleLeads.map((lead) => {
                    const active = String(selectedLeadId) === String(lead.id);

                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => onSelectLead(lead)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? "border-[var(--accent)] bg-[rgba(232,197,71,.10)]"
                            : "border-[var(--border2)] bg-[var(--bg3)] hover:border-[var(--accent)]"
                        }`}
                      >
                        <span className="block truncate text-xs font-semibold text-[var(--text)]">
                          {getLeadName(lead)}
                        </span>
                        {lead.tel && (
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--text3)]">
                            {lead.tel}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-[var(--text2)]">
                          {formatLeadMeta(lead)}
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold text-[var(--accent)]">
                          {group.actionLabel}
                        </span>
                      </button>
                    );
                  })}

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

      <p className="mt-3 text-xs text-[var(--text3)]">
        Cliente respondeu - qualificar depende de histórico global e fica para
        uma próxima base.
      </p>
    </section>
  );
}
