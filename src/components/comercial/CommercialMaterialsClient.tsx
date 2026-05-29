"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCommercialMaterial,
  deleteOrDeactivateCommercialMaterial,
  listCommercialMaterials,
  updateCommercialMaterial,
  uploadCommercialMaterialImage,
  type CommercialMaterial,
  type CommercialMaterialCategory,
  type CommercialMaterialFilters,
  type CommercialMaterialFormInput,
} from "@/lib/services/commercial-materials-client";

type CommercialMaterialsClientProps = {
  empresaId: string | number;
  empresaNome: string;
};

type MaterialFormState = {
  title: string;
  description: string;
  category: CommercialMaterialCategory;
  region: string;
  skinTone: string;
  sessionsCount: string;
  audience: string;
  tags: string;
  caption: string;
  publicUrl: string;
  isActive: boolean;
};

const CATEGORY_OPTIONS = [
  { value: "before_after", label: "Antes e depois" },
  { value: "address", label: "Endereco" },
  { value: "payment_pix", label: "Pix / pagamento" },
  { value: "schedule", label: "Agenda / horario" },
  { value: "certification", label: "Certificacao / profissional" },
  { value: "document", label: "Documento" },
  { value: "other", label: "Outro" },
] as const;

const REGION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "barriga", label: "Barriga" },
  { value: "abdomen", label: "Abdomen" },
  { value: "flancos", label: "Flancos" },
  { value: "costas", label: "Costas" },
  { value: "coxas", label: "Coxas" },
  { value: "gluteos", label: "Gluteos" },
  { value: "seios", label: "Seios" },
  { value: "bracos", label: "Bracos" },
  { value: "geral", label: "Geral" },
  { value: "outra", label: "Outra" },
];

const SKIN_TONE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "pele_clara", label: "Pele clara" },
  { value: "pele_negra", label: "Pele negra" },
  { value: "pele_morena", label: "Pele morena" },
  { value: "qualquer", label: "Qualquer pele" },
];

const AUDIENCE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "ambos", label: "Ambos" },
];

const ACTIVE_OPTIONS = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "all", label: "Todos" },
] as const;

const EMPTY_FORM: MaterialFormState = {
  title: "",
  description: "",
  category: "before_after",
  region: "",
  skinTone: "",
  sessionsCount: "",
  audience: "",
  tags: "",
  caption: "",
  publicUrl: "",
  isActive: true,
};

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTags(tags: string[]) {
  return tags.join(", ");
}

function findLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null
) {
  return options.find((option) => option.value === value)?.label ?? value ?? "-";
}

function materialToForm(material: CommercialMaterial): MaterialFormState {
  return {
    title: material.title,
    description: material.description ?? "",
    category: material.category,
    region: material.region ?? "",
    skinTone: material.skinTone ?? "",
    sessionsCount:
      material.sessionsCount === null ? "" : String(material.sessionsCount),
    audience: material.audience ?? "",
    tags: formatTags(material.tags),
    caption: material.caption ?? "",
    publicUrl: material.publicUrl ?? "",
    isActive: material.isActive,
  };
}

export function CommercialMaterialsClient({
  empresaId,
  empresaNome,
}: CommercialMaterialsClientProps) {
  const [materials, setMaterials] = useState<CommercialMaterial[]>([]);
  const [filters, setFilters] = useState<CommercialMaterialFilters>({
    activeStatus: "active",
  });
  const [form, setForm] = useState<MaterialFormState>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingMaterial, setEditingMaterial] =
    useState<CommercialMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const localPreviewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  async function loadMaterials(nextFilters = filters) {
    setIsLoading(true);
    setError("");

    try {
      const data = await listCommercialMaterials(empresaId, nextFilters);
      setMaterials(data);
    } catch (loadError) {
      setMaterials([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar materiais comerciais."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  function updateFilter(key: keyof CommercialMaterialFilters, value: string) {
    const nextFilters = {
      ...filters,
      [key]: value || undefined,
    };

    if (key === "activeStatus") {
      nextFilters.activeStatus = (value || "active") as
        | "active"
        | "inactive"
        | "all";
    }

    setFilters(nextFilters);
    void loadMaterials(nextFilters);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setEditingMaterial(null);
  }

  function buildFormInput(uploadData?: Partial<CommercialMaterialFormInput>) {
    return {
      title: form.title,
      description: form.description,
      category: form.category,
      region: form.region,
      skinTone: form.skinTone,
      sessionsCount: form.sessionsCount ? Number(form.sessionsCount) : null,
      audience: form.audience,
      publicUrl: uploadData?.publicUrl ?? form.publicUrl,
      caption: form.caption,
      tags: parseTags(form.tags),
      isActive: form.isActive,
      fileName: uploadData?.fileName ?? editingMaterial?.fileName ?? null,
      fileMimeType:
        uploadData?.fileMimeType ?? editingMaterial?.fileMimeType ?? null,
      fileSize: uploadData?.fileSize ?? editingMaterial?.fileSize ?? null,
      storageBucket:
        uploadData?.storageBucket ?? editingMaterial?.storageBucket ?? null,
      storagePath: uploadData?.storagePath ?? editingMaterial?.storagePath ?? null,
    } satisfies CommercialMaterialFormInput;
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      let uploadData: Partial<CommercialMaterialFormInput> | undefined;

      if (selectedFile) {
        uploadData = await uploadCommercialMaterialImage(selectedFile, empresaId);
      }

      const payload = buildFormInput(uploadData);
      const saved = editingMaterial
        ? await updateCommercialMaterial({
            empresaId,
            materialId: editingMaterial.id,
            data: payload,
          })
        : await createCommercialMaterial({
            empresaId,
            data: payload,
          });

      setMaterials((current) => {
        if (editingMaterial) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }

        return [saved, ...current];
      });
      resetForm();
      setMessage("Material salvo com sucesso.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar material comercial."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(material: CommercialMaterial) {
    setMessage("");
    setError("");

    try {
      const updated = await deleteOrDeactivateCommercialMaterial({
        empresaId,
        materialId: material.id,
        isActive: !material.isActive,
      });

      setMaterials((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setMessage(updated.isActive ? "Material reativado." : "Material desativado.");
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Erro ao atualizar material."
      );
    }
  }

  const previewUrl = localPreviewUrl ?? form.publicUrl;

  return (
    <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Comercial
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">
          Materiais comerciais
        </h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Cadastre imagens e materiais usados no atendimento de {empresaNome}.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              {editingMaterial ? "Editar material" : "Novo material"}
            </p>
            <p className="mt-1 text-sm text-[var(--text2)]">
              Use URL publica ou envie uma imagem JPG, PNG ou WebP.
            </p>
          </div>

          {editingMaterial && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
            >
              Cancelar edicao
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Titulo
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
                placeholder="Antes/depois - barriga - 1 sessao"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Categoria
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as CommercialMaterialCategory,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Regiao
              <select
                value={form.region}
                onChange={(event) =>
                  setForm((current) => ({ ...current, region: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Tipo de pele
              <select
                value={form.skinTone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    skinTone: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
              >
                {SKIN_TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Sessoes
              <input
                type="number"
                min={0}
                value={form.sessionsCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sessionsCount: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Publico
              <select
                value={form.audience}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    audience: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Tags
              <input
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tags: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
                placeholder="barriga, pele clara, 1 sessao"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)] md:col-span-2">
              Legenda sugerida
              <input
                value={form.caption}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    caption: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              URL publica
              <input
                value={form.publicUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    publicUrl: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none"
                placeholder="https://..."
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Upload de imagem
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Ativo
            </label>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Preview
            </p>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview do material"
                className="mt-2 aspect-square w-full rounded-lg object-cover"
              />
            ) : (
              <div className="mt-2 flex aspect-square items-center justify-center rounded-lg border border-dashed border-[var(--border2)] text-xs text-[var(--text3)]">
                Sem imagem
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving || !form.title.trim() || !form.category}
            onClick={() => void handleSave()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : editingMaterial ? "Salvar edicao" : "Cadastrar material"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={resetForm}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-4 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Lista de materiais
            </p>
            <p className="mt-1 text-sm text-[var(--text2)]">
              {isLoading ? "Carregando..." : `${materials.length} material(is) encontrado(s).`}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={filters.category ?? ""}
              onChange={(event) => updateFilter("category", event.target.value)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text)] outline-none"
            >
              <option value="">Categorias</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.region ?? ""}
              onChange={(event) => updateFilter("region", event.target.value)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text)] outline-none"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.skinTone ?? ""}
              onChange={(event) => updateFilter("skinTone", event.target.value)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text)] outline-none"
            >
              {SKIN_TONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.audience ?? ""}
              onChange={(event) => updateFilter("audience", event.target.value)}
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text)] outline-none"
            >
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.activeStatus ?? "active"}
              onChange={(event) =>
                updateFilter("activeStatus", event.target.value)
              }
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-xs text-[var(--text)] outline-none"
            >
              {ACTIVE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isLoading && materials.length === 0 && !error && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-4 text-sm text-[var(--text3)]">
            Nenhum material cadastrado ainda.
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <article
              key={material.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3"
            >
              {material.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={material.publicUrl}
                  alt={material.title}
                  className="aspect-video w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-[var(--border2)] text-xs text-[var(--text3)]">
                  Sem imagem
                </div>
              )}

              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    {material.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text2)]">
                    {findLabel(CATEGORY_OPTIONS, material.category)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    material.isActive
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                  }`}
                >
                  {material.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-[var(--text3)]">
                {material.region && (
                  <span className="rounded-full bg-[var(--bg3)] px-2 py-1">
                    {findLabel(REGION_OPTIONS, material.region)}
                  </span>
                )}
                {material.skinTone && (
                  <span className="rounded-full bg-[var(--bg3)] px-2 py-1">
                    {findLabel(SKIN_TONE_OPTIONS, material.skinTone)}
                  </span>
                )}
                {material.sessionsCount !== null && (
                  <span className="rounded-full bg-[var(--bg3)] px-2 py-1">
                    {material.sessionsCount} sessao(oes)
                  </span>
                )}
                {material.audience && (
                  <span className="rounded-full bg-[var(--bg3)] px-2 py-1">
                    {findLabel(AUDIENCE_OPTIONS, material.audience)}
                  </span>
                )}
              </div>

              {material.tags.length > 0 && (
                <p className="mt-2 text-xs text-[var(--text3)]">
                  Tags: {material.tags.join(", ")}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {material.publicUrl && (
                  <a
                    href={material.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                  >
                    Abrir imagem
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingMaterial(material);
                    setForm(materialToForm(material));
                    setSelectedFile(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(material)}
                  className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]"
                >
                  {material.isActive ? "Desativar" : "Reativar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
