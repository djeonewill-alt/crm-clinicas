"use client";

import { useMemo, useState } from "react";
import { buildLeadCallScript } from "@/lib/comercial/call-script";
import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

type LeadCallScriptPanelProps = {
  lead: Lead;
  leadHistory: LeadHistoryItem[];
};

function SectionList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--text2)]">
        {items.length > 0 ? (
          items.map((item) => <li key={item}>• {item}</li>)
        ) : (
          <li>Sem dados suficientes.</li>
        )}
      </ul>
    </div>
  );
}

function buildCopyText(script: ReturnType<typeof buildLeadCallScript>) {
  return [
    "Roteiro de ligação",
    "",
    "Contexto rápido:",
    ...script.contextSummary.map((item) => `- ${item}`),
    "",
    "Já sabemos:",
    ...script.alreadyKnown.map((item) => `- ${item}`),
    "",
    "Falta conduzir:",
    ...script.pendingCheckpoints.map((item) => `- ${item}`),
    "",
    `Objetivo: ${script.callObjective}`,
    "",
    `Abertura: ${script.openingScript}`,
    "",
    "Perguntas essenciais:",
    ...script.essentialQuestions.map((item) => `- ${item}`),
    "",
    `Fechamento: ${script.closingScript}`,
    "",
    `Mensagem pós-ligação: ${script.postCallWhatsAppMessage}`,
  ].join("\n");
}

export function LeadCallScriptPanel({
  lead,
  leadHistory,
}: LeadCallScriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const script = useMemo(
    () => buildLeadCallScript({ lead, history: leadHistory }),
    [lead, leadHistory]
  );

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copiado.`);
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      setCopyMessage("Não foi possível copiar automaticamente.");
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Roteiro de ligação
          </p>
          <p className="mt-1 text-sm text-[var(--text2)]">
            Guia compacto pelo checkpoint atual. Nada é enviado ou marcado automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
          >
            {isOpen ? "Ocultar roteiro" : "Mostrar roteiro"}
          </button>
          {isOpen && (
            <>
              <button
                type="button"
                onClick={() => copyText(buildCopyText(script), "Roteiro")}
                className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
              >
                Copiar roteiro
              </button>
              <button
                type="button"
                onClick={() =>
                  copyText(script.postCallWhatsAppMessage, "Mensagem pós-ligação")
                }
                className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
              >
                Copiar mensagem pós-ligação
              </button>
            </>
          )}
        </div>
      </div>

      {copyMessage && (
        <p className="mt-3 text-xs font-semibold text-[var(--accent)]">
          {copyMessage}
        </p>
      )}

      {isOpen && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <SectionList title="Contexto rápido" items={script.contextSummary} />
            <SectionList title="Já sabemos" items={script.alreadyKnown} />
            <SectionList title="Falta conduzir" items={script.pendingCheckpoints} />
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Objetivo da ligação
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">
              {script.callObjective}
            </p>
            <p className="mt-3 text-sm text-[var(--text2)]">
              {script.openingScript}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <SectionList
              title="Perguntas essenciais"
              items={script.essentialQuestions}
            />
            <SectionList title="Atenções" items={script.warnings} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Fechamento
              </p>
              <p className="mt-2 text-sm text-[var(--text2)]">
                {script.closingScript}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Mensagem pós-ligação
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text2)]">
                {script.postCallWhatsAppMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
