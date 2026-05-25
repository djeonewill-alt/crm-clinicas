import { ComercialArquivadosClient } from "@/components/comercial/ComercialArquivadosClient";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { getArchivedLeadsByEmpresa } from "@/lib/services/leads";

export default async function ComercialArquivadosPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar os arquivados.
        </div>
      </div>
    );
  }

  const leads = await getArchivedLeadsByEmpresa(context.empresaAtual.id);

  return (
    <ComercialArquivadosClient
      leads={leads}
      empresaId={context.empresaAtual.id}
      empresaNome={context.empresaAtual.nome}
    />
  );
}
