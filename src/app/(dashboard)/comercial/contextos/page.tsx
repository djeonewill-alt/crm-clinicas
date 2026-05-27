import { ComercialContextosClient } from "@/components/comercial/ComercialContextosClient";
import { listCommercialContexts } from "@/lib/services/commercial-contexts";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import {
  listCommercialResponseCategories,
  listCommercialResponses,
} from "@/lib/services/commercial-responses";

export default async function ComercialContextosPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar os contextos.
        </div>
      </div>
    );
  }

  const [contexts, commercialResponseCategories, commercialResponses] =
    await Promise.all([
      listCommercialContexts(context.empresaAtual.id),
      listCommercialResponseCategories(context.empresaAtual.id),
      listCommercialResponses(context.empresaAtual.id),
    ]);

  return (
    <ComercialContextosClient
      empresaId={context.empresaAtual.id}
      empresaNome={context.empresaAtual.nome}
      contexts={contexts}
      commercialResponseCategories={commercialResponseCategories}
      commercialResponses={commercialResponses}
    />
  );
}
