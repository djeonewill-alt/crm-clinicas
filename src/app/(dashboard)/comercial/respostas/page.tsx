import { ComercialRespostasClient } from "@/components/comercial/ComercialRespostasClient";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import {
  listCommercialResponseCategories,
  listCommercialResponses,
} from "@/lib/services/commercial-responses";

export default async function ComercialRespostasPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar as respostas.
        </div>
      </div>
    );
  }

  const [categories, responses] = await Promise.all([
    listCommercialResponseCategories(context.empresaAtual.id),
    listCommercialResponses(context.empresaAtual.id),
  ]);

  return (
    <ComercialRespostasClient
      empresaId={context.empresaAtual.id}
      empresaNome={context.empresaAtual.nome}
      categories={categories}
      responses={responses}
    />
  );
}
