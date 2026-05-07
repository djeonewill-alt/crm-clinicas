"use client";

import { RESULTADOS, TIPOS_TENTATIVA } from "@/lib/constants/crm";
import { cn } from "@/lib/utils/cn";
import type { Lead, Tentativa } from "@/types/lead";

type TentativasListProps = {
  lead: Lead;
  tentativas: Tentativa[];
  savingLeadId: string | number | null;
  onSetResultado: (
    lead: Lead,
    tentativaIndex: number,
    resultado: string
  ) => void | Promise<void>;
};

function getResultOptions(tentativa: Tentativa) {
  const tipo = String(tentativa.tipo || "mensagem") as keyof typeof RESULTADOS;
  return RESULTADOS[tipo] ?? RESULTADOS.mensagem;
}

function getTentativaLabel(tentativa: Tentativa) {
  const tipo = String(tentativa.tipo || "mensagem") as keyof typeof TIPOS_TENTATIVA;
  return TIPOS_TENTATIVA[tipo]?.label ?? "Tentativa";
}

function getTentativaIcon(tentativa: Tentativa) {
  const tipo = String(tentativa.tipo || "mensagem") as keyof typeof TIPOS_TENTATIVA;
  return TIPOS_TENTATIVA[tipo]?.icon ?? "💬";
}

export function TentativasList({
  lead,
  tentativas,
  savingLeadId,
  onSetResultado,
}: TentativasListProps) {
  return (
    <div className="mb-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
        Tentativas do dia
      </p>

      {tentativas.map((tentativa, index) => {
        const done = Boolean(tentativa.resultado);
        const options = getResultOptions(tentativa);

        return (
          <div
            key={`${lead.id}-${index}`}
            className={cn(
              "rounded-xl border p-4",
              done
                ? "border-green-500/30 bg-green-500/10"
                : "border-[var(--border)] bg-[var(--bg3)]"
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {getTentativaIcon(tentativa)} Tentativa {index + 1} ·{" "}
                  {getTentativaLabel(tentativa)}
                </div>
                <div className="mt-1 text-xs text-[var(--text2)]">
                  {done
                    ? `Resultado: ${tentativa.resultado} ${
                        tentativa.hora ? `às ${tentativa.hora}` : ""
                      }`
                    : "Pendente"}
                </div>
              </div>

              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-semibold",
                  done
                    ? "bg-green-500/10 text-green-300"
                    : "bg-[var(--bg4)] text-[var(--text3)]"
                )}
              >
                {done ? "feito" : "pendente"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={savingLeadId === lead.id}
                  onClick={() => onSetResultado(lead, index, option.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                    tentativa.resultado === option.id
                      ? "border-[var(--accent)] bg-[rgba(232,197,71,.15)] text-[var(--accent)]"
                      : "border-[var(--border2)] bg-transparent text-[var(--text2)] hover:bg-[var(--bg4)] hover:text-[var(--text)]"
                  )}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
