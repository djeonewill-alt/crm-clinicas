import { ComercialRelatoriosClient } from "@/components/comercial/ComercialRelatoriosClient";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { getLeadsByEmpresa } from "@/lib/services/leads";

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

  return (
    <ComercialRelatoriosClient
      leads={leads}
      empresaNome={context.empresaAtual.nome}
    />
  );
}
