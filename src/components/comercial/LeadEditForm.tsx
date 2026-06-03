"use client";

import { useState } from "react";
import type { Lead } from "@/types/lead";

type LeadEditData = {
  nome: string;
  tel: string;
  esp?: string;
  campanha?: string;
  dataEntrada?: string | null;
};

type LeadEditFormProps = {
  lead: Lead;
  onCancel: () => void;
  onSave: (data: LeadEditData) => boolean | void | Promise<boolean | void>;
};

export function LeadEditForm({ lead, onCancel, onSave }: LeadEditFormProps) {
  const [nome, setNome] = useState(lead.nome ?? "");
  const [tel, setTel] = useState(lead.tel ?? "");
  const [esp, setEsp] = useState(lead.esp ?? "");
  const [campanha, setCampanha] = useState(lead.campanha ?? "");
  const [dataEntrada, setDataEntrada] = useState(
    lead.dataEntrada ? lead.dataEntrada.slice(0, 10) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (!tel.trim()) {
      setError("Digite ao menos o telefone do lead.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        nome: nome.trim(),
        tel: tel.trim(),
        esp: esp.trim(),
        campanha: campanha.trim(),
        dataEntrada: dataEntrada || null,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar lead."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Editar lead
        </p>
        <h3 className="mt-1 text-base font-semibold">Dados básicos</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Nome
          </label>
          <input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Nome do lead"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Telefone/WhatsApp *
          </label>
          <input
            value={tel}
            onChange={(event) => setTel(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Interesse/Procedimento
          </label>
          <input
            value={esp}
            onChange={(event) => setEsp(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Botox, estrias, avaliação..."
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Campanha/Origem
          </label>
          <input
            value={campanha}
            onChange={(event) => setCampanha(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Instagram, tráfego, indicação..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
            Data de entrada
          </label>
          <input
            type="date"
            value={dataEntrada}
            onChange={(event) => setDataEntrada(event.target.value)}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text3)]">
            Data comercial real em que o lead entrou pela campanha/WhatsApp. Nao altera a
            data de criacao no CRM.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Salvando..." : "Salvar alterações"}
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="rounded-lg border border-[var(--border2)] px-4 py-2 text-xs text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
