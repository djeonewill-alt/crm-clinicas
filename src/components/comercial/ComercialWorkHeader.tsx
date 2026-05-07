type ComercialWorkHeaderProps = {
  empresaNome: string;
  activeFunnel: {
    label: string;
    color: string;
  };
  queueCount: number;
  hiddenCount: number;
  message: string;
  onToggleNewLeadForm: () => void;
};

export function ComercialWorkHeader({
  empresaNome,
  activeFunnel,
  queueCount,
  hiddenCount,
  message,
  onToggleNewLeadForm,
}: ComercialWorkHeaderProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
        Comercial / Trabalho · {empresaNome}
      </p>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{activeFunnel.label}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text2)]">
            Use “Fila” para trabalhar só os leads do dia atual ou “Todos” para revisar leads ocultos do funil.
          </p>
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={onToggleNewLeadForm}
            className="mb-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)]"
          >
            + Novo lead
          </button>

          <span
            className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: activeFunnel.color,
              color: activeFunnel.color,
              background: "rgba(255,255,255,.03)",
            }}
          >
            {queueCount} na fila
          </span>

          {hiddenCount > 0 && (
            <div className="mt-2 text-xs text-[var(--text3)]">
              {hiddenCount} oculto(s)
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3 text-sm text-[var(--text2)]">
          {message}
        </div>
      )}
    </div>
  );
}
