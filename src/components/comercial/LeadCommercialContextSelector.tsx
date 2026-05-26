"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommercialContext } from "@/types/commercial-contexts";

type LeadCommercialContextSelectorProps = {
  currentContextId: string | null;
  contexts: CommercialContext[];
  onChangeContext: (contextId: string | null) => Promise<boolean | void> | boolean | void;
};

function formatDate(value: string | null) {
  if (!value) return "";
  const [date] = value.split("T");
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function truncateText(value: string | null, maxLength = 140) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function LeadCommercialContextSelector({
  currentContextId,
  contexts,
  onChangeContext,
}: LeadCommercialContextSelectorProps) {
  const [selectedContextId, setSelectedContextId] = useState(
    currentContextId ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelectedContextId(currentContextId ?? "");
    setMessage("");
  }, [currentContextId]);

  const selectedContext = useMemo(
    () =>
      contexts.find((context) => context.id === selectedContextId) ?? null,
    [contexts, selectedContextId]
  );

  async function handleSave() {
    setMessage("");

    const nextContextId = selectedContextId || null;

    if (nextContextId === (currentContextId ?? null)) {
      setMessage("Contexto comercial mantido.");
      return;
    }

    const confirmed = window.confirm("Atualizar contexto comercial deste lead?");
    if (!confirmed) return;

    setIsSaving(true);

    try {
      const result = await onChangeContext(nextContextId);
      if (result !== false) {
        setMessage("Contexto comercial atualizado.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Erro ao salvar contexto: ${error.message}`
          : "Erro ao salvar contexto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Contexto comercial
          </p>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Use para separar publico, campanha, preco e abordagem deste lead.
          </p>
        </div>

        {selectedContext && (
          <span className="rounded-full border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {selectedContext.name}
          </span>
        )}
      </div>

      {contexts.length === 0 ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Nenhum contexto ativo cadastrado. Crie em Comercial &gt; Contextos.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
              Contexto do lead
            </span>
            <select
              value={selectedContextId}
              onChange={(event) => setSelectedContextId(event.target.value)}
              className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">Sem contexto especifico</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Salvar contexto"}
          </button>
        </div>
      )}

      {selectedContext && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 text-xs text-[var(--text2)]">
          <div className="flex flex-wrap gap-2">
            {selectedContext.audienceLabel && (
              <span className="rounded-full bg-[var(--bg4)] px-2 py-1">
                Publico: {selectedContext.audienceLabel}
              </span>
            )}
            {selectedContext.campaignLabel && (
              <span className="rounded-full bg-[var(--bg4)] px-2 py-1">
                Campanha: {selectedContext.campaignLabel}
              </span>
            )}
            {(selectedContext.startsAt || selectedContext.endsAt) && (
              <span className="rounded-full bg-[var(--bg4)] px-2 py-1">
                Periodo: {formatDate(selectedContext.startsAt) || "sem inicio"} ate{" "}
                {formatDate(selectedContext.endsAt) || "sem fim"}
              </span>
            )}
          </div>

          {truncateText(selectedContext.priceNotes) && (
            <p className="mt-3 leading-relaxed">
              <span className="font-semibold text-[var(--text)]">Preco: </span>
              {truncateText(selectedContext.priceNotes)}
            </p>
          )}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text2)]">
          {message}
        </div>
      )}
    </section>
  );
}
