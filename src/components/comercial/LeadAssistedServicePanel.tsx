"use client";

import { useEffect, useState } from "react";
import { LeadCallLogForm } from "@/components/comercial/LeadCallLogForm";
import {
  findBestCommercialResponses,
  normalizeCommercialSearchText,
  type CommercialResponseMatch,
} from "@/lib/comercial/commercial-response-matcher";
import {
  suggestCommercialNextAction,
  type CommercialNextActionSuggestion,
  type CommercialSuggestedFunnel,
} from "@/lib/comercial/commercial-next-action-suggester";
import { createLeadHistoryEvent } from "@/lib/services/lead-history-client";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";

type LeadAssistedServicePanelProps = {
  leadId: string | number;
  empresaId: string | number;
  leadName?: string;
  onHistoryChanged?: () => Promise<void> | void;
  onMoveToQualification?: () => Promise<void> | void;
  onScheduleReturn?: (input: {
    returnDate: string;
    note?: string;
  }) => Promise<void> | void;
  currentFunnel?: string | null;
  commercialResponseCategories: CommercialResponseCategory[];
  commercialResponses: CommercialResponse[];
};

type QuickReplyBlock = {
  label: string;
  categorySlug?: string;
  titleIncludes?: string[];
};

const QUICK_REPLY_BLOCKS: QuickReplyBlock[] = [
  {
    label: "Abertura",
    categorySlug: "primeira-abordagem",
    titleIncludes: ["Primeira abordagem"],
  },
  {
    label: "Como funciona",
    categorySlug: "como-funciona-tratamento",
    titleIncludes: ["Explicação simples"],
  },
  {
    label: "Como funciona + valor",
    titleIncludes: ["Como funciona e valor"],
  },
  {
    label: "Preço",
    categorySlug: "preco-promocao",
    titleIncludes: ["Valor promocional"],
  },
  {
    label: "Regiões",
    categorySlug: "regioes-corpo",
    titleIncludes: ["Como funciona o valor por região"],
  },
  {
    label: "Unidades",
    categorySlug: "localizacao-unidades",
    titleIncludes: ["Unidades disponíveis"],
  },
  {
    label: "Endereço Tatuapé",
    titleIncludes: ["Endereço da unidade Tatuapé"],
  },
  {
    label: "Endereço Paulista",
    titleIncludes: ["Endereço da unidade Paulista"],
  },
  {
    label: "Reserva/Sinal",
    categorySlug: "reserva-sinal",
    titleIncludes: ["Taxa de reserva"],
  },
  {
    label: "Gestante/Pós-parto",
    categorySlug: "gestante-pos-parto",
  },
  {
    label: "Menor de idade",
    categorySlug: "menor-responsavel-legal",
  },
  {
    label: "Profissional/Certificações",
    categorySlug: "profissional-certificacoes",
  },
  {
    label: "Não usa tinta",
    categorySlug: "pigmentacao-nao-usa-tinta",
  },
  {
    label: "Flacidez",
    categorySlug: "flacidez",
  },
  {
    label: "Antes e depois",
    categorySlug: "resultados-antes-depois",
  },
];

const FUNNEL_LABELS: Record<CommercialSuggestedFunnel, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  retorno: "Retorno",
  clientes: "Clientes",
  keep_current: "Manter funil atual",
};

const RISK_LABELS: Record<CommercialNextActionSuggestion["riskLevel"], string> =
  {
    low: "baixo",
    medium: "médio",
    high: "alto",
  };

export function LeadAssistedServicePanel({
  leadId,
  empresaId,
  leadName,
  onHistoryChanged,
  onMoveToQualification,
  onScheduleReturn,
  currentFunnel,
  commercialResponseCategories,
  commercialResponses,
}: LeadAssistedServicePanelProps) {
  const [receivedMessage, setReceivedMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [suggestionMatch, setSuggestionMatch] =
    useState<CommercialResponseMatch | null>(null);
  const [nextActionSuggestion, setNextActionSuggestion] =
    useState<CommercialNextActionSuggestion | null>(null);
  const [isRegisteringReceived, setIsRegisteringReceived] = useState(false);
  const [isRegisteringReply, setIsRegisteringReply] = useState(false);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [isRegisteringReview, setIsRegisteringReview] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [isSchedulingReturn, setIsSchedulingReturn] = useState(false);
  const [showCallLogForm, setShowCallLogForm] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  useEffect(() => {
    setReceivedMessage("");
    setReplyText("");
    setStatusMessage("");
    setSuggestionMatch(null);
    setNextActionSuggestion(null);
    setIsRegisteringReceived(false);
    setIsRegisteringReply(false);
    setIsApplyingAction(false);
    setIsRegisteringReview(false);
    setReturnDate("");
    setReturnNote("");
    setIsSchedulingReturn(false);
    setShowCallLogForm(false);
    setShowQuickReplies(false);
  }, [leadId]);

  function getResponseCategory(response: CommercialResponse) {
    if (!response.categoryId) return null;

    return (
      commercialResponseCategories.find(
        (category) => category.id === response.categoryId
      ) ?? null
    );
  }

  function findQuickReplyResponse(block: QuickReplyBlock) {
    const normalizedTitleIncludes =
      block.titleIncludes?.map(normalizeCommercialSearchText) ?? [];
    const activeResponses = commercialResponses.filter(
      (response) => response.isActive
    );
    const titleMatch =
      activeResponses.find((response) => {
        const normalizedTitle = normalizeCommercialSearchText(response.title);
        return normalizedTitleIncludes.some((titlePart) =>
          normalizedTitle.includes(titlePart)
        );
      }) ?? null;

    if (titleMatch) return titleMatch;

    return (
      activeResponses.find((response) => {
        const category = getResponseCategory(response);
        return Boolean(block.categorySlug) && category?.slug === block.categorySlug;
      }) ?? null
    );
  }

  function handleApplyQuickReply(block: QuickReplyBlock) {
    const response = findQuickReplyResponse(block);

    if (!response) {
      setStatusMessage(
        "Nenhuma resposta aprovada encontrada para este bloco rápido. Verifique a aba Respostas."
      );
      return;
    }

    const category = getResponseCategory(response);

    setReplyText(response.answerText);
    setSuggestionMatch({
      response,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      score: 0,
      matchedTerms: [],
    });
    setNextActionSuggestion(null);
    setStatusMessage(`Bloco rápido aplicado: ${block.label}`);
  }

  function todayInputValue() {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  function handleAnalyzeMessage() {
    const trimmedMessage = receivedMessage.trim();

    if (!trimmedMessage) {
      setStatusMessage("Cole a mensagem recebida antes de analisar.");
      return;
    }

    const result = findBestCommercialResponses({
      message: trimmedMessage,
      categories: commercialResponseCategories,
      responses: commercialResponses,
    });

    if (!result.bestMatch) {
      setNextActionSuggestion(
        suggestCommercialNextAction({
          message: trimmedMessage,
          bestMatch: null,
        })
      );
      setSuggestionMatch(null);
      setStatusMessage(
        "Nenhuma resposta aprovada encontrada para essa mensagem. Revise manualmente ou crie uma nova resposta aprovada depois."
      );
      return;
    }

    const nextAction = suggestCommercialNextAction({
      message: trimmedMessage,
      bestMatch: result.bestMatch,
    });

    setSuggestionMatch(result.bestMatch);
    setNextActionSuggestion(nextAction);
    setReplyText(result.bestMatch.response.answerText);
    setStatusMessage("Resposta aprovada encontrada e preenchida.");
  }

  async function handleRegisterReceived() {
    const trimmedMessage = receivedMessage.trim();

    if (!trimmedMessage) {
      setStatusMessage("Cole a mensagem recebida antes de registrar.");
      return;
    }

    setIsRegisteringReceived(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Mensagem recebida do cliente",
        description: trimmedMessage,
        metadata: {
          event: "customer_message_received",
          source: "whatsapp_manual",
          messageText: trimmedMessage,
          assistedPanel: true,
        },
      });

      await onHistoryChanged?.();
      setStatusMessage("Mensagem recebida registrada no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar mensagem recebida: ${error.message}`
          : "Erro ao registrar mensagem recebida."
      );
    } finally {
      setIsRegisteringReceived(false);
    }
  }

  async function handleRegisterReplySent() {
    const trimmedReply = replyText.trim();

    if (!trimmedReply) {
      setStatusMessage("Escreva ou cole a resposta antes de registrar.");
      return;
    }

    setIsRegisteringReply(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Resposta enviada ao cliente",
        description: trimmedReply,
        metadata: {
          event: "commercial_reply_sent",
          source: "whatsapp_manual",
          replyText: trimmedReply,
          assistedPanel: true,
        },
      });

      await onHistoryChanged?.();
      setStatusMessage("Resposta enviada registrada no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar resposta enviada: ${error.message}`
          : "Erro ao registrar resposta enviada."
      );
    } finally {
      setIsRegisteringReply(false);
    }
  }

  async function handleMoveToQualification() {
    if (!nextActionSuggestion) return;

    if (!onMoveToQualification) {
      setStatusMessage("Ação ainda não conectada.");
      return;
    }

    const confirmed = window.confirm("Mover este lead para Qualificação?");

    if (!confirmed) return;

    setIsApplyingAction(true);
    setStatusMessage("");

    try {
      await onMoveToQualification();
      setStatusMessage("Lead movido para Qualificação.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao mover para Qualificação: ${error.message}`
          : "Erro ao mover para Qualificação."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  async function handleScheduleReturn() {
    const trimmedReturnDate = returnDate.trim();
    const trimmedReturnNote = returnNote.trim();

    if (!onScheduleReturn) {
      setStatusMessage("Ação de retorno ainda não conectada.");
      return;
    }

    if (!trimmedReturnDate) {
      setStatusMessage("Informe a data de retorno.");
      return;
    }

    if (trimmedReturnDate < todayInputValue()) {
      setStatusMessage("Escolha uma data de retorno de hoje em diante.");
      return;
    }

    const confirmed = window.confirm("Agendar retorno para este lead?");

    if (!confirmed) return;

    setIsSchedulingReturn(true);
    setStatusMessage("");

    try {
      await onScheduleReturn({
        returnDate: trimmedReturnDate,
        note: trimmedReturnNote || undefined,
      });
      setReturnDate("");
      setReturnNote("");
      setStatusMessage("Retorno agendado.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao agendar retorno: ${error.message}`
          : "Erro ao agendar retorno."
      );
    } finally {
      setIsSchedulingReturn(false);
    }
  }

  async function handleRegisterHumanReview() {
    if (!nextActionSuggestion) return;

    setIsRegisteringReview(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Revisão humana recomendada",
        description: [
          "O Atendimento Assistido recomendou revisão humana.",
          `Motivo: ${nextActionSuggestion.title} - ${nextActionSuggestion.description}`,
          `Risco: ${nextActionSuggestion.riskLevel}`,
          `Razões: ${nextActionSuggestion.reasons.join(" ")}`,
        ].join("\n"),
        metadata: {
          event: "human_review_recommended",
          source: "assisted_panel",
          actionType: nextActionSuggestion.actionType,
          suggestedFunnel: nextActionSuggestion.suggestedFunnel,
          riskLevel: nextActionSuggestion.riskLevel,
          reasons: nextActionSuggestion.reasons,
          currentFunnel: currentFunnel ?? null,
        },
      });

      await onHistoryChanged?.();
      setStatusMessage("Revisão humana registrada no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar revisão humana: ${error.message}`
          : "Erro ao registrar revisão humana."
      );
    } finally {
      setIsRegisteringReview(false);
    }
  }

  async function handleCopyReply() {
    const trimmedReply = replyText.trim();

    if (!trimmedReply) {
      setStatusMessage("Escreva uma resposta antes de copiar.");
      return;
    }

    if (!navigator.clipboard) {
      setStatusMessage(
        "Não foi possível copiar automaticamente. Selecione o texto manualmente."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmedReply);
      setStatusMessage("Resposta copiada.");
    } catch {
      setStatusMessage(
        "Não foi possível copiar automaticamente. Selecione o texto manualmente."
      );
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Atendimento Assistido
        </p>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Use este painel enquanto atende o lead no WhatsApp. Cole a mensagem
          recebida, prepare a resposta e copie para enviar manualmente.
        </p>
        {leadName && (
          <p className="mt-2 text-xs font-semibold text-[var(--text2)]">
            Lead atual: {leadName}
          </p>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
            Mensagem recebida do cliente
          </label>
          <textarea
            value={receivedMessage}
            onChange={(event) => {
              setReceivedMessage(event.target.value);
              setSuggestionMatch(null);
              setNextActionSuggestion(null);
            }}
            rows={5}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
            placeholder="Cole aqui a última mensagem que o cliente enviou no WhatsApp..."
          />
          <button
            type="button"
            disabled={isRegisteringReceived}
            onClick={() => void handleRegisterReceived()}
            className="mt-2 rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegisteringReceived ? "Registrando..." : "Registrar recebida"}
          </button>
          <button
            type="button"
            onClick={handleAnalyzeMessage}
            className="ml-2 mt-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)]"
          >
            Analisar e sugerir resposta
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
            Resposta sugerida / mensagem para enviar
          </label>
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            rows={5}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
            placeholder="A resposta sugerida aparecerá aqui. Por enquanto, você pode escrever ou colar uma resposta manualmente."
          />
          <p className="mt-2 text-xs text-[var(--text3)]">
            Esta sugestão usa apenas respostas aprovadas cadastradas. Revise
            antes de enviar no WhatsApp.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyReply()}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)]"
            >
              Copiar resposta
            </button>

            <button
              type="button"
              disabled={isRegisteringReply}
              onClick={() => void handleRegisterReplySent()}
              className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRegisteringReply ? "Registrando..." : "Registrar como enviada"}
            </button>
          </div>
        </div>
      </div>

      {suggestionMatch && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Resposta encontrada
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {suggestionMatch.response.title}
              </p>
              <p className="mt-1 text-xs text-[var(--text2)]">
                Categoria: {suggestionMatch.categoryName ?? "sem categoria"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestionMatch.response.requiresHuman && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Revisar antes de enviar
                </span>
              )}

              {suggestionMatch.response.canAutoReply && (
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-300">
                  Candidata a auto resposta futura
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-[var(--text2)] sm:grid-cols-2">
            <div>Pontuação: {suggestionMatch.score.toFixed(1)}</div>
            <div>
              Termos encontrados:{" "}
              {suggestionMatch.matchedTerms.length
                ? suggestionMatch.matchedTerms.join(", ")
                : "nenhum"}
            </div>
          </div>
        </div>
      )}

      {nextActionSuggestion && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Próxima ação sugerida
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {nextActionSuggestion.title}
              </p>
              <p className="mt-1 text-sm text-[var(--text2)]">
                {nextActionSuggestion.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "qualificacao" && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                    Mover para Qualificação
                  </span>
                )}

              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "retorno" && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                    Mover para Retorno
                  </span>
                )}

              {nextActionSuggestion.requiresHuman && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Precisa humano
                </span>
              )}

              {nextActionSuggestion.riskLevel === "high" && (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                  Risco alto
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-[var(--text2)] sm:grid-cols-3">
            <div>Funil sugerido: {FUNNEL_LABELS[nextActionSuggestion.suggestedFunnel]}</div>
            <div>
              Recomenda mover:{" "}
              {nextActionSuggestion.shouldMoveFunnel ? "sim" : "não"}
            </div>
            <div>Risco: {RISK_LABELS[nextActionSuggestion.riskLevel]}</div>
          </div>

          {nextActionSuggestion.reasons.length > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text2)]">
              <span className="font-semibold text-[var(--text)]">Razões: </span>
              {nextActionSuggestion.reasons.join(" ")}
            </div>
          )}

          <p className="mt-3 text-xs text-[var(--text3)]">
            Esta é apenas uma sugestão local. O CRM não move o lead
            automaticamente nesta etapa.
          </p>

          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Aplicar manualmente
            </p>
            <p className="mt-1 text-xs text-[var(--text2)]">
              Estas ações não acontecem automaticamente. Você escolhe se quer
              aplicar.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "qualificacao" && (
                  <button
                    type="button"
                    disabled={isApplyingAction}
                    onClick={() => void handleMoveToQualification()}
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isApplyingAction ? "Movendo..." : "Mover para Qualificação"}
                  </button>
                )}

              {nextActionSuggestion.shouldMoveFunnel &&
                nextActionSuggestion.suggestedFunnel === "retorno" && (
                  <div className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Agendar retorno
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(event) => setReturnDate(event.target.value)}
                        className="rounded-lg border border-purple-500/30 bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text)] outline-none"
                      />
                      <input
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                        className="rounded-lg border border-purple-500/30 bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
                        placeholder="Ex: Cliente pediu para chamar no dia do pagamento."
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isSchedulingReturn || !onScheduleReturn}
                        onClick={() => void handleScheduleReturn()}
                        className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSchedulingReturn ? "Agendando..." : "Agendar Retorno"}
                      </button>

                      {!onScheduleReturn && (
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
                          Ação de retorno ainda não conectada.
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {(nextActionSuggestion.requiresHuman ||
                nextActionSuggestion.riskLevel === "high") && (
                <button
                  type="button"
                  disabled={isRegisteringReview}
                  onClick={() => void handleRegisterHumanReview()}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRegisteringReview
                    ? "Registrando..."
                    : "Registrar revisão humana"}
                </button>
              )}

              {nextActionSuggestion.suggestedFunnel === "keep_current" && (
                <span className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
                  Nenhuma movimentação de funil sugerida agora.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Blocos rápidos
            </p>
            <p className="mt-1 text-xs text-[var(--text2)]">
              Use estes atalhos para preencher a resposta com uma mensagem
              aprovada comum. Revise antes de enviar no WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickReplies((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {showQuickReplies
              ? "Ocultar blocos rápidos"
              : "Mostrar blocos rápidos"}
          </button>
        </div>

        {showQuickReplies && (
          <div className="mt-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_REPLY_BLOCKS.map((block) => (
                <button
                  key={block.label}
                  type="button"
                  onClick={() => handleApplyQuickReply(block)}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-left text-xs font-semibold text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  {block.label}
                </button>
              ))}
            </div>

            <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text3)]">
              Blocos com preço, promoção, pagamento, gestante, menor de idade
              ou certificações devem ser revisados antes do envio.
            </p>
          </div>
        )}
      </section>

      <section className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Registrar ligação
            </p>
            <p className="mt-1 text-xs text-[var(--text2)]">
              Registre manualmente o resultado de uma ligação feita pelo
              WhatsApp ou celular.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCallLogForm((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {showCallLogForm
              ? "Ocultar registro de ligação"
              : "Mostrar registro de ligação"}
          </button>
        </div>

        {showCallLogForm && (
          <div className="mt-3">
            <LeadCallLogForm
              leadId={leadId}
              empresaId={empresaId}
              onHistoryChanged={onHistoryChanged}
            />
          </div>
        )}
      </section>

      <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)]">
        Em breve, este painel usará as respostas aprovadas para sugerir a melhor
        resposta e registrar tudo no histórico do lead.
      </p>

      <p className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text3)]">
        Fluxo sugerido: copie a mensagem do WhatsApp, cole aqui, prepare a
        resposta, copie e envie no WhatsApp. Na próxima etapa, vamos salvar
        recebidas/enviadas no histórico.
      </p>

      {statusMessage && (
        <div className="mt-3 rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs text-[var(--text2)]">
          {statusMessage}
        </div>
      )}
    </section>
  );
}
