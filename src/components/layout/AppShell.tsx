"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { COMERCIAL_TABS, MODULES } from "@/lib/constants/crm";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { DashboardContext } from "@/types/profile";

export function AppShell({
  children,
  context,
}: {
  children: React.ReactNode;
  context: DashboardContext;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const currentModule =
    pathname.startsWith("/financeiro")
      ? "Financeiro"
      : pathname.startsWith("/configuracoes")
        ? "Configurações"
        : pathname.startsWith("/diagnostico")
          ? "Diagnóstico"
          : "Comercial";

  const showComercialTabs = pathname.startsWith("/comercial");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nomeUsuario =
    context.perfil?.nome || context.user.email || "Usuário";

  const perfilUsuario = context.perfil?.perfil || "sem perfil";
  const empresaNome = context.empresaAtual?.nome || "sem empresa";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg2)] px-4">
        <div className="font-semibold text-[var(--accent)]">✦ CRM Estética</div>

        <div className="hidden rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1.5 text-xs text-[var(--text2)] lg:block">
          🏥 {empresaNome}
        </div>

        <nav className="ml-2 flex items-center gap-2">
          {MODULES.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition",
                pathname.startsWith(`/${module.href.split("/")[1]}`)
                  ? "border-[var(--accent)] bg-[var(--bg4)] text-[var(--accent)]"
                  : "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
              )}
            >
              <span className="mr-1">{module.icon}</span>
              {module.label}
            </Link>
          ))}

          <Link
            href="/diagnostico"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition",
              pathname.startsWith("/diagnostico")
                ? "border-[var(--accent)] bg-[var(--bg4)] text-[var(--accent)]"
                : "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]"
            )}
          >
            🧪 Diagnóstico
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1 text-xs text-[var(--text2)] xl:inline-flex">
            {nomeUsuario} · {perfilUsuario}
          </span>

          <span className="rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-3 py-1 text-xs text-[var(--text2)]">
            Módulo: {currentModule}
          </span>

          <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)]">
            + Novo lead
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[var(--border2)] bg-transparent px-3 py-2 text-xs text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
          >
            Sair
          </button>
        </div>
      </header>

      {showComercialTabs && (
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg2)] px-4">
          {COMERCIAL_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs transition",
                pathname === tab.href
                  ? "bg-[var(--bg4)] text-[var(--accent)]"
                  : "text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      <main className="flex min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
