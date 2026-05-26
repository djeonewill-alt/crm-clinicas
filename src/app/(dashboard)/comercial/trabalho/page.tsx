import { ComercialTrabalhoClient } from "@/components/comercial/ComercialTrabalhoClient";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import {
  listActiveCommercialResponses,
  listCommercialResponseCategories,
} from "@/lib/services/commercial-responses";
import { getLeadsByEmpresa } from "@/lib/services/leads";

export default async function ComercialTrabalhoPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar os leads.
        </div>
      </div>
    );
  }

  const [leads, commercialResponseCategories, commercialResponses] =
    await Promise.all([
      getLeadsByEmpresa(context.empresaAtual.id),
      listCommercialResponseCategories(context.empresaAtual.id),
      listActiveCommercialResponses(context.empresaAtual.id),
    ]);

  return (
    <ComercialTrabalhoClient
      initialLeads={leads}
      empresaId={context.empresaAtual.id}
      empresaNome={context.empresaAtual.nome}
      commercialResponseCategories={commercialResponseCategories}
      commercialResponses={commercialResponses}
    />
  );
}
