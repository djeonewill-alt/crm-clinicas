"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createCommercialResponse,
  createCommercialResponseCategory,
  deactivateCommercialResponse,
  deactivateCommercialResponseCategory,
  updateCommercialResponse,
  updateCommercialResponseCategory,
} from "@/lib/services/commercial-responses-client";
import {
  initialCommercialCategories,
  initialCommercialResponses,
} from "@/lib/comercial/initial-commercial-responses";
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

const FILTER_ALL = "all";
const FILTER_ACTIVE = "active";
const FILTER_INACTIVE = "inactive";
const FILTER_YES = "yes";
const FILTER_NO = "no";
const CATEGORY_NONE = "__none__";

function normalizeImportKey(value: string) {
  return value.trim().toLowerCase();
}

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

function responseMatchesSearch(
  response: CommercialResponse,
  categories: CommercialResponseCategory[],
  normalizedSearch: string
) {
  if (!normalizedSearch) return true;

  const searchable = [
    response.title,
    response.answerText,
    getCategoryName(categories, response.categoryId),
    ...response.exampleQuestions,
    ...response.tags,
    response.internalNotes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedSearch);
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [responseFormError, setResponseFormError] = useState("");
  const [responseFormSuccess, setResponseFormSuccess] = useState("");
  const [responseForm, setResponseForm] =
    useState<ResponseFormState>(initialResponseForm);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(
    null
  );
  const [isImportingInitialPackage, setIsImportingInitialPackage] =
    useState(false);
  const [importPackageMessage, setImportPackageMessage] = useState("");
  const [importPackageError, setImportPackageError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(FILTER_ALL);
  const [selectedStatus, setSelectedStatus] = useState(FILTER_ALL);
  const [selectedAutoReply, setSelectedAutoReply] = useState(FILTER_ALL);
  const [selectedRequiresHuman, setSelectedRequiresHuman] =
    useState(FILTER_ALL);
  const normalizedSearch = search.trim().toLowerCase();
  const activeResponses = localResponses.filter((response) => response.isActive);
  const autoReplyResponses = localResponses.filter(
    (response) => response.canAutoReply
  );
  const humanResponses = localResponses.filter(
    (response) => response.requiresHuman
  );
  const filteredResponses = useMemo(() => {
    return localResponses.filter((response) => {
      const matchesSearch = responseMatchesSearch(
        response,
        localCategories,
        normalizedSearch
      );
      const matchesCategory =
        selectedCategory === FILTER_ALL ||
        (selectedCategory === CATEGORY_NONE
          ? !response.categoryId
          : response.categoryId === selectedCategory);
      const matchesStatus =
        selectedStatus === FILTER_ALL ||
        (selectedStatus === FILTER_ACTIVE && response.isActive) ||
        (selectedStatus === FILTER_INACTIVE && !response.isActive);
      const matchesAutoReply =
        selectedAutoReply === FILTER_ALL ||
        (selectedAutoReply === FILTER_YES && response.canAutoReply) ||
        (selectedAutoReply === FILTER_NO && !response.canAutoReply);
      const matchesRequiresHuman =
        selectedRequiresHuman === FILTER_ALL ||
        (selectedRequiresHuman === FILTER_YES && response.requiresHuman) ||
        (selectedRequiresHuman === FILTER_NO && !response.requiresHuman);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesAutoReply &&
        matchesRequiresHuman
      );
    });
  }, [
    localCategories,
    localResponses,
    normalizedSearch,
    selectedAutoReply,
    selectedCategory,
    selectedRequiresHuman,
    selectedStatus,
  ]);
  const hasActiveFilters =
    normalizedSearch.length > 0 ||
    selectedCategory !== FILTER_ALL ||
    selectedStatus !== FILTER_ALL ||
    selectedAutoReply !== FILTER_ALL ||
    selectedRequiresHuman !== FILTER_ALL;

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalResponses(responses);
  }, [responses]);

  function handleToggleCategoryForm() {
    setShowCategoryForm((current) => {
      const next = !current;

      if (!next) {
        resetCategoryForm();
        setEditingCategoryId(null);
      }

      return next;
    });
    setCategoryFormError("");
    setCategoryFormSuccess("");
  }

  function handleToggleResponseForm() {
    setShowResponseForm((current) => {
      const next = !current;

      if (!next) {
        resetResponseForm();
        setEditingResponseId(null);
      }

      return next;
    });
    setResponseFormError("");
    setResponseFormSuccess("");
  }

  function resetCategoryForm() {
    setCategoryForm(initialCategoryForm);
  }

  function resetResponseForm() {
    setResponseForm(initialResponseForm);
  }

  function cancelCategoryForm() {
    setShowCategoryForm(false);
    setCategoryFormError("");
    setCategoryFormSuccess("");
    setEditingCategoryId(null);
    resetCategoryForm();
  }

  function handleEditCategory(category: CommercialResponseCategory) {
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      isActive: category.isActive,
      orderIndex: category.orderIndex,
    });
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
    setCategoryFormError("");
    setCategoryFormSuccess("");
  }

  function cancelResponseForm() {
    setShowResponseForm(false);
    setResponseFormError("");
    setResponseFormSuccess("");
    setEditingResponseId(null);
    resetResponseForm();
  }

  function handleEditResponse(response: CommercialResponse) {
    setResponseForm({
      categoryId: response.categoryId ?? "",
      title: response.title,
      answerText: response.answerText,
      exampleQuestionsText: response.exampleQuestions.join("\n"),
      tagsText: response.tags.join(", "),
      isActive: response.isActive,
      canAutoReply: response.canAutoReply,
      requiresHuman: response.requiresHuman,
      internalNotes: response.internalNotes ?? "",
      priority: response.priority,
    });
    setEditingResponseId(response.id);
    setShowResponseForm(true);
    setResponseFormError("");
    setResponseFormSuccess("");
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory(FILTER_ALL);
    setSelectedStatus(FILTER_ALL);
    setSelectedAutoReply(FILTER_ALL);
    setSelectedRequiresHuman(FILTER_ALL);
  }

  async function handleImportInitialPackage() {
    const confirmed = window.confirm(
      "Importar o pacote inicial de categorias e respostas aprovadas? Itens já existentes serão ignorados."
    );

    if (!confirmed) return;

    setIsImportingInitialPackage(true);
    setImportPackageMessage("");
    setImportPackageError("");

    try {
      const categoryBySlug = new Map<string, CommercialResponseCategory>();
      const categoryByName = new Map<string, CommercialResponseCategory>();

      localCategories.forEach((category) => {
        categoryBySlug.set(normalizeImportKey(category.slug), category);
        categoryByName.set(normalizeImportKey(category.name), category);
      });

      const createdCategories: CommercialResponseCategory[] = [];
      let reusedCategories = 0;

      for (const category of initialCommercialCategories) {
        const slugKey = normalizeImportKey(category.slug);
        const nameKey = normalizeImportKey(category.name);
        const existingCategory =
          categoryBySlug.get(slugKey) ?? categoryByName.get(nameKey);

        if (existingCategory) {
          categoryBySlug.set(slugKey, existingCategory);
          categoryByName.set(nameKey, existingCategory);
          reusedCategories += 1;
          continue;
        }

        const createdCategory = await createCommercialResponseCategory({
          empresaId,
          data: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            isActive: true,
            orderIndex: category.orderIndex,
          },
        });

        createdCategories.push(createdCategory);
        categoryBySlug.set(slugKey, createdCategory);
        categoryByName.set(nameKey, createdCategory);
      }

      const responseByTitle = new Map<string, CommercialResponse>();

      localResponses.forEach((response) => {
        responseByTitle.set(normalizeImportKey(response.title), response);
      });

      const createdResponses: CommercialResponse[] = [];
      let ignoredResponses = 0;

      for (const response of initialCommercialResponses) {
        const titleKey = normalizeImportKey(response.title);

        if (responseByTitle.has(titleKey)) {
          ignoredResponses += 1;
          continue;
        }

        const category = categoryBySlug.get(
          normalizeImportKey(response.categorySlug)
        );

        if (!category) {
          ignoredResponses += 1;
          continue;
        }

        const createdResponse = await createCommercialResponse({
          empresaId,
          data: {
            categoryId: category.id,
            title: response.title,
            answerText: response.answerText,
            exampleQuestions: response.exampleQuestions,
            tags: response.tags,
            isActive: true,
            canAutoReply: response.canAutoReply,
            requiresHuman: response.requiresHuman,
            internalNotes: response.internalNotes ?? "",
            priority: response.priority,
          },
        });

        createdResponses.push(createdResponse);
        responseByTitle.set(titleKey, createdResponse);
      }

      setLocalCategories((current) =>
        sortCategories([...current, ...createdCategories])
      );
      setLocalResponses((current) =>
        sortResponses([...current, ...createdResponses])
      );
      setImportPackageMessage(
        `Importação concluída: ${createdCategories.length} categorias criadas, ${reusedCategories} categorias reutilizadas, ${createdResponses.length} respostas criadas, ${ignoredResponses} respostas ignoradas.`
      );
    } catch (error) {
      setImportPackageError(
        error instanceof Error
          ? `Erro ao importar pacote inicial: ${error.message}`
          : "Erro ao importar pacote inicial."
      );
    } finally {
      setIsImportingInitialPackage(false);
    }
  }

  async function handleSaveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryFormError("");
    setCategoryFormSuccess("");

    if (!categoryForm.name.trim()) {
      setCategoryFormError("Informe o nome da categoria.");
      return;
    }

    setIsSavingCategory(true);

    try {
      const payload = {
        name: categoryForm.name,
        slug: categoryForm.slug || undefined,
        description: categoryForm.description,
        isActive: categoryForm.isActive,
        orderIndex: Number(categoryForm.orderIndex) || 0,
      };

      if (editingCategoryId) {
        const updatedCategory = await updateCommercialResponseCategory({
          empresaId,
          categoryId: editingCategoryId,
          data: payload,
        });

        setLocalCategories((current) =>
          sortCategories(
            current.map((category) =>
              category.id === updatedCategory.id ? updatedCategory : category
            )
          )
        );
        setCategoryFormSuccess("Categoria atualizada com sucesso.");
      } else {
        const createdCategory = await createCommercialResponseCategory({
          empresaId,
          data: payload,
        });

        setLocalCategories((current) =>
          sortCategories([...current, createdCategory])
        );
        setCategoryFormSuccess("Categoria criada com sucesso.");
      }

      resetCategoryForm();
      setEditingCategoryId(null);
      setShowCategoryForm(false);
    } catch (error) {
      setCategoryFormError(
        error instanceof Error
          ? editingCategoryId
            ? `Erro ao atualizar categoria: ${error.message}`
            : `Erro ao criar categoria: ${error.message}`
          : editingCategoryId
            ? "Erro ao atualizar categoria."
            : "Erro ao criar categoria."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleDeactivateCategory(category: CommercialResponseCategory) {
    const confirmed = window.confirm(
      "Desativar esta categoria? As respostas vinculadas não serão apagadas."
    );

    if (!confirmed) return;

    setCategoryFormError("");
    setCategoryFormSuccess("");
    setIsSavingCategory(true);

    try {
      await deactivateCommercialResponseCategory({
        empresaId,
        categoryId: category.id,
      });

      setLocalCategories((current) =>
        sortCategories(
          current.map((item) =>
            item.id === category.id ? { ...item, isActive: false } : item
          )
        )
      );

      if (editingCategoryId === category.id) {
        cancelCategoryForm();
      }

      setCategoryFormSuccess("Categoria desativada com sucesso.");
    } catch (error) {
      setCategoryFormError(
        error instanceof Error
          ? `Erro ao desativar categoria: ${error.message}`
          : "Erro ao desativar categoria."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleSaveResponse(event: FormEvent<HTMLFormElement>) {
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
      const payload = {
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
      };

      if (editingResponseId) {
        const updatedResponse = await updateCommercialResponse({
          empresaId,
          responseId: editingResponseId,
          data: payload,
        });

        setLocalResponses((current) =>
          sortResponses(
            current.map((response) =>
              response.id === updatedResponse.id ? updatedResponse : response
            )
          )
        );
        setResponseFormSuccess("Resposta atualizada com sucesso.");
      } else {
        const createdResponse = await createCommercialResponse({
          empresaId,
          data: payload,
        });

        setLocalResponses((current) =>
          sortResponses([...current, createdResponse])
        );
        setResponseFormSuccess("Resposta aprovada criada com sucesso.");
      }

      resetResponseForm();
      setEditingResponseId(null);
      setShowResponseForm(false);
    } catch (error) {
      setResponseFormError(
        error instanceof Error
          ? editingResponseId
            ? `Erro ao atualizar resposta: ${error.message}`
            : `Erro ao criar resposta: ${error.message}`
          : editingResponseId
            ? "Erro ao atualizar resposta."
            : "Erro ao criar resposta."
      );
    } finally {
      setIsSavingResponse(false);
    }
  }

  async function handleDeactivateResponse(response: CommercialResponse) {
    const confirmed = window.confirm("Desativar esta resposta aprovada?");

    if (!confirmed) return;

    setResponseFormError("");
    setResponseFormSuccess("");
    setIsSavingResponse(true);

    try {
      await deactivateCommercialResponse({
        empresaId,
        responseId: response.id,
      });

      setLocalResponses((current) =>
        sortResponses(
          current.map((item) =>
            item.id === response.id ? { ...item, isActive: false } : item
          )
        )
      );

      if (editingResponseId === response.id) {
        cancelResponseForm();
      }

      setResponseFormSuccess("Resposta desativada com sucesso.");
    } catch (error) {
      setResponseFormError(
        error instanceof Error
          ? `Erro ao desativar resposta: ${error.message}`
          : "Erro ao desativar resposta."
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
              Organize categorias e respostas aprovadas para perguntas
              frequentes dos leads. Futuramente, a IA usará essas respostas
              como base segura para sugerir mensagens naturais, sem inventar
              informações.
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
            <button
              type="button"
              disabled={isImportingInitialPackage}
              onClick={() => void handleImportInitialPackage()}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImportingInitialPackage
                ? "Importando..."
                : "Importar pacote inicial"}
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs leading-relaxed text-[var(--text3)]">
          O pacote inicial cria categorias e respostas aprovadas baseadas nas
          conversas reais analisadas. Itens já existentes são ignorados.
          Revise valores, endereços e condições promocionais antes de usar auto
          resposta futura.
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4 text-sm text-[var(--text2)]">
          <p className="font-semibold text-[var(--text)]">Como funciona?</p>
          <div className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--text3)]">
            <p>
              Categoria = o assunto da pergunta do cliente, como Preço,
              Promoção ou Localização.
            </p>
            <p>
              Resposta aprovada = o conteúdo seguro que pode ser usado no
              atendimento.
            </p>
            <p>
              Futuramente, a IA poderá adaptar a resposta ao jeito da pergunta,
              mas sem mudar preço, promessa, condição clínica ou informação que
              não esteja aprovada.
            </p>
          </div>
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

        {importPackageMessage && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {importPackageMessage}
          </div>
        )}

        {importPackageError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {importPackageError}
          </div>
        )}
      </div>

      {showCategoryForm && (
        <form
          onSubmit={handleSaveCategory}
          className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold">
              {editingCategoryId ? "Editar categoria" : "Nova categoria"}
            </h2>
            <p className="mt-1 text-sm text-[var(--text2)]">
              A categoria é o assunto da pergunta do cliente. Ela ajuda a
              separar respostas de preço, promoção, localização, agendamento e
              outros temas recorrentes.
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
                placeholder="Ex: Preço, Promoção, Localização"
              />
              <p className="mt-1 text-xs text-[var(--text3)]">
                A categoria é o assunto da pergunta do cliente.
              </p>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Identificador interno (opcional)
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
              <p className="mt-1 text-xs text-[var(--text3)]">
                Você pode deixar em branco. O sistema gera automaticamente.
              </p>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Descrição da categoria
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
                placeholder="Ex: Perguntas sobre valor, promoção, pacote, desconto e formas de pagamento."
              />
              <p className="mt-1 text-xs text-[var(--text3)]">
                Use a descrição para explicar que tipo de pergunta entra nesta
                categoria.
              </p>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Ordem de exibição
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
              <p className="mt-1 text-xs text-[var(--text3)]">
                Números menores aparecem primeiro. Pode deixar 0.
              </p>
            </label>

            <div className="self-end rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-[var(--text2)]">
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
                Categoria ativa
              </label>
              <p className="mt-1 text-xs text-[var(--text3)]">
                Categorias inativas continuam salvas, mas não devem ser usadas
                normalmente.
              </p>
            </div>
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
              {isSavingCategory
                ? "Salvando..."
                : editingCategoryId
                  ? "Salvar alterações"
                  : "Salvar categoria"}
            </button>
            <button
              type="button"
              disabled={isSavingCategory}
              onClick={cancelCategoryForm}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-4 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showResponseForm && (
        <form
          onSubmit={handleSaveResponse}
          className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold">
              {editingResponseId
                ? "Editar resposta aprovada"
                : "Nova resposta aprovada"}
            </h2>
            <p className="mt-1 text-sm text-[var(--text2)]">
              Esta resposta será usada como fonte segura para atendimento.
              Futuramente, a IA poderá adaptar o tom ao contexto da conversa,
              mas não poderá inventar informações fora do texto aprovado.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Categoria da pergunta
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
              <p className="mt-1 text-xs text-[var(--text3)]">
                Escolha o assunto ao qual esta resposta pertence.
              </p>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text2)]">
                Título interno da resposta
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
              <p className="mt-1 text-xs text-[var(--text3)]">
                Use um título fácil de identificar. Esse título é interno.
              </p>
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
                placeholder="Escreva aqui o conteúdo seguro que poderá ser usado no atendimento."
              />
              <p className="mt-1 text-xs text-[var(--text3)]">
                Essa resposta será a fonte segura. Futuramente, a IA poderá
                adaptar o texto ao contexto da conversa, mas não poderá inventar
                informações fora daqui.
              </p>
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
                placeholder={"Quanto custa?\nQual o valor?\nTem promoção?"}
              />
              <p className="mt-1 text-xs text-[var(--text3)]">
                Escreva exemplos de perguntas que devem cair nesta resposta.
                Uma por linha ou separadas por vírgula.
              </p>
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
                placeholder="preço, valor, promoção"
              />
              <p className="mt-1 text-xs text-[var(--text3)]">
                As tags ajudam a organizar e encontrar respostas.
              </p>
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
              <p className="mt-1 text-xs text-[var(--text3)]">
                Respostas com prioridade maior aparecem antes.
              </p>
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
                Resposta ativa
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
                Pode usar em auto resposta futura
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
                Precisa de revisão humana
              </label>
            </div>

            <div className="md:col-span-2 grid gap-2 text-xs text-[var(--text3)] md:grid-cols-3">
              <p>Resposta ativa fica disponível para uso normal.</p>
              <p>
                Marque auto resposta apenas se for seguro para a IA usar no
                futuro.
              </p>
              <p>
                Use revisão humana quando uma pessoa ainda precisar aprovar o
                envio.
              </p>
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
              <p className="mt-1 text-xs text-[var(--text3)]">
                Notas para a equipe. Essas observações não devem ser enviadas ao
                cliente.
              </p>
            </label>
          </div>

          {responseForm.canAutoReply && responseForm.requiresHuman && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Esta resposta está marcada como auto resposta futura, mas também
              exige revisão humana. Isso não bloqueia o cadastro, mas antes de
              automatizar será necessário revisar essa configuração.
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
              {isSavingResponse
                ? "Salvando..."
                : editingResponseId
                  ? "Salvar alterações"
                  : "Salvar resposta"}
            </button>
            <button
              type="button"
              disabled={isSavingResponse}
              onClick={cancelResponseForm}
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
        <MetricCard
          label="Auto resposta futura"
          value={autoReplyResponses.length}
        />
        <MetricCard label="Revisão humana" value={humanResponses.length} />
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
              Você ainda não cadastrou categorias. Comece criando assuntos como
              Preço, Promoção, Localização, Agendamento ou Como funciona.
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

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    <button
                      type="button"
                      onClick={() => handleEditCategory(category)}
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] transition hover:bg-[var(--bg4)] hover:text-[var(--text)]"
                    >
                      Editar
                    </button>

                    {category.isActive && (
                      <button
                        type="button"
                        disabled={isSavingCategory}
                        onClick={() => void handleDeactivateCategory(category)}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Desativar
                      </button>
                    )}
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

          {localResponses.length > 0 && (
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-72 flex-1 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
                  placeholder="Buscar por título, resposta, perguntas, tags..."
                />

                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="min-w-44 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                >
                  <option value={FILTER_ALL}>Todas as categorias</option>
                  <option value={CATEGORY_NONE}>Sem categoria</option>
                  {localCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="min-w-32 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                >
                  <option value={FILTER_ALL}>Todas</option>
                  <option value={FILTER_ACTIVE}>Ativas</option>
                  <option value={FILTER_INACTIVE}>Inativas</option>
                </select>

                <select
                  value={selectedAutoReply}
                  onChange={(event) => setSelectedAutoReply(event.target.value)}
                  className="min-w-44 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                >
                  <option value={FILTER_ALL}>Todas auto resposta</option>
                  <option value={FILTER_YES}>Pode auto responder</option>
                  <option value={FILTER_NO}>Não pode auto responder</option>
                </select>

                <select
                  value={selectedRequiresHuman}
                  onChange={(event) =>
                    setSelectedRequiresHuman(event.target.value)
                  }
                  className="min-w-44 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text2)] outline-none focus:border-[var(--accent)]"
                >
                  <option value={FILTER_ALL}>Todas revisão humana</option>
                  <option value={FILTER_YES}>Precisa revisão humana</option>
                  <option value={FILTER_NO}>Não precisa revisão humana</option>
                </select>

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpar filtros
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text3)]">
                <span>{filteredResponses.length} resposta(s) encontrada(s)</span>
                {hasActiveFilters && (
                  <span className="rounded-full border border-[var(--accent)] bg-[rgba(232,197,71,.12)] px-2 py-0.5 font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Filtros ativos
                  </span>
                )}
              </div>
            </div>
          )}

          {localResponses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-8 text-center text-sm text-[var(--text3)]">
              Você ainda não cadastrou respostas aprovadas. Depois de criar uma
              categoria, cadastre o texto seguro que poderá ser usado no
              atendimento.
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-8 text-center text-sm text-[var(--text3)]">
              Nenhuma resposta encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {filteredResponses.map((response) => (
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
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                      Resposta aprovada
                    </span>
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
                      activeLabel="Auto resposta futura: sim"
                      inactiveLabel="Auto resposta futura: não"
                    />
                    <StatusBadge
                      active={response.requiresHuman}
                      activeLabel="Revisão humana: sim"
                      inactiveLabel="Revisão humana: não"
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
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        Tags
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {response.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text3)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {response.internalNotes && (
                    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        Observações internas
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text2)]">
                        {response.internalNotes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    <button
                      type="button"
                      onClick={() => handleEditResponse(response)}
                      className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-1.5 text-xs font-semibold text-[var(--text2)] transition hover:bg-[var(--bg4)] hover:text-[var(--text)]"
                    >
                      Editar
                    </button>

                    {response.isActive && (
                      <button
                        type="button"
                        disabled={isSavingResponse}
                        onClick={() => void handleDeactivateResponse(response)}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Desativar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
