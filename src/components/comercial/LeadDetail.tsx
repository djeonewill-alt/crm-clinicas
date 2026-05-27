"use client";

import { useState } from "react";
import { LeadActions } from "@/components/comercial/LeadActions";
import { LeadAssistedServicePanel } from "@/components/comercial/LeadAssistedServicePanel";
import { LeadCommercialContextSelector } from "@/components/comercial/LeadCommercialContextSelector";
import { LeadEditForm } from "@/components/comercial/LeadEditForm";
import { LeadHistory } from "@/components/comercial/LeadHistory";
import { LeadJourneyCard } from "@/components/comercial/LeadJourneyCard";
import { LeadMessageScripts } from "@/components/comercial/LeadMessageScripts";
import { TentativasList } from "@/components/comercial/TentativasList";
import { FUNNELS } from "@/lib/constants/crm";
import {
  canMoveLeadToPreviousDay,
  ensureTentativasForLead,
  getAttemptProgress,
} from "@/lib/services/queue";
import type { MarkLeadAttemptResult } from "@/components/comercial/useComercialTrabalho";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";
import type { CommercialContext } from "@/types/commercial-contexts";
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
  onSendToRecovery: () => void | Promise<void>;
  onMoveToRetorno: (
    lead: Lead,
    input?: { returnDate?: string; note?: string }
  ) => void | Promise<void>;
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
  onMarkNextLeadAttempt: (input: {
    leadId: string | number;
    attemptType: "message" | "call";
    source: "assisted_reply_sent" | "call_logged";
    result?: string;
    note?: string;
  }) => Promise<MarkLeadAttemptResult>;
  onCreateLeadNote: (
    description: string
  ) => boolean | void | Promise<boolean | void>;
  onRefreshLeadHistory: (leadId: string) => void | Promise<void>;
  onAdvanceQueue: (lead: Lead) => void | Promise<void>;
  getLastAction: (lead: Lead) => string;
  commercialResponseCategories: CommercialResponseCategory[];
  commercialResponses: CommercialResponse[];
  commercialContexts: CommercialContext[];
  onUpdateCommercialContext: (
    contextId: string | null
  ) => boolean | void | Promise<boolean | void>;
};

function getLeadName(lead: Lead) {
  return lead.nome?.trim() || lead.tel || "Lead sem nome";
}

function getFunnelLabel(funnelId: string) {
  return FUNNELS.find((funnel) => funnel.id === funnelId)?.label ?? funnelId;
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
  onSendToRecovery,
  onMoveToRetorno,
  onUpdateLeadDetails,
  onSetResultado,
  onMarkNextLeadAttempt,
  onCreateLeadNote,
  onRefreshLeadHistory,
  onAdvanceQueue,
  getLastAction,
  commercialResponseCategories,
  commercialResponses,
  commercialContexts,
  onUpdateCommercialContext,
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
  const canMovePreviousDay = canMoveLeadToPreviousDay(lead);
  const currentCommercialContext =
    commercialContexts.find(
      (context) => context.id === lead.commercialContextId
    ) ?? null;

  return (
    <div className="rounded-2xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      <div className="sticky top-0 z-20 mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/95 p-3 shadow-[0_10px_30px_rgba(0,0,0,.18)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold">
                {getLeadName(lead)}
              </h2>
              <span className="rounded-full bg-[rgba(232,197,71,.15)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                {getFunnelLabel(lead.funnel)} · {lead.diaProsp || "d1"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text2)]">
              <span>{lead.tel}</span>
              <span>·</span>
              <span>{currentCommercialContext?.name ?? "Base global"}</span>
              {lead.campanha && (
                <>
                  <span>·</span>
                  <span>{lead.campanha}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] hover:bg-[var(--bg4)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? "Fechar edição" : "Editar"}
          </button>
        </div>

        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <LeadActions
            lead={lead}
            savingLeadId={savingLeadId}
            retornoDate={retornoDate}
            canMovePreviousDay={canMovePreviousDay}
            variant="compact"
            onRetornoDateChange={onRetornoDateChange}
            onPreviousDay={onPreviousDay}
            onMoveToQualificacao={onMoveToQualificacao}
            onCloseClient={onCloseClient}
            onDisqualify={onDisqualify}
            onArchiveLead={onArchiveLead}
            onMoveToRetorno={onMoveToRetorno}
          />
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

      <LeadJourneyCard
        lead={lead}
        tentativas={tentativas}
        currentCommercialContext={currentCommercialContext}
        onSendToRecovery={onSendToRecovery}
      />

      <LeadCommercialContextSelector
        currentContextId={lead.commercialContextId ?? null}
        contexts={commercialContexts}
        onChangeContext={onUpdateCommercialContext}
      />

      <LeadAssistedServicePanel
        leadId={lead.id}
        empresaId={empresaId}
        leadName={lead.nome}
        onHistoryChanged={() => onRefreshLeadHistory(String(lead.id))}
        onMoveToQualification={() => onMoveToQualificacao(lead)}
        onCommercialReplySentAttempt={() =>
          onMarkNextLeadAttempt({
            leadId: lead.id,
            attemptType: "message",
            source: "assisted_reply_sent",
            note: "Resposta registrada como enviada pelo Atendimento Assistido.",
          })
        }
        onCallLoggedAttempt={({ callResult, note }) =>
          onMarkNextLeadAttempt({
            leadId: lead.id,
            attemptType: "call",
            source: "call_logged",
            result: callResult,
            note,
          })
        }
        onScheduleReturn={({ returnDate, note }) => {
          onRetornoDateChange(returnDate);
          return onMoveToRetorno(lead, { returnDate, note });
        }}
        currentFunnel={lead.funnel}
        currentJourneyStep={lead.diaProsp}
        currentCommercialContext={currentCommercialContext}
        leadHistory={leadHistory}
        commercialResponseCategories={commercialResponseCategories}
        commercialResponses={commercialResponses}
      />

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

      <section className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
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
    </div>
  );
}
