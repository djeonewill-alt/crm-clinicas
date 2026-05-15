import { createClient } from "@/lib/supabase/client";
import type {
  CreateLeadHistoryEventInput,
  CreateLeadHistoryNoteInput,
  LeadHistoryItem,
  LeadHistoryType,
} from "@/types/lead-history";

function rowToLeadHistoryItem(row: Record<string, unknown>): LeadHistoryItem {
  return {
    id: String(row.id ?? ""),
    lead_id: String(row.lead_id ?? ""),
    empresa_id: String(row.empresa_id ?? ""),
    user_id: row.user_id ? String(row.user_id) : null,
    type: String(row.type ?? "note") as LeadHistoryType,
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
  };
}

export async function listLeadHistory(input: {
  leadId: string;
  empresaId: string;
}): Promise<LeadHistoryItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("lead_history")
    .select("*")
    .eq("lead_id", input.leadId)
    .eq("empresa_id", input.empresaId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToLeadHistoryItem);
}

export async function createLeadHistoryNote(
  input: CreateLeadHistoryNoteInput
): Promise<LeadHistoryItem> {
  return createLeadHistoryEvent({
    leadId: input.leadId,
    empresaId: input.empresaId,
    type: "note",
    title: "Observa\u00e7\u00e3o",
    description: input.description,
    metadata: {},
  });
}

export async function createLeadHistoryEvent(
  input: CreateLeadHistoryEventInput
): Promise<LeadHistoryItem> {
  const leadId = input.leadId.trim();
  const empresaId = input.empresaId.trim();
  const title = input.title.trim();
  const description = input.description?.trim() || null;

  if (!leadId) {
    throw new Error("Lead não encontrado para registrar histórico.");
  }

  if (!empresaId) {
    throw new Error("Empresa não encontrada para registrar histórico.");
  }

  if (!title) {
    throw new Error("Título do histórico é obrigatório.");
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("lead_history")
    .insert({
      lead_id: leadId,
      empresa_id: empresaId,
      type: input.type,
      title,
      description,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToLeadHistoryItem(data);
}
