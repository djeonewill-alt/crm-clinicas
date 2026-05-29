import { TodayPrioritiesCard } from "@/components/comercial/TodayPrioritiesCard";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { getLeadsByEmpresa } from "@/lib/services/leads";

export default async function ComercialPrioridadesPage() {
  const context = await getDashboardContext();

  if (!context?.empresaAtual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">
          Nenhuma empresa atual foi encontrada para carregar as prioridades.
        </div>
      </div>
    );
  }

  const leads = await getLeadsByEmpresa(context.empresaAtual.id);

  return (
    <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Comercial
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">
          Prioridades
        </h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Veja quais leads precisam de ação hoje.
        </p>
      </div>

      <TodayPrioritiesCard leads={leads} leadHref="/comercial/trabalho" />
    </main>
  );
}
