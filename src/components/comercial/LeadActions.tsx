"use client";

import type { Lead } from "@/types/lead";

type LeadActionsProps = {
  lead: Lead;
  savingLeadId: string | number | null;
  retornoDate: string;
  canMovePreviousDay: boolean;
  variant?: "default" | "compact";
  onRetornoDateChange: (value: string) => void;
  onPreviousDay: (lead: Lead) => void | Promise<void>;
  onMoveToQualificacao: (lead: Lead) => void | Promise<void>;
  onCloseClient: (lead: Lead) => void | Promise<void>;
  onDisqualify: (lead: Lead) => void | Promise<void>;
  onArchiveLead: () => void | Promise<void>;
  onMoveToRetorno: (lead: Lead) => void | Promise<void>;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getWhatsAppUrl(phone: string) {
  const digits = onlyDigits(phone);

  if (!digits) return "#";

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${normalized}`;
}

export function LeadActions({
  lead,
  savingLeadId,
  retornoDate,
  canMovePreviousDay,
  variant = "default",
  onRetornoDateChange,
  onPreviousDay,
  onMoveToQualificacao,
  onCloseClient,
  onDisqualify,
  onArchiveLead,
  onMoveToRetorno,
}: LeadActionsProps) {
  const isSaving = savingLeadId === lead.id;
  const buttonClass =
    variant === "compact"
      ? "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      : "rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  const actions = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={isSaving || !canMovePreviousDay}
        onClick={() => onPreviousDay(lead)}
        className={`${buttonClass} border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:bg-[var(--bg4)] hover:text-[var(--text)] disabled:opacity-40`}
      >
        Voltar dia
      </button>

      <a
        href={getWhatsAppUrl(lead.tel)}
        target="_blank"
        rel="noreferrer"
        className={`${buttonClass} border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20`}
      >
        WhatsApp
      </a>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => onMoveToQualificacao(lead)}
        className={`${buttonClass} border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20`}
      >
        Qualificar
      </button>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => onCloseClient(lead)}
        className={`${buttonClass} border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20`}
      >
        Fechar
      </button>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => onDisqualify(lead)}
        className={`${buttonClass} border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`}
      >
        Desqualificar
      </button>

      <button
        type="button"
        disabled={isSaving}
        onClick={onArchiveLead}
        className={`${buttonClass} border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20`}
      >
        Arquivar
      </button>
    </div>
  );

  const retornoControls = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={retornoDate}
        onChange={(event) => onRetornoDateChange(event.target.value)}
        className="rounded-lg border border-purple-500/30 bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text)] outline-none"
      />

      <button
        type="button"
        disabled={isSaving}
        onClick={() => onMoveToRetorno(lead)}
        className={`${buttonClass} border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20`}
      >
        Retorno
      </button>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {retornoControls}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--text3)]">
          Ações rápidas
        </p>

        <div className="mt-3">{actions}</div>
      </div>

      <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-300">
          Retorno
        </p>

        {retornoControls}
      </div>
    </>
  );
}
