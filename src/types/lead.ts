export type FunnelId =
  | "prospeccao"
  | "qualificacao"
  | "retorno"
  | "clientes"
  | "remarketing"
  | "desqualificado";

export type ModuleId = "comercial" | "financeiro" | "configuracoes";

export type TipoTentativa =
  | "mensagem"
  | "ligacao"
  | "email"
  | "instagram"
  | "facebook"
  | "linkedin";

export type Tentativa = {
  tipo?: TipoTentativa | string;
  resultado?: string;
  acao?: string;
  hora?: string;
  obs?: string;
  feitoEm?: string | null;
};

export type Lead = {
  id: number | string;
  nome: string;
  tel: string;
  funnel: FunnelId;
  diaProsp: string;
  esp?: string;
  campanha?: string;
  valor?: number;
  fechado?: boolean;
  archivedAt?: string | null;
  retornoData?: string | null;
  tentativas?: Tentativa[];
  dataEntrada?: string | null;
  colAt?: number;
  respondeuAt?: number | null;
  prospectadoEm?: number | null;
  qualificadoEm?: number | null;
  fechadoEm?: number | null;
};
