import { createClient } from "@/lib/supabase/client";
import type {
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

export async function listLeadHistory(
  leadId: string
): Promise<LeadHistoryItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("lead_history")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToLeadHistoryItem);
}

export async function createLeadHistoryNote(
  input: CreateLeadHistoryNoteInput
): Promise<LeadHistoryItem> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("lead_history")
    .insert({
      lead_id: input.leadId,
      empresa_id: input.empresaId,
      type: "note",
      title: "Observação",
      description: input.description,
      metadata: {},
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToLeadHistoryItem(data);
}
