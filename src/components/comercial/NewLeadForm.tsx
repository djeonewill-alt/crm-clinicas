type NewLeadFormProps = {
  name: string;
  phone: string;
  interest: string;
  campaign: string;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onInterestChange: (value: string) => void;
  onCampaignChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function NewLeadForm({
  name,
  phone,
  interest,
  campaign,
  isSaving,
  onNameChange,
  onPhoneChange,
  onInterestChange,
  onCampaignChange,
  onSave,
  onCancel,
}: NewLeadFormProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Novo lead
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          Cadastrar em Prospecção / d1
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Nome
          </label>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Nome do lead"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Telefone *
          </label>
          <input
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Interesse
          </label>
          <input
            value={interest}
            onChange={(event) => onInterestChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Botox, estrias, avaliação..."
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Campanha
          </label>
          <input
            value={campaign}
            onChange={(event) => onCampaignChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Instagram, tráfego, indicação..."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Salvando..." : "Salvar lead"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border2)] px-4 py-2 text-xs text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
