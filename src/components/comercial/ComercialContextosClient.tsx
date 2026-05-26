"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createCommercialContext } from "@/lib/services/commercial-contexts-client";
import type { CommercialContext } from "@/types/commercial-contexts";

type ComercialContextosClientProps = {
  empresaId: string | number;
  empresaNome?: string;
  contexts: CommercialContext[];
};

type ContextFormState = {
  name: string;
  slug: string;
  description: string;
  audienceLabel: string;
  campaignLabel: string;
  priceNotes: string;
  paymentNotes: string;
  scheduleNotes: string;
  unitsNotes: string;
  safetyNotes: string;
  internalNotes: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const initialFormState: ContextFormState = {
  name: "",
  slug: "",
  description: "",
  audienceLabel: "",
  campaignLabel: "",
  priceNotes: "",
  paymentNotes: "",
  scheduleNotes: "",
  unitsNotes: "",
  safetyNotes: "",
  internalNotes: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function sortContexts(contexts: CommercialContext[]) {
  return [...contexts].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function isContextCurrent(context: CommercialContext, today: string) {
  if (!context.isActive) return false;
  if (context.startsAt && context.startsAt > today) return false;
  if (context.endsAt && context.endsAt < today) return false;
  return true;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const [date] = value.split("T");
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function truncateText(value: string | null, maxLength = 120) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="text-2xl font-semibold text-[var(--accent)]">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-300"
          : "rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]"
      }
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function NotesBlock({ label, value }: { label: string; value: string | null }) {
  const text = truncateText(value);
  if (!text) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
        {label}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text2)]">{text}</p>
    </div>
  );
}

export function ComercialContextosClient({
  empresaId,
  empresaNome,
  contexts,
}: ComercialContextosClientProps) {
  const [localContexts, setLocalContexts] = useState<CommercialContext[]>(
    sortContexts(contexts)
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<ContextFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const today = todayInputValue();

  useEffect(() => {
    setLocalContexts(sortContexts(contexts));
  }, [contexts]);

  const metrics = useMemo(() => {
    return {
      total: localContexts.length,
      active: localContexts.filter((context) => context.isActive).length,
      inactive: localContexts.filter((context) => !context.isActive).length,
      current: localContexts.filter((context) => isContextCurrent(context, today))
        .length,
    };
  }, [localContexts, today]);

  function updateForm<K extends keyof ContextFormState>(
    key: K,
    value: ContextFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialFormState);
    setFormError("");
  }

  function handleToggleForm() {
    setShowCreateForm((current) => {
      const next = !current;
      if (!next) resetForm();
      return next;
    });
    setStatusMessage("");
  }

  async function handleCreateContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setStatusMessage("");

    if (!form.name.trim()) {
      setFormError("Informe o nome do contexto.");
      return;
    }

    if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) {
      setFormError("A data de fim nao pode ser anterior a data de inicio.");
      return;
    }

    setIsSaving(true);

    try {
      const createdContext = await createCommercialContext({
        empresaId,
        data: {
          name: form.name,
          slug: form.slug || undefined,
          description: form.description,
          audienceLabel: form.audienceLabel,
          campaignLabel: form.campaignLabel,
          priceNotes: form.priceNotes,
          paymentNotes: form.paymentNotes,
          scheduleNotes: form.scheduleNotes,
          unitsNotes: form.unitsNotes,
          safetyNotes: form.safetyNotes,
          internalNotes: form.internalNotes,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          isActive: form.isActive,
        },
      });

      setLocalContexts((current) => sortContexts([createdContext, ...current]));
      resetForm();
      setShowCreateForm(false);
      setStatusMessage("Contexto criado com sucesso.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? `Erro ao criar contexto: ${error.message}`
          : "Erro ao criar contexto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Comercial {empresaNome ? `- ${empresaNome}` : ""}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">
            Contextos Comerciais
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text2)]">
            Separe respostas, precos, condicoes e abordagens por publico ou
            campanha. Exemplo: publico geral, atendimento masculino ou promocao
            temporaria.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleForm}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent2)]"
        >
          {showCreateForm ? "Fechar formulario" : "Novo contexto"}
        </button>
      </div>

      <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <p className="text-sm font-semibold text-[var(--text)]">
          Como funciona?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text2)]">
          Respostas globais continuam valendo para todos os leads. Respostas
          vinculadas a um contexto serao usadas futuramente quando o lead
          estiver nesse contexto.
        </p>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={metrics.total} />
        <MetricCard label="Ativos" value={metrics.active} />
        <MetricCard label="Inativos" value={metrics.inactive} />
        <MetricCard label="Vigentes" value={metrics.current} />
      </div>

      {statusMessage && (
        <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {statusMessage}
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={(event) => void handleCreateContext(event)}
          className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Novo contexto
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Dados comerciais do contexto
              </h2>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Ativo
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Nome do contexto *
              </span>
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Atendimento masculino - Junho"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Slug opcional
              </span>
              <input
                value={form.slug}
                onChange={(event) => updateForm("slug", event.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="atendimento-masculino-junho"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Descricao
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Contexto para separar abordagem, oferta e condicoes comerciais."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Publico-alvo
              </span>
              <input
                value={form.audienceLabel}
                onChange={(event) =>
                  updateForm("audienceLabel", event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Homens com estrias"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Campanha
              </span>
              <input
                value={form.campaignLabel}
                onChange={(event) =>
                  updateForm("campaignLabel", event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Campanha Homens Junho"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Observacoes de preco
              </span>
              <textarea
                value={form.priceNotes}
                onChange={(event) => updateForm("priceNotes", event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Valor promocional especifico para atendimento masculino..."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Observacoes de pagamento
              </span>
              <textarea
                value={form.paymentNotes}
                onChange={(event) =>
                  updateForm("paymentNotes", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Condicoes de Pix, cartao, reserva ou sinal."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Observacoes de agenda
              </span>
              <textarea
                value={form.scheduleNotes}
                onChange={(event) =>
                  updateForm("scheduleNotes", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Janelas de horario ou regras de retorno."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Observacoes de unidades
              </span>
              <textarea
                value={form.unitsNotes}
                onChange={(event) => updateForm("unitsNotes", event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Unidades disponiveis para esta campanha."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Cuidados/regras de seguranca
              </span>
              <textarea
                value={form.safetyNotes}
                onChange={(event) => updateForm("safetyNotes", event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Casos sensiveis devem passar por revisao humana."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Observacoes internas
              </span>
              <textarea
                value={form.internalNotes}
                onChange={(event) =>
                  updateForm("internalNotes", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Notas internas para a equipe comercial."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Data de inicio
              </span>
              <input
                type="date"
                value={form.startsAt}
                onChange={(event) => updateForm("startsAt", event.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Data de fim
              </span>
              <input
                type="date"
                value={form.endsAt}
                onChange={(event) => updateForm("endsAt", event.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          {formError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formError}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Salvar contexto"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleToggleForm}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-4 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Contextos cadastrados</h2>
          <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
            {localContexts.length}
          </span>
        </div>

        {localContexts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border2)] p-8 text-center text-sm text-[var(--text3)]">
            Nenhum contexto comercial cadastrado.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {localContexts.map((context) => (
              <article
                key={context.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text)]">
                      {context.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-[var(--text3)]">
                      {context.slug}
                    </p>
                  </div>

                  <StatusBadge active={context.isActive} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text2)]">
                  {context.audienceLabel && (
                    <span className="rounded-full bg-[var(--bg4)] px-2 py-1">
                      Publico: {context.audienceLabel}
                    </span>
                  )}
                  {context.campaignLabel && (
                    <span className="rounded-full bg-[var(--bg4)] px-2 py-1">
                      Campanha: {context.campaignLabel}
                    </span>
                  )}
                  {(context.startsAt || context.endsAt) && (
                    <span className="rounded-full bg-[var(--bg4)] px-2 py-1">
                      Periodo: {formatDate(context.startsAt) || "sem inicio"} ate{" "}
                      {formatDate(context.endsAt) || "sem fim"}
                    </span>
                  )}
                </div>

                {context.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">
                    {truncateText(context.description, 180)}
                  </p>
                )}

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <NotesBlock label="Preco" value={context.priceNotes} />
                  <NotesBlock label="Pagamento" value={context.paymentNotes} />
                  <NotesBlock label="Seguranca" value={context.safetyNotes} />
                  <NotesBlock label="Interno" value={context.internalNotes} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
