"use client";

import { useEffect, useState } from "react";
import { createLeadHistoryEvent } from "@/lib/services/lead-history-client";

type LeadAssistedServicePanelProps = {
  leadId: string | number;
  empresaId: string | number;
  leadName?: string;
  onHistoryChanged?: () => Promise<void> | void;
};

const FUTURE_ACTIONS = [
  "Analisar e sugerir resposta",
  "Sugerir próxima ação",
  "Blocos rápidos",
];

export function LeadAssistedServicePanel({
  leadId,
  empresaId,
  leadName,
  onHistoryChanged,
}: LeadAssistedServicePanelProps) {
  const [receivedMessage, setReceivedMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isRegisteringReceived, setIsRegisteringReceived] = useState(false);
  const [isRegisteringReply, setIsRegisteringReply] = useState(false);

  useEffect(() => {
    setReceivedMessage("");
    setReplyText("");
    setStatusMessage("");
    setIsRegisteringReceived(false);
    setIsRegisteringReply(false);
  }, [leadId]);

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
            onChange={(event) => setReceivedMessage(event.target.value)}
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

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {FUTURE_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            disabled
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-left text-xs font-semibold text-[var(--text3)] opacity-70"
          >
            {action}
            <span className="mt-1 block text-[10px] font-normal uppercase tracking-wider">
              em breve
            </span>
          </button>
        ))}
      </div>

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
