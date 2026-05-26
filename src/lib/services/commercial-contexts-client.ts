import { createClient } from "@/lib/supabase/client";
import type {
  CommercialContext,
  CommercialContextFormInput,
} from "@/types/commercial-contexts";

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

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCommercialContextPayload(data: CommercialContextFormInput) {
  const name = data.name.trim();

  if (!name) {
    throw new Error("Nome do contexto comercial e obrigatorio.");
  }

  const slug = data.slug?.trim() || slugify(name);

  if (!slug) {
    throw new Error("Slug do contexto comercial e obrigatorio.");
  }

  return {
    name,
    slug,
    description: data.description?.trim() || null,
    audience_label: data.audienceLabel?.trim() || null,
    campaign_label: data.campaignLabel?.trim() || null,
    price_notes: data.priceNotes?.trim() || null,
    payment_notes: data.paymentNotes?.trim() || null,
    schedule_notes: data.scheduleNotes?.trim() || null,
    units_notes: data.unitsNotes?.trim() || null,
    safety_notes: data.safetyNotes?.trim() || null,
    internal_notes: data.internalNotes?.trim() || null,
    is_active: data.isActive ?? true,
    starts_at: data.startsAt || null,
    ends_at: data.endsAt || null,
    updated_at: new Date().toISOString(),
  };
}

export async function createCommercialContext(input: {
  empresaId: string | number;
  data: CommercialContextFormInput;
}): Promise<CommercialContext> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_contexts")
    .insert({
      empresa_id: input.empresaId,
      ...buildCommercialContextPayload(input.data),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialContext(data);
}

export async function updateCommercialContext(input: {
  empresaId: string | number;
  contextId: string | number;
  data: CommercialContextFormInput;
}): Promise<CommercialContext> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_contexts")
    .update(buildCommercialContextPayload(input.data))
    .eq("id", input.contextId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialContext(data);
}

export async function deactivateCommercialContext(input: {
  empresaId: string | number;
  contextId: string | number;
}): Promise<CommercialContext> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commercial_contexts")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contextId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCommercialContext(data);
}
