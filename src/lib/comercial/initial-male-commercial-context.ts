export const initialMaleCommercialContext = {
  context: {
    name: "Atendimento masculino — Junho",
    slug: "atendimento-masculino-junho",
    description:
      "Contexto para leads masculinos interessados no tratamento de estrias.",
    audienceLabel: "Homens com estrias",
    campaignLabel: "Campanha Homens — Junho",
    priceNotes:
      "Preencher/revisar valor específico antes de usar em atendimento real.",
    paymentNotes:
      "Confirmar condições de pagamento, sinal e parcelamento antes de enviar.",
    scheduleNotes: "Verificar agenda manualmente antes de confirmar horário.",
    unitsNotes: "Confirmar unidades disponíveis para atendimento masculino.",
    safetyNotes:
      "Casos sensíveis, menores de idade, gestantes/pós-parto não se aplicam diretamente, mas dúvidas clínicas devem ser revisadas pela especialista.",
    internalNotes:
      "Pacote inicial criado para separar respostas do público masculino da base geral.",
    isActive: true,
  },
  responses: [
    {
      title: "Primeira abordagem — homens",
      categorySlug: "primeira-abordagem",
      answerText:
        "Oi! Tudo bem? Vi que você tem interesse em tratar estrias. Atendemos homens também, com uma avaliação individual para entender região, tipo de estria e melhor condução. Me conta qual região você gostaria de tratar?",
      exampleQuestions: [
        "Tenho interesse em tratar estrias",
        "Vocês atendem homem?",
        "Quero saber mais sobre tratamento para homem",
      ],
      tags: ["homens", "abertura", "primeira abordagem"],
      canAutoReply: false,
      requiresHuman: false,
      isActive: true,
      priority: 50,
    },
    {
      title: "Como funciona — homens",
      categorySlug: "como-funciona-tratamento",
      answerText:
        "O tratamento é feito diretamente na região das estrias, com avaliação prévia para entender o tipo de estria, profundidade e área tratada. Em homens, a condução também considera região do corpo, sensibilidade da pele e expectativa realista de resultado. A especialista avalia o caso antes de orientar o melhor plano.",
      exampleQuestions: [
        "Como funciona para homens?",
        "Como é o tratamento?",
        "Funciona em estria masculina?",
      ],
      tags: ["homens", "como funciona", "tratamento"],
      canAutoReply: false,
      requiresHuman: false,
      isActive: true,
      priority: 50,
    },
    {
      title: "Valor — homens",
      categorySlug: "preco-promocao",
      answerText:
        "[REVISAR VALOR DO ATENDIMENTO MASCULINO ANTES DE ENVIAR]\n\nO valor para atendimento masculino pode variar conforme a região tratada e a avaliação da especialista. Para te passar a condição correta, preciso confirmar a região das estrias e se será uma área pequena, média ou maior.",
      exampleQuestions: [
        "Qual o valor para homem?",
        "Quanto custa?",
        "Preço para tratar estrias masculinas",
      ],
      tags: ["homens", "valor", "preço", "promocao"],
      canAutoReply: false,
      requiresHuman: true,
      isActive: true,
      priority: 50,
    },
    {
      title: "Unidades — homens",
      categorySlug: "localizacao-unidades",
      answerText:
        "Nós atendemos em unidades específicas da clínica. Antes de confirmar, me diga qual região fica melhor para você, para eu orientar a unidade mais adequada e verificar disponibilidade.",
      exampleQuestions: [
        "Onde vocês ficam?",
        "Qual unidade atende homens?",
        "Tem unidade para atendimento masculino?",
      ],
      tags: ["homens", "unidades", "localização"],
      canAutoReply: false,
      requiresHuman: false,
      isActive: true,
      priority: 50,
    },
    {
      title: "Reserva/Sinal — homens",
      categorySlug: "reserva-sinal",
      answerText:
        "Para reservar horário, pode ser necessário sinal conforme a agenda e a condição vigente. Antes de enviar qualquer dado de pagamento, vou confirmar a disponibilidade e a regra atual de reserva para o atendimento masculino.",
      exampleQuestions: [
        "Precisa pagar sinal?",
        "Como reserva horário?",
        "Tenho que pagar para agendar?",
      ],
      tags: ["homens", "reserva", "sinal", "pagamento"],
      canAutoReply: false,
      requiresHuman: true,
      isActive: true,
      priority: 50,
    },
    {
      title: "Quantidade de sessões — homens",
      categorySlug: "quantidade-sessoes",
      answerText:
        "A quantidade de sessões depende da avaliação da pele, região, tipo de estria e resposta individual ao tratamento. Não dá para prometer um número exato sem avaliação, mas a especialista consegue orientar uma estimativa mais segura após analisar o caso.",
      exampleQuestions: [
        "Quantas sessões precisa?",
        "Em quantas sessões melhora?",
        "Homem precisa de quantas sessões?",
      ],
      tags: ["homens", "sessões", "resultado"],
      canAutoReply: false,
      requiresHuman: true,
      isActive: true,
      priority: 50,
    },
    {
      title: "Pode mandar foto? — homens",
      categorySlug: "avaliacao-por-foto",
      answerText:
        "Pode mandar foto da região das estrias, se você se sentir confortável. Envie apenas o necessário para avaliação da pele e evite imagens íntimas ou que exponham mais do que a área a ser analisada. A avaliação final deve ser confirmada pela especialista.",
      exampleQuestions: [
        "Posso mandar foto?",
        "Vocês avaliam por foto?",
        "Mando foto das estrias?",
      ],
      tags: ["homens", "foto", "avaliação"],
      canAutoReply: false,
      requiresHuman: true,
      isActive: true,
      priority: 50,
    },
    {
      title: "Antes e depois — homens",
      categorySlug: "resultados-antes-depois",
      answerText:
        "Temos referências de resultados, mas cada pele responde de um jeito. O ideal é usar antes/depois apenas como referência visual, sem promessa de resultado igual. A especialista avalia seu caso para alinhar uma expectativa segura.",
      exampleQuestions: [
        "Tem antes e depois de homem?",
        "Quero ver resultados",
        "Funciona mesmo em homem?",
      ],
      tags: ["homens", "antes e depois", "resultado"],
      canAutoReply: false,
      requiresHuman: true,
      isActive: true,
      priority: 50,
    },
    {
      title: "Profissional/certificações — homens",
      categorySlug: "profissional-certificacoes",
      answerText:
        "O atendimento é realizado por profissional treinada e a orientação clínica deve ser confirmada pela especialista. Se você tiver alguma condição de pele, uso de medicação ou histórico específico, é importante avisar antes para revisão segura.",
      exampleQuestions: [
        "Quem faz o procedimento?",
        "A profissional é certificada?",
        "É seguro para homem?",
      ],
      tags: ["homens", "profissional", "certificação", "segurança"],
      canAutoReply: false,
      requiresHuman: true,
      isActive: true,
      priority: 50,
    },
    {
      title: "Não é tinta/camuflagem — homens",
      categorySlug: "pigmentacao-nao-usa-tinta",
      answerText:
        "Não é pintura e não é camuflagem com tinta. A proposta do tratamento é trabalhar a aparência das estrias na pele, conforme avaliação da especialista. Se você busca cobrir com pigmento, é importante alinhar antes, porque esse não é o foco do atendimento.",
      exampleQuestions: [
        "Vocês pintam a estria?",
        "É camuflagem?",
        "Usa tinta?",
      ],
      tags: ["homens", "não usa tinta", "camuflagem", "pigmentação"],
      canAutoReply: false,
      requiresHuman: false,
      isActive: true,
      priority: 50,
    },
  ],
} as const;
