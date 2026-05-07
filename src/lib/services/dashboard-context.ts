import type { DashboardContext, Empresa, PerfilUsuario } from "@/types/profile";
import { createClient } from "@/lib/supabase/server";

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const userEmail = user.email ?? "";

  let perfil: PerfilUsuario | null = null;
  let empresas: Empresa[] = [];

  const { data: perfilData, error: perfilError } = await supabase
    .from("perfis")
    .select("id,email,nome,perfil,empresa_id,ativo")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfilError && perfilData) {
    perfil = {
      id: perfilData.id,
      email: perfilData.email ?? userEmail,
      nome: perfilData.nome,
      perfil: perfilData.perfil,
      empresa_id: perfilData.empresa_id,
      ativo: perfilData.ativo,
    };
  }

  const { data: empresasData, error: empresasError } = await supabase
    .from("empresas")
    .select("id,nome")
    .order("nome", { ascending: true });

  if (!empresasError && empresasData) {
    empresas = empresasData.map((empresa) => ({
      id: empresa.id,
      nome: empresa.nome,
    }));
  }

  const empresaAtual =
    empresas.find((empresa) => String(empresa.id) === String(perfil?.empresa_id)) ??
    empresas[0] ??
    null;

  return {
    user: {
      id: user.id,
      email: userEmail,
    },
    perfil,
    empresas,
    empresaAtual,
  };
}
