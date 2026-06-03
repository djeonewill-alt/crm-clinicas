"use client";

import { useState } from "react";
import { LeadActions } from "@/components/comercial/LeadActions";
import { LeadAssistedServicePanel } from "@/components/comercial/LeadAssistedServicePanel";
import { LeadCallScriptPanel } from "@/components/comercial/LeadCallScriptPanel";
import { LeadCommercialContextSelector } from "@/components/comercial/LeadCommercialContextSelector";
import { LeadEditForm } from "@/components/comercial/LeadEditForm";
import { LeadHistory } from "@/components/comercial/LeadHistory";
import { TentativasList } from "@/components/comercial/TentativasList";
import { FUNNELS } from "@/lib/constants/crm";
import {
  PROSPECTING_CADENCE_ACTIONS,
  getProspectingCadenceState,
  getProspectingScript,
  type ProspectingCadenceAction,
} from "@/lib/comercial/prospecting-cadence";
import {
  canMoveLeadToPreviousDay,
  ensureTentativasForLead,
  getAttemptProgress,
} from "@/lib/services/queue";
import type {
  CloseClientInput,
  MarkLeadAttemptResult,
} from "@/components/comercial/useComercialTrabalho";
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
  onCloseClient: (
    lead: Lead,
    input: CloseClientInput
  ) => boolean | void | Promise<boolean | void>;
  onDisqualify: (lead: Lead) => void | Promise<void>;
  onArchiveLead: () => void | Promise<void>;
  onDeleteLead: (lead: Lead) => void | Promise<void>;
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
    dataEntrada?: string | null;
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
  onRegisterNoAnswerWithPostMessage: (
    lead: Lead,
    message: string
  ) => Promise<void> | void;
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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialCloseForm(): CloseClientInput {
  return {
    appointmentDate: todayInputValue(),
    appointmentTime: "",
    unit: "A confirmar",
    signalStatus: "paid",
    signalAmount: "100",
    receiptReceived: false,
    signalFollowUpDate: "",
    notes: "",
  };
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
  onDeleteLead,
  onMoveToRetorno,
  onUpdateLeadDetails,
  onSetResultado,
  onMarkNextLeadAttempt,
  onRegisterNoAnswerWithPostMessage,
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
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [cadenceReplyDraft, setCadenceReplyDraft] = useState<{
    text: string;
    action: ProspectingCadenceAction;
    version: number;
  } | null>(null);
  const [closeForm, setCloseForm] = useState<CloseClientInput>(
    createInitialCloseForm
  );
  const [closeFormError, setCloseFormError] = useState("");

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
  const prospectingCadence = getProspectingCadenceState(lead, leadHistory);
  const nextCadenceScript = getProspectingScript(prospectingCadence.nextAction);
  async function handleSetResultadoWithCadence(
    currentLead: Lead,
    tentativaIndex: number,
    resultado: string
  ) {
    await onSetResultado(currentLead, tentativaIndex, resultado);

    const tentativa = tentativas[tentativaIndex];
    const isNoAnswerCall =
      currentLead.funnel === "prospeccao" &&
      String(tentativa?.tipo ?? "") === "ligacao" &&
      resultado === "nao-atendeu";

    if (!isNoAnswerCall) return;

    const actionKey =
      prospectingCadence.steps.find((step) => step.key === "d2_call" && !step.done)
        ? "d2_post_call_message"
        : "d4_final_message";
    const action =
      PROSPECTING_CADENCE_ACTIONS.find((item) => item.key === actionKey) ?? null;
    const script = getProspectingScript(action);

    if (!action || !script) return;

    setCadenceReplyDraft({
      text: script,
      action,
      version: Date.now(),
    });
  }

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
            onCloseClient={() => {
              setCloseForm(createInitialCloseForm());
              setCloseFormError("");
              setShowCloseForm(true);
            }}
            onDisqualify={onDisqualify}
            onArchiveLead={onArchiveLead}
            onMoveToRetorno={onMoveToRetorno}
          />
        </div>
      </div>

      {showCloseForm && (
        <section className="mb-4 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-300">
                Fechamento / agendamento
              </p>
              <p className="mt-1 text-sm text-[var(--text2)]">
                Registre os dados antes de mover o lead para Clientes.
              </p>
            </div>
            {closeForm.signalStatus === "pending" &&
              !closeForm.signalFollowUpDate && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                  Sem data de cobrança do sinal
                </span>
              )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Data da avaliação/agendamento
              <input
                type="date"
                value={closeForm.appointmentDate}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    appointmentDate: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Horário
              <input
                type="time"
                value={closeForm.appointmentTime}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    appointmentTime: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Unidade
              <select
                value={closeForm.unit}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
              >
                <option>Paulista</option>
                <option>Tatuapé</option>
                <option>Mairiporã</option>
                <option>A confirmar</option>
                <option>Outra</option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Sinal Pix
              <select
                value={closeForm.signalStatus}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    signalStatus: event.target
                      .value as CloseClientInput["signalStatus"],
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
              >
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="not_applicable">Não aplicável / sem sinal</option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Valor do sinal
              <input
                value={closeForm.signalAmount}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    signalAmount: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="100"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Data para cobrar sinal
              <input
                type="date"
                value={closeForm.signalFollowUpDate}
                onChange={(event) =>
                  setCloseForm((current) => ({
                    ...current,
                    signalFollowUpDate: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text2)]">
            <input
              type="checkbox"
              checked={closeForm.receiptReceived}
              onChange={(event) =>
                setCloseForm((current) => ({
                  ...current,
                  receiptReceived: event.target.checked,
                }))
              }
              className="h-4 w-4"
            />
            Comprovante recebido
          </label>

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
            Observações
            <textarea
              value={closeForm.notes}
              onChange={(event) =>
                setCloseForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
              placeholder="Ex: Cliente pediu confirmação no período da tarde."
            />
          </label>

          {closeFormError && (
            <p className="mt-3 text-xs font-semibold text-red-300">
              {closeFormError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if (!closeForm.appointmentDate) {
                  setCloseFormError("Informe a data da avaliação/agendamento.");
                  return;
                }

                setCloseFormError("");
                const saved = await onCloseClient(lead, closeForm);
                if (saved !== false) {
                  setShowCloseForm(false);
                }
              }}
              className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Fechando..." : "Confirmar fechamento"}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setShowCloseForm(false);
                setCloseFormError("");
              }}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {isEditing && (
        <>
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

          <section className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-300">
              Zona de perigo
            </p>
            <p className="mt-1 text-sm text-[var(--text2)]">
              Use apenas para leads duplicados ou criados para teste. A exclusão
              é definitiva e remove também o histórico deste lead.
            </p>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onDeleteLead(lead)}
              className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Excluir cliente
            </button>
          </section>
        </>
      )}

      <LeadCallScriptPanel
        lead={lead}
        leadHistory={leadHistory}
        onRegisterNoAnswerWithPostMessage={(message) =>
          onRegisterNoAnswerWithPostMessage(lead, message)
        }
      />

      {lead.funnel === "prospeccao" && (
        <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Próxima ação da prospecção
              </p>
              <h3 className="mt-1 text-sm font-semibold">
                {prospectingCadence.nextAction.dayLabel} —{" "}
                {prospectingCadence.nextAction.label}
              </h3>
              <p className="mt-1 text-xs text-[var(--text2)]">
                {prospectingCadence.isComplete
                  ? "Cadência completa. Se não houver resposta após aguardar, mova para Futuro/Recuperação manualmente."
                  : `${prospectingCadence.completedCount}/${prospectingCadence.totalActionCount} ações concluídas.`}
              </p>
            </div>

            {nextCadenceScript && (
              <button
                type="button"
                onClick={() =>
                  setCadenceReplyDraft({
                    text: nextCadenceScript,
                    action: prospectingCadence.nextAction,
                    version: Date.now(),
                  })
                }
                className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.18)]"
              >
                Usar script na resposta
              </button>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {prospectingCadence.steps
              .filter((step) => step.type !== "manual_move")
              .map((step) => (
                <div
                  key={step.key}
                  className={
                    step.done
                      ? "rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-200"
                      : "rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)]"
                  }
                >
                  <span className="font-semibold">{step.dayLabel}</span> ·{" "}
                  {step.label}
                </div>
              ))}
          </div>
        </section>
      )}

      <LeadAssistedServicePanel
        lead={lead}
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
        prefillCadenceReply={cadenceReplyDraft}
        commercialResponseCategories={commercialResponseCategories}
        commercialResponses={commercialResponses}
        onCreateNote={onCreateLeadNote}
      />

      <LeadCommercialContextSelector
        currentContextId={lead.commercialContextId ?? null}
        contexts={commercialContexts}
        onChangeContext={onUpdateCommercialContext}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onAdvanceQueue(lead)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {progress.isComplete ? "Avançar dia e próximo lead" : "Próximo lead"}
        </button>
      </div>

      <TentativasList
        lead={lead}
        tentativas={tentativas}
        savingLeadId={savingLeadId}
        onSetResultado={handleSetResultadoWithCadence}
      />

      <LeadHistory
        items={leadHistory}
        isLoading={isLoadingLeadHistory}
        isSaving={isSavingLeadHistory}
        error={leadHistoryError}
        onCreateNote={onCreateLeadNote}
      />
    </div>
  );
}
