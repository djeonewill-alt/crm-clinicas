import { createClient } from "@/lib/supabase/client";
import type {
  CommercialResponse,
  CommercialResponseCategory,
  CommercialResponseCategoryFormInput,
  CommercialResponseFormInput,
} from "@/types/commercial-responses";

type CommercialResponseCategoryRow = Record<string, unknown>;
type CommercialResponseRow = Record<string, unknown>;

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function normalizeStringArray(value?: string[]) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function rowToCommercialResponseCategory(
  row: CommercialResponseCategoryRow
): CommercialResponseCategory {
  return {
    id: String(row.id ?? ""),
    empresaId: String(row.empresa_id ?? ""),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: row.description ? String(row.description) : null,
    isActive: row.is_active === true,
    orderIndex: Number(row.order_index ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function rowToCommercialResponse(row: CommercialResponseRow): CommercialResponse {
  return {
    id: String(row.id ?? ""),
    empresaId: String(row.empresa_id ?? ""),
    categoryId: row.category_id ? String(row.category_id) : null,
    title: String(row.title ?? ""),
    answerText: String(row.answer_text ?? ""),
    exampleQuestions: toStringArray(row.example_questions),
    tags: toStringArray(row.tags),
    isActive: row.is_active === true,
    canAutoReply: row.can_auto_reply === true,
    requiresHuman: row.requires_human === true,
    internalNotes: row.internal_notes ? String(row.internal_notes) : null,
    priority: Number(row.priority ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCategoryPayload(data: CommercialResponseCategoryFormInput) {
  const name = data.name.trim();

  if (!name) {
    throw new Error("Nome da categoria é obrigatório.");
  }

  return {
    name,
    slug: data.slug?.trim() || slugify(name),
    description: data.description?.trim() || null,
    is_active: data.isActive ?? true,
    order_index: data.orderIndex ?? 0,
    updated_at: new Date().toISOString(),
  };
}

function buildResponsePayload(data: CommercialResponseFormInput) {
  const title = data.title.trim();
  const answerText = data.answerText.trim();

  if (!title) {
    throw new Error("Título da resposta é obrigatório.");
  }

  if (!answerText) {
    throw new Error("Texto da resposta é obrigatório.");
  }

  return {
    category_id: data.categoryId || null,
    title,
    answer_text: answerText,
    example_questions: normalizeStringArray(data.exampleQuestions),
    tags: normalizeStringArray(data.tags),
    is_active: data.isActive ?? true,
    can_auto_reply: data.canAutoReply ?? false,
    requires_human: data.requiresHuman ?? true,
    internal_notes: data.internalNotes?.trim() || null,
    priority: data.priority ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function createCommercialResponseCategory(input: {
  empresaId: string | number;
  data: CommercialResponseCategoryFormInput;
}): Promise<CommercialResponseCategory> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_response_categories")
    .insert({
      empresa_id: input.empresaId,
      ...buildCategoryPayload(input.data),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialResponseCategory(data);
}

export async function updateCommercialResponseCategory(input: {
  empresaId: string | number;
  categoryId: string;
  data: CommercialResponseCategoryFormInput;
}): Promise<CommercialResponseCategory> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_response_categories")
    .update(buildCategoryPayload(input.data))
    .eq("id", input.categoryId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialResponseCategory(data);
}

export async function deactivateCommercialResponseCategory(input: {
  empresaId: string | number;
  categoryId: string;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("commercial_response_categories")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.categoryId)
    .eq("empresa_id", input.empresaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createCommercialResponse(input: {
  empresaId: string | number;
  data: CommercialResponseFormInput;
}): Promise<CommercialResponse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_responses")
    .insert({
      empresa_id: input.empresaId,
      ...buildResponsePayload(input.data),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialResponse(data);
}

export async function updateCommercialResponse(input: {
  empresaId: string | number;
  responseId: string;
  data: CommercialResponseFormInput;
}): Promise<CommercialResponse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_responses")
    .update(buildResponsePayload(input.data))
    .eq("id", input.responseId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialResponse(data);
}

export async function deactivateCommercialResponse(input: {
  empresaId: string | number;
  responseId: string;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("commercial_responses")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.responseId)
    .eq("empresa_id", input.empresaId);

  if (error) {
    throw new Error(error.message);
  }
}
