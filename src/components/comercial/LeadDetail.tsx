"use client";

import { useState } from "react";
import { LeadActions } from "@/components/comercial/LeadActions";
import { LeadAssistedServicePanel } from "@/components/comercial/LeadAssistedServicePanel";
import { LeadEditForm } from "@/components/comercial/LeadEditForm";
import { LeadHistory } from "@/components/comercial/LeadHistory";
import { LeadMessageScripts } from "@/components/comercial/LeadMessageScripts";
import { TentativasList } from "@/components/comercial/TentativasList";
import {
  canMoveLeadToPreviousDay,
  ensureTentativasForLead,
  getAttemptProgress,
} from "@/lib/services/queue";
import type { LeadHistoryItem } from "@/types/lead-history";
import type { Lead } from "@/types/lead";

type LeadDetailProps = {
  lead: Lead | null;
  empresaId: string | number;
  savingLeadId: string | number | null;
  retornoDate: string;
  leadHistory: LeadHistoryItem[];
  isLoadingLeadHistory: boolean;
  isSavingLeadHistory: boolean;
  leadHistoryError: string | null;
  onRetornoDateChange: (value: string) => void;
  onPreviousDay: (lead: Lead) => void | Promise<void>;
  onMoveToQualificacao: (lead: Lead) => void | Promise<void>;
  onCloseClient: (lead: Lead) => void | Promise<void>;
  onDisqualify: (lead: Lead) => void | Promise<void>;
  onArchiveLead: () => void | Promise<void>;
  onMoveToRetorno: (lead: Lead) => void | Promise<void>;
  onUpdateLeadDetails: (data: {
    nome: string;
    tel: string;
    esp?: string;
    campanha?: string;
  }) => boolean | void | Promise<boolean | void>;
  onSetResultado: (
    lead: Lead,
    tentativaIndex: number,
    resultado: string
  ) => void | Promise<void>;
  onCreateLeadNote: (
    description: string
  ) => boolean | void | Promise<boolean | void>;
  onRefreshLeadHistory: (leadId: string) => void | Promise<void>;
  onAdvanceQueue: (lead: Lead) => void | Promise<void>;
  getLastAction: (lead: Lead) => string;
};

function getLeadName(lead: Lead) {
  return lead.nome?.trim() || lead.tel || "Lead sem nome";
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

export function LeadDetail({
  lead,
  empresaId,
  savingLeadId,
  retornoDate,
  leadHistory,
  isLoadingLeadHistory,
  isSavingLeadHistory,
  leadHistoryError,
  onRetornoDateChange,
  onPreviousDay,
  onMoveToQualificacao,
  onCloseClient,
  onDisqualify,
  onArchiveLead,
  onMoveToRetorno,
  onUpdateLeadDetails,
  onSetResultado,
  onCreateLeadNote,
  onRefreshLeadHistory,
  onAdvanceQueue,
  getLastAction,
}: LeadDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showLegacyScripts, setShowLegacyScripts] = useState(false);

  if (!lead) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center text-sm text-[var(--text3)]">
        Nenhum lead ativo nesta fila.
      </div>
    );
  }

  const progress = getAttemptProgress(lead);
  const tentativas = ensureTentativasForLead(lead);
  const isSaving = savingLeadId === lead.id;

  return (
    <div className="rounded-2xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-lg font-semibold">{getLeadName(lead)}</h2>
          <p className="mt-1 text-sm text-[var(--text2)]">{lead.tel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] hover:bg-[var(--bg4)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? "Fechar edição" : "Editar"}
          </button>

          <span className="rounded-full bg-[rgba(232,197,71,.15)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {lead.diaProsp || "d1"}
          </span>
        </div>
      </div>

      {isEditing && (
        <LeadEditForm
          lead={lead}
          onCancel={() => setIsEditing(false)}
          onSave={async (data) => {
            const saved = await onUpdateLeadDetails(data);
            if (saved !== false) {
              setIsEditing(false);
            }
            return saved;
          }}
        />
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text3)]">
            Progresso do dia
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {progress.completed}/{progress.total} tentativas concluídas
          </p>
          <p className="mt-1 text-xs text-[var(--text2)]">
            Última ação: {getLastAction(lead)}
          </p>
        </div>

        <LeadActions
          lead={lead}
          savingLeadId={savingLeadId}
          retornoDate={retornoDate}
          canMovePreviousDay={canMoveLeadToPreviousDay(lead)}
          onRetornoDateChange={onRetornoDateChange}
          onPreviousDay={onPreviousDay}
          onMoveToQualificacao={onMoveToQualificacao}
          onCloseClient={onCloseClient}
          onDisqualify={onDisqualify}
          onArchiveLead={onArchiveLead}
          onMoveToRetorno={onMoveToRetorno}
        />
      </div>

      <LeadAssistedServicePanel
        leadId={lead.id}
        empresaId={empresaId}
        leadName={lead.nome}
        onHistoryChanged={() => onRefreshLeadHistory(String(lead.id))}
      />

      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Mensagens prontas antigas
            </p>
            <p className="mt-1 text-sm text-[var(--text2)]">
              Esses scripts continuam disponíveis como apoio, mas o fluxo
              principal agora é pelo Atendimento Assistido.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLegacyScripts((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {showLegacyScripts
              ? "Ocultar scripts antigos"
              : "Mostrar scripts antigos"}
          </button>
        </div>
      </section>

      {showLegacyScripts && <LeadMessageScripts lead={lead} />}

      <TentativasList
        lead={lead}
        tentativas={tentativas}
        savingLeadId={savingLeadId}
        onSetResultado={onSetResultado}
      />

      <LeadHistory
        items={leadHistory}
        isLoading={isLoadingLeadHistory}
        isSaving={isSavingLeadHistory}
        error={leadHistoryError}
        onCreateNote={onCreateLeadNote}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-[var(--bg3)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text3)]">
            Interesse
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {lead.esp || "sem especialidade"}
          </p>
        </div>

        <div className="rounded-xl bg-[var(--bg3)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text3)]">
            Entrada
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {formatDate(lead.dataEntrada)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onAdvanceQueue(lead)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {progress.isComplete ? "Avançar dia e próximo lead" : "Próximo lead"}
        </button>

        <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
          {isSaving ? "Salvando..." : "Alterações salvam direto no Supabase"}
        </span>
      </div>
    </div>
  );
}
