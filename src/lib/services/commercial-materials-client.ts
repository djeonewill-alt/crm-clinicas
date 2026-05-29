import { createClient } from "@/lib/supabase/client";

export const COMMERCIAL_MATERIAL_BUCKET = "commercial-materials";

export type CommercialMaterialCategory =
  | "before_after"
  | "address"
  | "payment_pix"
  | "schedule"
  | "certification"
  | "document"
  | "other";

export type CommercialMaterial = {
  id: string;
  empresaId: string;
  title: string;
  description: string | null;
  category: CommercialMaterialCategory;
  materialType: "image";
  region: string | null;
  skinTone: string | null;
  sessionsCount: number | null;
  audience: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  storageBucket: string | null;
  storagePath: string | null;
  publicUrl: string | null;
  caption: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialMaterialFormInput = {
  title: string;
  description?: string;
  category: CommercialMaterialCategory;
  region?: string;
  skinTone?: string;
  sessionsCount?: number | null;
  audience?: string;
  publicUrl?: string;
  caption?: string;
  tags?: string[];
  isActive?: boolean;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  storageBucket?: string | null;
  storagePath?: string | null;
};

export type CommercialMaterialFilters = {
  category?: string;
  region?: string;
  skinTone?: string;
  audience?: string;
  activeStatus?: "active" | "inactive" | "all";
};

type CommercialMaterialRow = Record<string, unknown>;

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function rowToCommercialMaterial(row: CommercialMaterialRow): CommercialMaterial {
  return {
    id: String(row.id ?? ""),
    empresaId: String(row.empresa_id ?? ""),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    category: String(row.category ?? "other") as CommercialMaterialCategory,
    materialType: "image",
    region: row.region ? String(row.region) : null,
    skinTone: row.skin_tone ? String(row.skin_tone) : null,
    sessionsCount:
      row.sessions_count === null || row.sessions_count === undefined
        ? null
        : Number(row.sessions_count),
    audience: row.audience ? String(row.audience) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    fileMimeType: row.file_mime_type ? String(row.file_mime_type) : null,
    fileSize:
      row.file_size === null || row.file_size === undefined
        ? null
        : Number(row.file_size),
    storageBucket: row.storage_bucket ? String(row.storage_bucket) : null,
    storagePath: row.storage_path ? String(row.storage_path) : null,
    publicUrl: row.public_url ? String(row.public_url) : null,
    caption: row.caption ? String(row.caption) : null,
    tags: toStringArray(row.tags),
    isActive: row.is_active === true,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function normalizeTags(tags?: string[]) {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
}

function buildPayload(data: CommercialMaterialFormInput) {
  const title = data.title.trim();

  if (!title) {
    throw new Error("Titulo do material e obrigatorio.");
  }

  if (!data.category) {
    throw new Error("Categoria do material e obrigatoria.");
  }

  return {
    title,
    description: data.description?.trim() || null,
    category: data.category,
    material_type: "image",
    region: data.region || null,
    skin_tone: data.skinTone || null,
    sessions_count:
      data.sessionsCount === null || data.sessionsCount === undefined
        ? null
        : data.sessionsCount,
    audience: data.audience || null,
    file_name: data.fileName || null,
    file_mime_type: data.fileMimeType || null,
    file_size: data.fileSize ?? null,
    storage_bucket: data.storageBucket || null,
    storage_path: data.storagePath || null,
    public_url: data.publicUrl?.trim() || null,
    caption: data.caption?.trim() || null,
    tags: normalizeTags(data.tags),
    is_active: data.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("commercial_materials") === true
  );
}

function throwFriendlyError(error: { code?: string; message?: string }) {
  if (isMissingTableError(error)) {
    throw new Error(
      "A tabela de materiais ainda nao foi criada. Rode o SQL da BASE 15W no Supabase."
    );
  }

  throw new Error(error.message || "Erro ao acessar materiais comerciais.");
}

export async function listCommercialMaterials(
  empresaId: string | number,
  filters: CommercialMaterialFilters = {}
): Promise<CommercialMaterial[]> {
  const supabase = createClient();
  let query = supabase
    .from("commercial_materials")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.region) query = query.eq("region", filters.region);
  if (filters.skinTone) query = query.eq("skin_tone", filters.skinTone);
  if (filters.audience) query = query.eq("audience", filters.audience);
  if (filters.activeStatus === "active") query = query.eq("is_active", true);
  if (filters.activeStatus === "inactive") query = query.eq("is_active", false);

  const { data, error } = await query;

  if (error) throwFriendlyError(error);

  return (data ?? []).map(rowToCommercialMaterial);
}

export async function createCommercialMaterial(input: {
  empresaId: string | number;
  data: CommercialMaterialFormInput;
}): Promise<CommercialMaterial> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_materials")
    .insert({
      empresa_id: input.empresaId,
      ...buildPayload(input.data),
    })
    .select("*")
    .single();

  if (error) throwFriendlyError(error);

  return rowToCommercialMaterial(data);
}

export async function updateCommercialMaterial(input: {
  empresaId: string | number;
  materialId: string;
  data: CommercialMaterialFormInput;
}): Promise<CommercialMaterial> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_materials")
    .update(buildPayload(input.data))
    .eq("id", input.materialId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) throwFriendlyError(error);

  return rowToCommercialMaterial(data);
}

export async function deleteOrDeactivateCommercialMaterial(input: {
  empresaId: string | number;
  materialId: string;
  isActive: boolean;
}): Promise<CommercialMaterial> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_materials")
    .update({
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.materialId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) throwFriendlyError(error);

  return rowToCommercialMaterial(data);
}

export async function uploadCommercialMaterialImage(
  file: File,
  empresaId: string | number
) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Use apenas imagens JPG, PNG ou WebP.");
  }

  if (file.size > maxSize) {
    throw new Error("Imagem muito grande. Limite: 10MB.");
  }

  const supabase = createClient();
  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const month = new Date().toISOString().slice(0, 7);
  const path = `${empresaId}/${month}/${Date.now()}-${safeName || "imagem"}`;

  const { error } = await supabase.storage
    .from(COMMERCIAL_MATERIAL_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      "Nao foi possivel enviar a imagem. Verifique se o bucket commercial-materials existe e se as permissoes de Storage foram configuradas."
    );
  }

  const { data } = supabase.storage
    .from(COMMERCIAL_MATERIAL_BUCKET)
    .getPublicUrl(path);

  return {
    fileName: file.name,
    fileMimeType: file.type,
    fileSize: file.size,
    storageBucket: COMMERCIAL_MATERIAL_BUCKET,
    storagePath: path,
    publicUrl: data.publicUrl,
  };
}
