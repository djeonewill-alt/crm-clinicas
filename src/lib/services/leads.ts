import type { Lead, FunnelId, Tentativa } from "@/types/lead";
import { createClient } from "@/lib/supabase/server";

type LeadRow = Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (!value) return null;
  const date = new Date(String(value));
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toTentativas(value: unknown): Tentativa[] {
  return Array.isArray(value) ? (value as Tentativa[]) : [];
}

export function rowToLead(row: LeadRow): Lead {
  return {
    id: String(row.id ?? ""),
    nome: String(row.nome ?? ""),
    tel: String(row.tel ?? ""),
    funnel: String(row.funnel ?? "prospeccao") as FunnelId,
    diaProsp: String(row.dia_prosp ?? "d1"),
    esp: String(row.esp ?? ""),
    campanha: String(row.campanha ?? ""),
    valor: Number(row.valor ?? 0),
    fechado: toBoolean(row.fechado),
    retornoData: row.retorno_data ? String(row.retorno_data) : null,
    tentativas: toTentativas(row.tentativas),
    dataEntrada: row.data_entrada ? String(row.data_entrada) : row.col_at ? String(row.col_at) : null,
    colAt: toNumberOrNull(row.col_at) ?? Date.now(),
    respondeuAt: toNumberOrNull(row.respondeu_at),
    prospectadoEm: toNumberOrNull(row.prospectado_em),
    qualificadoEm: toNumberOrNull(row.qualificado_em),
    fechadoEm: toNumberOrNull(row.fechado_em),
  };
}

export async function getLeadsByEmpresa(empresaId: string | number): Promise<Lead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("col_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar leads:", error.message);
    return [];
  }

  return (data ?? []).map(rowToLead);
}
