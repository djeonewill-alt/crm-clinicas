"use client";

import type { Lead } from "@/types/lead";

type LeadActionsProps = {
  lead: Lead;
  savingLeadId: string | number | null;
  retornoDate: string;
  canMovePreviousDay: boolean;
  onRetornoDateChange: (value: string) => void;
  onPreviousDay: (lead: Lead) => void | Promise<void>;
  onMoveToQualificacao: (lead: Lead) => void | Promise<void>;
  onCloseClient: (lead: Lead) => void | Promise<void>;
  onDisqualify: (lead: Lead) => void | Promise<void>;
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
  onRetornoDateChange,
  onPreviousDay,
  onMoveToQualificacao,
  onCloseClient,
  onDisqualify,
  onMoveToRetorno,
}: LeadActionsProps) {
  const isSaving = savingLeadId === lead.id;

  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--text3)]">
          Ações rápidas
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving || !canMovePreviousDay}
            onClick={() => onPreviousDay(lead)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] hover:bg-[var(--bg4)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↩️ Voltar dia
          </button>

          <a
            href={getWhatsAppUrl(lead.tel)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/20"
          >
            💬 WhatsApp
          </a>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onMoveToQualificacao(lead)}
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
          >
            ✅ Qualificar
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onCloseClient(lead)}
            className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-50"
          >
            💰 Fechar
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onDisqualify(lead)}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            🚫 Desqualificar
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-300">
          Retorno
        </p>

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
            className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
          >
            🔁 Enviar para retorno
          </button>
        </div>
      </div>
    </>
  );
}
