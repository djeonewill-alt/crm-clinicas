"use client";

import { useState } from "react";
import type { LeadHistoryItem, LeadHistoryType } from "@/types/lead-history";

type LeadHistoryProps = {
  items: LeadHistoryItem[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onCreateNote: (description: string) => boolean | void | Promise<boolean | void>;
};

function getTypeLabel(type: LeadHistoryType) {
  const labels: Record<LeadHistoryType, string> = {
    note: "Observação",
    attempt: "Tentativa",
    status_change: "Status",
    return_scheduled: "Retorno",
    closed: "Fechamento",
    disqualified: "Desqualificação",
    whatsapp: "WhatsApp",
    system: "Sistema",
  };

  return labels[type] ?? type;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value || "sem data";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getAttachmentTypeLabel(value: string) {
  if (value === "pix_receipt") return "Comprovante Pix";
  if (value === "customer_photo") return "Foto enviada pelo cliente";
  if (value === "document") return "Documento";
  return "Outro";
}

export function LeadHistory({
  items,
  isLoading,
  isSaving,
  error,
  onCreateNote,
}: LeadHistoryProps) {
  const [description, setDescription] = useState("");
  const trimmedDescription = description.trim();

  async function handleCreateNote() {
    if (!trimmedDescription || isSaving) return;

    const saved = await onCreateNote(trimmedDescription);

    if (saved !== false) {
      setDescription("");
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Histórico
        </p>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Registre observações importantes sobre este lead.
        </p>
      </div>

      <div className="mb-4">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
          placeholder="Ex: pediu preço, ficou de responder amanhã, quer agendar..."
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSaving || !trimmedDescription}
            onClick={handleCreateNote}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Adicionar observação"}
          </button>

          {error && <span className="text-xs text-red-300">{error}</span>}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text2)]">
          Carregando histórico...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text3)]">
          Nenhum histórico ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text3)]">
                    {formatDate(item.created_at)}
                  </div>
                </div>

                <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                  {getTypeLabel(item.type)}
                </span>
              </div>

              {item.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text2)]">
                  {item.description}
                </p>
              )}

              {item.metadata?.event === "lead_attachment_received" && (
                <div className="mt-3 rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text2)]">
                  <div>
                    Tipo:{" "}
                    {getAttachmentTypeLabel(
                      getMetadataString(item.metadata, "attachmentType")
                    )}
                  </div>
                  {getMetadataString(item.metadata, "fileName") && (
                    <div className="mt-1">
                      Arquivo: {getMetadataString(item.metadata, "fileName")}
                    </div>
                  )}
                  {getMetadataString(item.metadata, "publicUrl") ? (
                    <a
                      href={getMetadataString(item.metadata, "publicUrl")}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-lg border border-[var(--accent)] px-3 py-1.5 font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.10)]"
                    >
                      Abrir anexo
                    </a>
                  ) : (
                    <div className="mt-1 text-[var(--text3)]">
                      Arquivo registrado sem upload.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
