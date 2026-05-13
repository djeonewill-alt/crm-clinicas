"use client";

import { useState } from "react";
import {
  messageScripts,
  renderMessageScript,
} from "@/lib/comercial/message-scripts";
import type { Lead } from "@/types/lead";

type LeadMessageScriptsProps = {
  lead: Lead;
};

export function LeadMessageScripts({ lead }: LeadMessageScriptsProps) {
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const [errorScriptId, setErrorScriptId] = useState<string | null>(null);

  async function handleCopy(scriptId: string, text: string) {
    setCopiedScriptId(null);
    setErrorScriptId(null);

    if (!navigator.clipboard) {
      setErrorScriptId(scriptId);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedScriptId(scriptId);
    } catch {
      setErrorScriptId(scriptId);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Scripts de mensagem
        </p>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Copie uma mensagem pronta e use no atendimento pelo WhatsApp.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {messageScripts.map((script) => {
          const renderedText = renderMessageScript(script.body, lead);
          const wasCopied = copiedScriptId === script.id;
          const hasError = errorScriptId === script.id;

          return (
            <article
              key={script.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    {script.category}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">
                    {script.title}
                  </h3>
                  {script.description && (
                    <p className="mt-1 text-xs text-[var(--text3)]">
                      {script.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopy(script.id, renderedText)}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] hover:bg-[var(--bg4)] hover:text-[var(--text)]"
                >
                  {wasCopied ? "Copiado" : "Copiar"}
                </button>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text2)]">
                {renderedText}
              </p>

              {hasError && (
                <p className="mt-2 text-xs text-red-300">
                  Não foi possível copiar. Selecione o texto manualmente.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
