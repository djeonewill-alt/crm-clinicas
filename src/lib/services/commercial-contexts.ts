import { createClient } from "@/lib/supabase/server";
import type { CommercialContext } from "@/types/commercial-contexts";

type CommercialContextRow = Record<string, unknown>;

function rowToCommercialContext(row: CommercialContextRow): CommercialContext {
  return {
    id: String(row.id ?? ""),
    empresaId: String(row.empresa_id ?? ""),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: row.description ? String(row.description) : null,
    audienceLabel: row.audience_label ? String(row.audience_label) : null,
    campaignLabel: row.campaign_label ? String(row.campaign_label) : null,
    priceNotes: row.price_notes ? String(row.price_notes) : null,
    paymentNotes: row.payment_notes ? String(row.payment_notes) : null,
    scheduleNotes: row.schedule_notes ? String(row.schedule_notes) : null,
    unitsNotes: row.units_notes ? String(row.units_notes) : null,
    safetyNotes: row.safety_notes ? String(row.safety_notes) : null,
    internalNotes: row.internal_notes ? String(row.internal_notes) : null,
    isActive: row.is_active === true,
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listCommercialContexts(
  empresaId: string | number
): Promise<CommercialContext[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_contexts")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar contextos comerciais:", error.message);
    return [];
  }

  return (data ?? []).map(rowToCommercialContext);
}

export async function listActiveCommercialContexts(
  empresaId: string | number
): Promise<CommercialContext[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_contexts")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar contextos comerciais ativos:", error.message);
    return [];
  }

  return (data ?? []).map(rowToCommercialContext);
}

export async function getCommercialContextById(input: {
  empresaId: string | number;
  contextId: string | number;
}): Promise<CommercialContext | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commercial_contexts")
    .select("*")
    .eq("empresa_id", input.empresaId)
    .eq("id", input.contextId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar contexto comercial:", error.message);
    return null;
  }

  return data ? rowToCommercialContext(data) : null;
}
