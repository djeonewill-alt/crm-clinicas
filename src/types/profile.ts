export type PerfilTipo = "superadmin" | "gestor" | "vendedor";

export type PerfilUsuario = {
  id: string;
  email: string;
  nome?: string | null;
  perfil?: PerfilTipo | string | null;
  empresa_id?: number | string | null;
  ativo?: boolean | null;
};

export type Empresa = {
  id: number | string;
  nome: string;
};

export type DashboardContext = {
  user: {
    id: string;
    email: string;
  };
  perfil: PerfilUsuario | null;
  empresas: Empresa[];
  empresaAtual: Empresa | null;
};
