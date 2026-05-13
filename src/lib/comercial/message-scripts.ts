import type { Lead } from "@/types/lead";

export type MessageScript = {
  id: string;
  title: string;
  category: string;
  description?: string;
  body: string;
  variables: string[];
};

export const messageScripts: MessageScript[] = [
  {
    id: "primeiro-contato",
    title: "Primeiro contato",
    category: "Primeiro contato",
    description: "Abordagem inicial para leads novos.",
    body: "Olá, {{nome}}! Tudo bem? Recebemos seu interesse em {{procedimento}} e estou passando para te ajudar com as informações. Posso te explicar como funciona?",
    variables: ["nome", "procedimento"],
  },
  {
    id: "sem-resposta",
    title: "Sem resposta",
    category: "Sem resposta",
    description: "Reforço leve depois de uma tentativa sem retorno.",
    body: "Oi, {{nome}}! Passando só para confirmar se você conseguiu ver minha mensagem sobre {{procedimento}}. Fico à disposição para te orientar.",
    variables: ["nome", "procedimento"],
  },
  {
    id: "retorno",
    title: "Retorno combinado",
    category: "Retorno",
    description: "Mensagem para retomar uma conversa já iniciada.",
    body: "Oi, {{nome}}! Como combinado, estou retornando para falarmos sobre {{procedimento}}. Você prefere que eu te envie as informações por aqui?",
    variables: ["nome", "procedimento"],
  },
  {
    id: "qualificacao",
    title: "Confirmar interesse",
    category: "Interesse/qualificação",
    description: "Ajuda a entender se o lead segue interessado.",
    body: "{{nome}}, para eu te orientar melhor sobre {{procedimento}}, você busca fazer isso para quando? Assim consigo te passar as próximas informações com mais precisão.",
    variables: ["nome", "procedimento"],
  },
  {
    id: "valor-condicao",
    title: "Envio de valor/condição",
    category: "Valor/condição",
    description: "Introdução cuidadosa antes de falar de valores.",
    body: "{{nome}}, vou te enviar as condições de {{procedimento}} por aqui. Se ficar alguma dúvida, me chama que eu te explico ponto a ponto.",
    variables: ["nome", "procedimento"],
  },
  {
    id: "pix-cartao",
    title: "Pix/cartão",
    category: "Pix/cartão",
    description: "Mensagem para orientar sobre formas de pagamento.",
    body: "{{nome}}, temos opção de pagamento por Pix ou cartão. Me diga qual forma fica melhor para você que eu te envio a orientação correta.",
    variables: ["nome"],
  },
  {
    id: "comprovante",
    title: "Comprovante recebido",
    category: "Comprovante",
    description: "Resposta segura após receber comprovante.",
    body: "Recebi o comprovante. Vou encaminhar para conferência e nossa equipe continua com você.",
    variables: [],
  },
  {
    id: "agendamento",
    title: "Lembrete de agendamento",
    category: "Agendamento",
    description: "Lembrete manual para confirmar presença.",
    body: "Oi, {{nome}}! Passando para lembrar do seu agendamento relacionado a {{procedimento}}. Se precisar ajustar algo, pode me chamar por aqui.",
    variables: ["nome", "procedimento"],
  },
  {
    id: "reativacao",
    title: "Reativação",
    category: "Reativação",
    description: "Mensagem para leads antigos ou parados.",
    body: "Oi, {{nome}}! Vi aqui seu interesse anterior em {{procedimento}} e quis saber se ainda faz sentido para você retomar essa conversa.",
    variables: ["nome", "procedimento"],
  },
  {
    id: "encerramento",
    title: "Encerramento educado",
    category: "Encerramento/desqualificação",
    description: "Fecha a conversa sem apagar a ponte.",
    body: "Tudo bem, {{nome}}. Vou encerrar seu atendimento por aqui por enquanto. Se quiser retomar depois, é só me chamar.",
    variables: ["nome"],
  },
];

export function getLeadFirstName(lead: Lead) {
  const firstName = lead.nome?.trim().split(/\s+/)[0];
  return firstName || "tudo bem";
}

function getLeadProcedure(lead: Lead) {
  return lead.esp?.trim() || "atendimento";
}

function getLeadCampaign(lead: Lead) {
  return lead.campanha?.trim() || "";
}

export function renderMessageScript(body: string, lead: Lead) {
  const variables: Record<string, string> = {
    nome: getLeadFirstName(lead),
    procedimento: getLeadProcedure(lead),
    campanha: getLeadCampaign(lead),
  };

  return body.replace(/\{\{(nome|procedimento|campanha)\}\}/g, (_, key) => {
    return variables[key] ?? "";
  });
}
