import { createClient } from "@/lib/supabase/client";
import { createTentativasForDay } from "@/lib/services/queue";
import type { Lead, Tentativa } from "@/types/lead";

function toIsoFromNumber(value?: number | null) {
  return value ? new Date(value).toISOString() : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (!value) return null;
  const date = new Date(String(value));
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id ?? ""),
    nome: String(row.nome ?? ""),
    tel: String(row.tel ?? ""),
    funnel: String(row.funnel ?? "prospeccao") as Lead["funnel"],
    diaProsp: String(row.dia_prosp ?? "d1"),
    esp: String(row.esp ?? ""),
    campanha: String(row.campanha ?? ""),
    commercialContextId: row.commercial_context_id
      ? String(row.commercial_context_id)
      : null,
    valor: Number(row.valor ?? 0),
    fechado: row.fechado === true,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    retornoData: row.retorno_data ? String(row.retorno_data) : null,
    tentativas: Array.isArray(row.tentativas)
      ? (row.tentativas as Tentativa[])
      : [],
    dataEntrada: row.data_entrada
      ? String(row.data_entrada)
      : row.col_at
        ? String(row.col_at)
        : null,
    colAt: toNumberOrNull(row.col_at) ?? Date.now(),
    respondeuAt: toNumberOrNull(row.respondeu_at),
    prospectadoEm: toNumberOrNull(row.prospectado_em),
    qualificadoEm: toNumberOrNull(row.qualificado_em),
    fechadoEm: toNumberOrNull(row.fechado_em),
  };
}

export async function updateLeadCommercialFields(input: {
  empresaId: string | number;
  lead: Lead;
}) {
  const supabase = createClient();
  const { empresaId, lead } = input;

  const { error } = await supabase
    .from("leads")
    .update({
      nome: lead.nome?.trim() || "",
      tel: lead.tel?.trim() || "",
      esp: lead.esp?.trim() || "",
      campanha: lead.campanha?.trim() || "",
      funnel: lead.funnel || "prospeccao",
      dia_prosp: lead.diaProsp || "d1",
      tentativas: lead.tentativas ?? [],
      fechado: lead.fechado ?? false,
      retorno_data: lead.retornoData || null,
      valor: lead.valor ?? 0,
      col_at: lead.colAt
        ? new Date(lead.colAt).toISOString()
        : new Date().toISOString(),
      respondeu_at: toIsoFromNumber(lead.respondeuAt),
      prospectado_em: toIsoFromNumber(lead.prospectadoEm),
      qualificado_em: toIsoFromNumber(lead.qualificadoEm),
      fechado_em: toIsoFromNumber(lead.fechadoEm),
    })
    .eq("id", lead.id)
    .eq("empresa_id", empresaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateLeadCommercialContext(input: {
  empresaId: string | number;
  leadId: string | number;
  commercialContextId: string | null;
}): Promise<Lead> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("leads")
    .update({
      commercial_context_id: input.commercialContextId,
      col_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToLead(data);
}

export async function archiveLeadById(input: {
  empresaId: string | number;
  leadId: string | number;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("empresa_id", input.empresaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function restoreLeadById(input: {
  empresaId: string | number;
  leadId: string | number;
}): Promise<Lead> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("leads")
    .update({
      archived_at: null,
      col_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("empresa_id", input.empresaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToLead(data);
}

export async function moveLeadToFunnel(input: {
  empresaId: string | number;
  leadId: string | number;
  targetFunnel: "prospeccao" | "qualificacao";
  currentLead?: Lead;
}): Promise<Partial<Lead>> {
  const supabase = createClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const diaProsp = input.targetFunnel === "qualificacao" ? "q1" : "d1";
  const tentativas = createTentativasForDay(input.targetFunnel, diaProsp);
  const qualificadoEm =
    input.targetFunnel === "qualificacao"
      ? input.currentLead?.qualificadoEm ?? now
      : input.currentLead?.qualificadoEm ?? null;

  const payload: Record<string, unknown> = {
    funnel: input.targetFunnel,
    dia_prosp: diaProsp,
    tentativas,
    retorno_data: null,
    fechado: false,
    col_at: nowIso,
  };

  if (input.targetFunnel === "qualificacao") {
    payload.qualificado_em = toIsoFromNumber(qualificadoEm);
  }

  const { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", input.leadId)
    .eq("empresa_id", input.empresaId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    funnel: input.targetFunnel,
    diaProsp,
    tentativas,
    retornoData: null,
    fechado: false,
    colAt: now,
    qualificadoEm,
  };
}

export async function createLeadForEmpresa(input: {
  empresaId: string | number;
  nome: string;
  tel: string;
  esp?: string;
  campanha?: string;
  commercialContextId?: string | null;
  tentativas: Tentativa[];
}) {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      empresa_id: input.empresaId,
      nome: input.nome.trim(),
      tel: input.tel.trim(),
      esp: input.esp?.trim() || "",
      campanha: input.campanha?.trim() || "",
      commercial_context_id: input.commercialContextId || null,
      funnel: "prospeccao",
      dia_prosp: "d1",
      tentativas: input.tentativas,
      fechado: false,
      valor: 0,
      col_at: now,
      data_entrada: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToLead(data);
}

export async function importLeadsForEmpresa(input: {
  empresaId: string | number;
  leads: Array<{
    nome: string;
    tel: string;
    esp?: string;
    campanha?: string;
  }>;
}): Promise<Lead[]> {
  if (input.leads.length === 0) return [];

  if (input.leads.length > 500) {
    throw new Error("Importação limitada a 500 leads por vez.");
  }

  const supabase = createClient();
  const now = new Date().toISOString();
  const tentativas = createTentativasForDay("prospeccao", "d1");
  const payload = input.leads.map((lead) => ({
    empresa_id: input.empresaId,
    nome: lead.nome.trim(),
    tel: lead.tel.trim(),
    esp: lead.esp?.trim() || "",
    campanha: lead.campanha?.trim() || "",
    funnel: "prospeccao",
    dia_prosp: "d1",
    tentativas,
    fechado: false,
    valor: 0,
    col_at: now,
    data_entrada: now,
  }));

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToLead);
}
