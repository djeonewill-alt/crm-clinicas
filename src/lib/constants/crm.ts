import type { ModuleId } from "@/types/lead";

export const FUNNELS = [
  { id: "prospeccao", label: "Prospecção", color: "#fb923c", short: "Prosp" },
  { id: "qualificacao", label: "Qualificação", color: "#60a5fa", short: "Qualif" },
  { id: "retorno", label: "Retorno", color: "#c084fc", short: "Retorno" },
  { id: "clientes", label: "Clientes", color: "#4ade80", short: "Clientes" },
] as const;

export const MODULES: Array<{
  id: ModuleId;
  label: string;
  icon: string;
  desc: string;
  href: string;
}> = [
  {
    id: "comercial",
    label: "Comercial",
    icon: "💼",
    desc: "CRM e vendas",
    href: "/comercial/trabalho",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: "💰",
    desc: "Controle financeiro",
    href: "/financeiro",
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: "⚙️",
    desc: "Cadastros e configurações",
    href: "/configuracoes",
  },
];

export const COMERCIAL_TABS = [
  { label: "Trabalho", href: "/comercial/trabalho" },
  { label: "Prioridades", href: "/comercial/prioridades" },
  { label: "Funis", href: "/comercial/funis" },
  { label: "Relatórios", href: "/comercial/relatorios" },
  { label: "Arquivados", href: "/comercial/arquivados" },
  { label: "Respostas", href: "/comercial/respostas" },
  { label: "Materiais", href: "/comercial/materiais" },
  { label: "Contextos", href: "/comercial/contextos" },
];

export const TIPOS_TENTATIVA = {
  mensagem: { id: "mensagem", label: "Mensagem", icon: "💬", temScript: true },
  ligacao: { id: "ligacao", label: "Ligação", icon: "📞", temScript: false },
  email: { id: "email", label: "Email", icon: "📧", temScript: true },
  instagram: { id: "instagram", label: "Instagram", icon: "📱", temScript: true },
  facebook: { id: "facebook", label: "Facebook", icon: "👥", temScript: true },
  linkedin: { id: "linkedin", label: "LinkedIn", icon: "💼", temScript: true },
} as const;

export const DIAS_PROSP = [
  {
    id: "d1",
    label: "dia 1",
    icons: ["💬", "📞"],
    tentativas: [{ tipo: "mensagem" }, { tipo: "ligacao" }],
  },
  {
    id: "d2",
    label: "dia 2",
    icons: ["💬"],
    tentativas: [{ tipo: "mensagem" }],
  },
  {
    id: "d3",
    label: "dia 3",
    icons: ["📞"],
    tentativas: [{ tipo: "ligacao" }],
  },
  {
    id: "d4",
    label: "dia 4",
    icons: ["💬"],
    tentativas: [{ tipo: "mensagem" }],
  },
  {
    id: "d5",
    label: "dia 5",
    icons: ["📞", "💬"],
    tentativas: [{ tipo: "ligacao" }, { tipo: "mensagem" }],
  },
] as const;

export const DIAS_QUALIF = [
  {
    id: "q1",
    label: "dia 1",
    icons: ["💬", "📞"],
    tentativas: [{ tipo: "mensagem" }, { tipo: "ligacao" }],
  },
  {
    id: "q2",
    label: "dia 2",
    icons: ["💬"],
    tentativas: [{ tipo: "mensagem" }],
  },
  {
    id: "q3",
    label: "dia 3",
    icons: ["📞"],
    tentativas: [{ tipo: "ligacao" }],
  },
  {
    id: "q4",
    label: "dia 4",
    icons: ["💬"],
    tentativas: [{ tipo: "mensagem" }],
  },
  {
    id: "q5",
    label: "dia 5",
    icons: ["📞", "💬"],
    tentativas: [{ tipo: "ligacao" }, { tipo: "mensagem" }],
  },
] as const;

export const DIAS_RETORNO = [
  {
    id: "r1",
    label: "dia 1",
    icons: ["💬", "📞"],
    tentativas: [{ tipo: "mensagem" }, { tipo: "ligacao" }],
  },
  {
    id: "r2",
    label: "dia 2",
    icons: ["💬"],
    tentativas: [{ tipo: "mensagem" }],
  },
  {
    id: "r3",
    label: "dia 3",
    icons: ["📞", "💬"],
    tentativas: [{ tipo: "ligacao" }, { tipo: "mensagem" }],
  },
] as const;

export const RESULTADOS = {
  mensagem: [
    { id: "respondeu", label: "Respondeu", icon: "✅" },
    { id: "enviada", label: "Enviada", icon: "📤" },
    { id: "nao-entregue", label: "Não entregue", icon: "❌" },
  ],
  ligacao: [
    { id: "respondeu", label: "Atendeu", icon: "✅" },
    { id: "nao-atendeu", label: "Não atendeu", icon: "📵" },
    { id: "caiu", label: "Caiu", icon: "📞" },
    { id: "rejeitou", label: "Rejeitou", icon: "🚫" },
    { id: "ocupado", label: "Ocupado", icon: "💼" },
  ],
  email: [
    { id: "respondeu", label: "Respondeu", icon: "✅" },
    { id: "aberto", label: "Aberto", icon: "👁️" },
    { id: "enviado", label: "Enviado", icon: "📤" },
    { id: "rejeitado", label: "Rejeitado", icon: "❌" },
  ],
  instagram: [
    { id: "respondeu", label: "Respondeu", icon: "✅" },
    { id: "visualizado", label: "Visualizado", icon: "👁️" },
    { id: "enviado", label: "Enviado", icon: "📤" },
    { id: "nao-entregue", label: "Não entregue", icon: "❌" },
  ],
  facebook: [
    { id: "respondeu", label: "Respondeu", icon: "✅" },
    { id: "visualizado", label: "Visualizado", icon: "👁️" },
    { id: "enviado", label: "Enviado", icon: "📤" },
    { id: "nao-entregue", label: "Não entregue", icon: "❌" },
  ],
  linkedin: [
    { id: "respondeu", label: "Respondeu", icon: "✅" },
    { id: "visualizado", label: "Visualizado", icon: "👁️" },
    { id: "enviado", label: "Enviado", icon: "📤" },
    { id: "nao-entregue", label: "Não entregue", icon: "❌" },
  ],
} as const;
