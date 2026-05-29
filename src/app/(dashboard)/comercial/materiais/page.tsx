import { CommercialMaterialsClient } from "@/components/comercial/CommercialMaterialsClient";
import { getDashboardContext } from "@/lib/services/dashboard-context";

export default async function ComercialMateriaisPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar os materiais.
        </div>
      </div>
    );
  }

  return (
    <CommercialMaterialsClient
      empresaId={context.empresaAtual.id}
      empresaNome={context.empresaAtual.nome}
    />
  );
}
