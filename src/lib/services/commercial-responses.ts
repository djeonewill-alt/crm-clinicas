import { createClient } from "@/lib/supabase/server";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";

type CommercialResponseCategoryRow = Record<string, unknown>;
type CommercialResponseRow = Record<string, unknown>;

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
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
    contextId: row.context_id ? String(row.context_id) : null,
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

export async function listCommercialResponseCategories(
  empresaId: string | number
): Promise<CommercialResponseCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_response_categories")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar categorias comerciais:", error.message);
    return [];
  }

  return (data ?? []).map(rowToCommercialResponseCategory);
}

export async function listCommercialResponses(
  empresaId: string | number
): Promise<CommercialResponse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_responses")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar respostas comerciais:", error.message);
    return [];
  }

  return (data ?? []).map(rowToCommercialResponse);
}

export async function listActiveCommercialResponses(
  empresaId: string | number
): Promise<CommercialResponse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_responses")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar respostas comerciais:", error.message);
    return [];
  }

  return (data ?? []).map(rowToCommercialResponse);
}
