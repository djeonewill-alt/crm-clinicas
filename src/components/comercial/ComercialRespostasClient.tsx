"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createCommercialResponse,
  createCommercialResponseCategory,
} from "@/lib/services/commercial-responses-client";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";

type ComercialRespostasClientProps = {
  empresaId: string | number;
  empresaNome: string;
  categories: CommercialResponseCategory[];
  responses: CommercialResponse[];
};

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  orderIndex: number;
};

type ResponseFormState = {
  categoryId: string;
  title: string;
  answerText: string;
  exampleQuestionsText: string;
  tagsText: string;
  isActive: boolean;
  canAutoReply: boolean;
  requiresHuman: boolean;
  internalNotes: string;
  priority: number;
};

const initialCategoryForm: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
  orderIndex: 0,
};

const initialResponseForm: ResponseFormState = {
  categoryId: "",
  title: "",
  answerText: "",
  exampleQuestionsText: "",
  tagsText: "",
  isActive: true,
  canAutoReply: false,
  requiresHuman: true,
  internalNotes: "",
  priority: 0,
};

function sortCategories(categories: CommercialResponseCategory[]) {
  return [...categories].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex || a.name.localeCompare(b.name, "pt-BR")
  );
}

function sortResponses(responses: CommercialResponse[]) {
  return [...responses].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function parseListText(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCategoryName(
  categories: CommercialResponseCategory[],
  categoryId?: string | null
) {
  if (!categoryId) return "Sem categoria";

  return (
    categories.find((category) => category.id === categoryId)?.name ??
    "Categoria não encontrada"
  );
}

function countResponsesByCategory(
  responses: CommercialResponse[],
  categoryId: string
) {
  return responses.filter((response) => response.categoryId === categoryId)
    .length;
}

function truncateText(value: string, maxLength = 180) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={
        active
          ? "rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-300"
          : "rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]"
      }
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
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

export function ComercialRespostasClient({
  empresaId,
  empresaNome,
  categories,
  responses,
}: ComercialRespostasClientProps) {
  const [localCategories, setLocalCategories] =
    useState<CommercialResponseCategory[]>(categories);
  const [localResponses, setLocalResponses] =
    useState<CommercialResponse[]>(responses);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState("");
  const [categoryFormSuccess, setCategoryFormSuccess] = useState("");
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(initialCategoryForm);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [responseFormError, setResponseFormError] = useState("");
  const [responseFormSuccess, setResponseFormSuccess] = useState("");
  const [responseForm, setResponseForm] =
    useState<ResponseFormState>(initialResponseForm);
  const activeResponses = localResponses.filter((response) => response.isActive);
  const autoReplyResponses = localResponses.filter(
    (response) => response.canAutoReply
  );
  const humanResponses = localResponses.filter(
    (response) => response.requiresHuman
  );

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalResponses(responses);
  }, [responses]);

  function handleToggleCategoryForm() {
    setShowCategoryForm((current) => !current);
    setCategoryFormError("");
    setCategoryFormSuccess("");
  }

  function handleToggleResponseForm() {
    setShowResponseForm((current) => !current);
    setResponseFormError("");
    setResponseFormSuccess("");
  }

  function resetCategoryForm() {
    setCategoryForm(initialCategoryForm);
  }

  function resetResponseForm() {
    setResponseForm(initialResponseForm);
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryFormError("");
    setCategoryFormSuccess("");

    if (!categoryForm.name.trim()) {
      setCategoryFormError("Informe o nome da categoria.");
      return;
    }

    setIsSavingCategory(true);

    try {
      const createdCategory = await createCommercialResponseCategory({
        empresaId,
        data: {
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description,
          isActive: categoryForm.isActive,
          orderIndex: Number(categoryForm.orderIndex) || 0,
        },
      });

      setLocalCategories((current) =>
        sortCategories([...current, createdCategory])
      );
      resetCategoryForm();
      setShowCategoryForm(false);
      setCategoryFormSuccess("Categoria criada com sucesso.");
    } catch (error) {
      setCategoryFormError(
        error instanceof Error
          ? `Erro ao criar categoria: ${error.message}`
          : "Erro ao criar categoria."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleCreateResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResponseFormError("");
    setResponseFormSuccess("");

    if (!responseForm.title.trim()) {
      setResponseFormError("Informe o título da resposta.");
      return;
    }

    if (!responseForm.answerText.trim()) {
      setResponseFormError("Informe o texto da resposta aprovada.");
      return;
    }

    setIsSavingResponse(true);

    try {
      const createdResponse = await createCommercialResponse({
        empresaId,
        data: {
          categoryId: responseForm.categoryId || null,
          title: responseForm.title,
          answerText: responseForm.answerText,
          exampleQuestions: parseListText(responseForm.exampleQuestionsText),
          tags: parseListText(responseForm.tagsText),
          isActive: responseForm.isActive,
          canAutoReply: responseForm.canAutoReply,
          requiresHuman: responseForm.requiresHuman,
          internalNotes: responseForm.internalNotes,
          priority: Number(responseForm.priority) || 0,
        },
      });

      setLocalResponses((current) =>
        sortResponses([...current, createdResponse])
      );
      resetResponseForm();
      setShowResponseForm(false);
      setResponseFormSuccess("Resposta aprovada criada com sucesso.");
    } catch (error) {
      setResponseFormError(
        error instanceof Error
          ? `Erro ao criar resposta: ${error.message}`
          : "Erro ao criar resposta."
      );
    } finally {
      setIsSavingResponse(false);
    }
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6"
      data-empresa-id={empresaId}
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Comercial / Respostas · {empresaNome}
            </p>
            <h1 className="text-xl font-semibold">Respostas Comerciais</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text2)]">
              Cadastre e organize respostas aprovadas para perguntas frequentes.
              Futuramente, a IA usará essa base para sugerir respostas seguras.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleCategoryForm}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] transition hover:bg-[var(--bg4)] hover:text-[var(--text)]"
            >
              {showCategoryForm ? "Fechar categoria" : "Nova categoria"}
            </button>
            <button
              type="button"
              onClick={handleToggleResponseForm}
              className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.10)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[rgba(232,197,71,.18)]"
            >
              {showResponseForm ? "Fechar resposta" : "Nova resposta"}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text3)]">
          Edição e desativação serão adicionadas nas próximas etapas.
        </div>

        {categoryFormSuccess && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {categoryFormSuccess}
          </div>
        )}

        {responseFormSuccess && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {responseFormSuccess}
          </div>
        )}
      </div>

      {showCategoryForm && (
        <form
          onSubmit={handleCreateCategory}
          className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Nova categoria</h2>
            <p className="mt-1 text-sm text-[var(--text2)]">
              As categorias organizam as respostas aprovadas que futuramente a
              IA poderá consultar.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Nome da categoria
              </span>
              <input
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Preço"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Slug opcional
              </span>
              <input
                value={categoryForm.slug}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="preco"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Descrição
              </span>
              <textarea
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Perguntas sobre valores, condições e pacotes."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Ordem
              </span>
              <input
                type="number"
                value={categoryForm.orderIndex}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    orderIndex: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="flex items-center gap-2 self-end rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)]">
              <input
                type="checkbox"
                checked={categoryForm.isActive}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Ativa
            </label>
          </div>

          {categoryFormError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {categoryFormError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSavingCategory}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingCategory ? "Salvando..." : "Salvar categoria"}
            </button>
            <button
              type="button"
              disabled={isSavingCategory}
              onClick={() => {
                setShowCategoryForm(false);
                setCategoryFormError("");
                resetCategoryForm();
              }}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-4 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showResponseForm && (
        <form
          onSubmit={handleCreateResponse}
          className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Nova resposta aprovada</h2>
            <p className="mt-1 text-sm text-[var(--text2)]">
              Esta resposta será usada como base segura para atendimento.
              Futuramente, a IA só poderá sugerir respostas aprovadas.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Categoria
              </span>
              <select
                value={responseForm.categoryId}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
              >
                <option value="">Sem categoria</option>
                {localCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isActive ? "" : " (inativa)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Título
              </span>
              <input
                value={responseForm.title}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Ex: Preço - promoção atual"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Resposta aprovada
              </span>
              <textarea
                value={responseForm.answerText}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    answerText: event.target.value,
                  }))
                }
                rows={5}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Digite o texto aprovado para o atendimento."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Perguntas parecidas
              </span>
              <textarea
                value={responseForm.exampleQuestionsText}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    exampleQuestionsText: event.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Uma por linha ou separadas por vírgula."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Tags
              </span>
              <textarea
                value={responseForm.tagsText}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    tagsText: event.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Separe por vírgula."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Prioridade
              </span>
              <input
                type="number"
                value={responseForm.priority}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    priority: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={responseForm.isActive}
                  onChange={(event) =>
                    setResponseForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Ativa
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={responseForm.canAutoReply}
                  onChange={(event) =>
                    setResponseForm((current) => ({
                      ...current,
                      canAutoReply: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Auto resposta futura
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text2)]">
                <input
                  type="checkbox"
                  checked={responseForm.requiresHuman}
                  onChange={(event) =>
                    setResponseForm((current) => ({
                      ...current,
                      requiresHuman: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Precisa de humano
              </label>
            </div>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Observações internas
              </span>
              <textarea
                value={responseForm.internalNotes}
                onChange={(event) =>
                  setResponseForm((current) => ({
                    ...current,
                    internalNotes: event.target.value,
                  }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                placeholder="Uso interno da equipe."
              />
            </label>
          </div>

          {responseForm.canAutoReply && responseForm.requiresHuman && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Esta resposta está marcada para auto resposta e humano necessário.
              Revise essa configuração antes de usar IA automática.
            </div>
          )}

          {responseFormError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {responseFormError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSavingResponse}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingResponse ? "Salvando..." : "Salvar resposta"}
            </button>
            <button
              type="button"
              disabled={isSavingResponse}
              onClick={() => {
                setShowResponseForm(false);
                setResponseFormError("");
                resetResponseForm();
              }}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-4 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Categorias" value={localCategories.length} />
        <MetricCard label="Respostas" value={localResponses.length} />
        <MetricCard label="Ativas" value={activeResponses.length} />
        <MetricCard label="Auto resposta" value={autoReplyResponses.length} />
        <MetricCard label="Exigem humano" value={humanResponses.length} />
      </div>

      <div className="mt-4 grid min-h-0 gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Categorias</h2>
            <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
              {localCategories.length}
            </span>
          </div>

          {localCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-4 text-center text-sm text-[var(--text3)]">
              Você ainda não cadastrou categorias.
            </div>
          ) : (
            <div className="space-y-2">
              {localCategories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="mt-1 text-xs text-[var(--text2)]">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <StatusBadge
                      active={category.isActive}
                      activeLabel="Ativa"
                      inactiveLabel="Inativa"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text3)]">
                    <span>Ordem: {category.orderIndex}</span>
                    <span>
                      {countResponsesByCategory(localResponses, category.id)} resposta(s)
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Respostas aprovadas</h2>
            <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
              {localResponses.length}
            </span>
          </div>

          {localResponses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-8 text-center text-sm text-[var(--text3)]">
              Você ainda não cadastrou respostas aprovadas.
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {localResponses.map((response) => (
                <article
                  key={response.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        {getCategoryName(localCategories, response.categoryId)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-[var(--text)]">
                        {response.title}
                      </h3>
                    </div>

                    <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text2)]">
                      Prioridade {response.priority}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text2)]">
                    {truncateText(response.answerText)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge
                      active={response.isActive}
                      activeLabel="Ativa"
                      inactiveLabel="Inativa"
                    />
                    <StatusBadge
                      active={response.canAutoReply}
                      activeLabel="Auto: sim"
                      inactiveLabel="Auto: não"
                    />
                    <StatusBadge
                      active={response.requiresHuman}
                      activeLabel="Humano: sim"
                      inactiveLabel="Humano: não"
                    />
                  </div>

                  {response.exampleQuestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        Perguntas parecidas
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {response.exampleQuestions.map((question) => (
                          <span
                            key={question}
                            className="rounded-full bg-[var(--bg4)] px-2 py-0.5 text-[10px] text-[var(--text2)]"
                          >
                            {question}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {response.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {response.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text3)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
