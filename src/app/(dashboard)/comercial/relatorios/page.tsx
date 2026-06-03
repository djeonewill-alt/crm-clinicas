import { ComercialRelatoriosClient } from "@/components/comercial/ComercialRelatoriosClient";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { getLeadsByEmpresa } from "@/lib/services/leads";
import { createClient } from "@/lib/supabase/server";
import type { LeadHistoryItem, LeadHistoryType } from "@/types/lead-history";

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

export default async function ComercialRelatoriosPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar os relatórios.
        </div>
      </div>
    );
  }

  const leads = await getLeadsByEmpresa(context.empresaAtual.id);
  const supabase = await createClient();
  const { data: historyRows } = await supabase
    .from("lead_history")
    .select("*")
    .eq("empresa_id", context.empresaAtual.id)
    .order("created_at", { ascending: false });

  return (
    <ComercialRelatoriosClient
      leads={leads}
      history={(historyRows ?? []).map(rowToLeadHistoryItem)}
      empresaNome={context.empresaAtual.nome}
    />
  );
}
