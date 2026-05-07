import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/services/dashboard-context";

export default async function DiagnosticoPage() {
  const context = await getDashboardContext();

  if (!context) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Diagnóstico
        </p>

        <h1 className="text-xl font-semibold">Contexto do usuário</h1>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Usuário Auth
            </p>
            <p className="text-sm text-[var(--text2)]">Email</p>
            <p className="font-mono text-sm text-[var(--text)]">
              {context.user.email}
            </p>
            <p className="mt-3 text-sm text-[var(--text2)]">ID</p>
            <p className="break-all font-mono text-xs text-[var(--text3)]">
              {context.user.id}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Perfil
            </p>
            {context.perfil ? (
              <>
                <p className="text-sm text-[var(--text2)]">Nome</p>
                <p className="text-sm text-[var(--text)]">
                  {context.perfil.nome || "sem nome"}
                </p>
                <p className="mt-3 text-sm text-[var(--text2)]">Perfil</p>
                <p className="text-sm text-[var(--text)]">
                  {context.perfil.perfil || "sem perfil"}
                </p>
                <p className="mt-3 text-sm text-[var(--text2)]">Empresa ID</p>
                <p className="font-mono text-sm text-[var(--text)]">
                  {String(context.perfil.empresa_id ?? "sem empresa_id")}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-300">
                Nenhum perfil encontrado na tabela perfis.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4 md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
              Empresas visíveis
            </p>

            {context.empresas.length > 0 ? (
              <div className="space-y-2">
                {context.empresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2"
                  >
                    <span>{empresa.nome}</span>
                    <span className="font-mono text-xs text-[var(--text3)]">
                      ID {empresa.id}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-300">
                Nenhuma empresa retornou pela consulta.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          ✅ Login, sessão, perfil e empresas foram consultados no servidor.
        </div>
      </div>
    </div>
  );
}
