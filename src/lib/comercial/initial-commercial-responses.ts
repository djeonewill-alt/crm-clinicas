export type InitialCommercialCategory = {
  name: string;
  slug: string;
  description: string;
  orderIndex: number;
};

export type InitialCommercialResponse = {
  categorySlug: string;
  title: string;
  answerText: string;
  exampleQuestions: string[];
  tags: string[];
  canAutoReply: boolean;
  requiresHuman: boolean;
  priority: number;
  internalNotes?: string;
};

export const initialCommercialCategories: InitialCommercialCategory[] = [
  {
    name: "Primeira abordagem",
    slug: "primeira-abordagem",
    description:
      "Mensagens iniciais para leads que chegaram pelo anúncio e pediram mais informações.",
    orderIndex: 10,
  },
  {
    name: "Como funciona o tratamento",
    slug: "como-funciona-tratamento",
    description:
      "Perguntas sobre como o tratamento é feito, protocolo regenerativo, método aplicado e explicação geral do procedimento.",
    orderIndex: 20,
  },
  {
    name: "Produto / sérum utilizado",
    slug: "produto-serum-utilizado",
    description:
      "Perguntas sobre o líquido, sérum ou produto aplicado durante o procedimento.",
    orderIndex: 30,
  },
  {
    name: "Pigmentação / Não usa tinta",
    slug: "pigmentacao-nao-usa-tinta",
    description:
      "Perguntas sobre tinta, pigmento, camuflagem, tatuagem ou se o tratamento apenas pinta a estria.",
    orderIndex: 40,
  },
  {
    name: "Preço e promoção",
    slug: "preco-promocao",
    description:
      "Perguntas sobre valor, promoção, preço por sessão, preço por região, anúncio e condições comerciais.",
    orderIndex: 50,
  },
  {
    name: "Regiões do corpo",
    slug: "regioes-corpo",
    description:
      "Perguntas sobre como o corpo é dividido para cobrança por região, como abdômen superior, abdômen inferior e flancos.",
    orderIndex: 60,
  },
  {
    name: "Avaliação e protocolo",
    slug: "avaliacao-protocolo",
    description:
      "Perguntas sobre avaliação, análise das estrias, definição de protocolo e quantidade estimada de sessões.",
    orderIndex: 70,
  },
  {
    name: "Quantidade de sessões",
    slug: "quantidade-sessoes",
    description:
      "Perguntas sobre quantas sessões são necessárias, diferença desde a primeira sessão e estimativa de tratamento.",
    orderIndex: 80,
  },
  {
    name: "Intervalo entre sessões",
    slug: "intervalo-sessoes",
    description:
      "Perguntas sobre tempo entre uma sessão e outra e recuperação da pele.",
    orderIndex: 90,
  },
  {
    name: "Flacidez",
    slug: "flacidez",
    description:
      "Perguntas sobre flacidez, pele flácida, barriga pós-gestação e se o tratamento firma a pele.",
    orderIndex: 100,
  },
  {
    name: "Resultados / Antes e depois",
    slug: "resultados-antes-depois",
    description:
      "Perguntas sobre fotos, evolução, antes e depois e expectativa de resultado.",
    orderIndex: 110,
  },
  {
    name: "Avaliação por foto",
    slug: "avaliacao-por-foto",
    description:
      "Perguntas sobre envio de fotos para análise inicial da região com estrias.",
    orderIndex: 120,
  },
  {
    name: "Localização / Unidades",
    slug: "localizacao-unidades",
    description:
      "Perguntas sobre unidades disponíveis, regiões de atendimento, Tatuapé, Paulista e Mairiporã.",
    orderIndex: 130,
  },
  {
    name: "Endereço / Como chegar",
    slug: "endereco-como-chegar",
    description:
      "Perguntas sobre endereço completo, metrô, referência, prédio, sala e instruções de chegada.",
    orderIndex: 140,
  },
  {
    name: "Agendamento / Disponibilidade",
    slug: "agendamento-disponibilidade",
    description:
      "Perguntas sobre datas, horários disponíveis, unidade desejada, agenda cheia e opções de atendimento.",
    orderIndex: 150,
  },
  {
    name: "Horário indisponível / Alternativa",
    slug: "horario-indisponivel-alternativa",
    description:
      "Mensagens quando o cliente só consegue em um período que não está disponível, como noite, manhã ou sábado.",
    orderIndex: 160,
  },
  {
    name: "Confirmação de horário",
    slug: "confirmacao-horario",
    description:
      "Mensagens para confirmar data, horário, duração do atendimento e bloco de 1h30.",
    orderIndex: 170,
  },
  {
    name: "Reserva / Sinal",
    slug: "reserva-sinal",
    description:
      "Perguntas sobre taxa de reserva, sinal de R$100, crédito para primeira sessão e garantia de horário.",
    orderIndex: 180,
  },
  {
    name: "Pagamento / Pix / Cartão",
    slug: "pagamento-pix-cartao",
    description:
      "Perguntas sobre Pix, comprovante, cartão, parcelamento, link de pagamento e confirmação financeira.",
    orderIndex: 190,
  },
  {
    name: "Promoção / Validade da promoção",
    slug: "promocao-validade",
    description:
      "Perguntas sobre até quando vale a promoção, se o valor pode ser travado e se vale para mês futuro.",
    orderIndex: 200,
  },
  {
    name: "Follow-up de pagamento",
    slug: "follow-up-pagamento",
    description:
      "Mensagens em que o cliente quer pagar em uma data futura ou pede para ser chamado depois.",
    orderIndex: 210,
  },
  {
    name: "Profissional / Certificações",
    slug: "profissional-certificacoes",
    description:
      "Perguntas sobre formação, certificações, registro profissional, responsável pelo procedimento e qualificação.",
    orderIndex: 220,
  },
  {
    name: "Menor de idade / Responsável legal",
    slug: "menor-responsavel-legal",
    description:
      "Casos em que o cliente informa ser menor de idade, pergunta sobre autorização dos pais, acompanhante ou assinatura de documentos.",
    orderIndex: 230,
  },
  {
    name: "Gestante / Pós-parto",
    slug: "gestante-pos-parto",
    description:
      "Perguntas de clientes grávidas, puerpério, pós-parto, amamentação e momento seguro para atendimento.",
    orderIndex: 240,
  },
  {
    name: "Tipos de estrias",
    slug: "tipos-de-estrias",
    description:
      "Perguntas sobre estrias vermelhas, roxas, brancas, marrons, recentes ou antigas.",
    orderIndex: 250,
  },
  {
    name: "Caso sensível / Revisão humana",
    slug: "caso-sensivel-revisao-humana",
    description:
      "Casos que não devem ser automatizados sem revisão humana, como gestante, menor de idade, contraindicações, registro profissional ou dúvidas clínicas sensíveis.",
    orderIndex: 260,
  },
];

export const initialCommercialResponses: InitialCommercialResponse[] = [
  {
    categorySlug: "primeira-abordagem",
    title: "Primeira abordagem segura",
    answerText:
      "Olá, tudo bem? Sou do atendimento do consultório Sr. e Sra. Estrias. Vi que você tem interesse em saber mais sobre o tratamento para estrias.\n\nTrabalhamos com um protocolo personalizado, definido conforme o tipo de estria, a região e a resposta da pele. Para te orientar melhor, posso te explicar como funciona, valores, unidades de atendimento e como agendar uma avaliação.",
    exampleQuestions: [
      "Olá, tenho interesse",
      "Quero mais informações",
      "Vi o anúncio e queria saber mais",
      "Como funciona?",
    ],
    tags: ["primeiro contato", "informações", "apresentação"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 100,
    internalNotes:
      "Evitar promessas absolutas. Não usar “doutora”; preferir “especialista” ou “profissional responsável”.",
  },
  {
    categorySlug: "como-funciona-tratamento",
    title: "Explicação simples do tratamento regenerativo",
    answerText:
      "Trabalhamos com um tratamento regenerativo para estrias. A especialista avalia sua pele, o tipo de estria e a região a ser tratada para definir o protocolo mais adequado. O objetivo é estimular a melhora do aspecto, textura e aparência das estrias de acordo com a resposta da sua pele.",
    exampleQuestions: [
      "Como funciona?",
      "Como é feito o tratamento?",
      "O que vocês fazem nas estrias?",
      "É microagulhamento?",
      "Como melhora as estrias?",
    ],
    tags: ["tratamento", "como funciona", "regenerativo", "estrias", "pele"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 95,
    internalNotes:
      "Pode ser usada pela IA como explicação segura, sem prometer resultado absoluto.",
  },
  {
    categorySlug: "preco-promocao",
    title: "Como funciona e valor promocional",
    answerText:
      "Claro! Trabalhamos com um tratamento regenerativo para estrias. De forma simples, a especialista avalia sua pele e define o protocolo mais adequado para estimular a recuperação da região tratada, buscando melhorar o aspecto, a textura e a aparência das estrias conforme a resposta da sua pele.\n\nSobre os valores: neste período promocional, a sessão está saindo por R$ 180 por região tratada. A avaliação é importante porque nela a especialista analisa seu caso, explica o protocolo indicado e orienta a quantidade estimada de sessões.",
    exampleQuestions: [
      "Como funciona e qual o valor?",
      "Quero saber como funciona e os valores",
      "Quanto custa o tratamento?",
      "Como é feito o tratamento?",
      "Qual o preço da sessão?",
    ],
    tags: ["como funciona", "preço", "valor", "promoção", "sessão"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 94,
    internalNotes:
      "Valor promocional precisa ser revisado sempre que a campanha mudar.",
  },
  {
    categorySlug: "preco-promocao",
    title: "Valor promocional por sessão",
    answerText:
      "Neste período promocional, a sessão está saindo por R$ 180 por região tratada. Normalmente o valor é maior, mas na promoção todas as regiões estão com esse valor único por sessão. A avaliação ajuda a confirmar quais regiões entram no seu caso e qual protocolo é mais indicado.",
    exampleQuestions: [
      "Qual o valor?",
      "Quanto custa?",
      "Está R$ 180 mesmo?",
      "Vi um valor no anúncio, é isso mesmo?",
      "Esse valor é por sessão?",
    ],
    tags: ["preço", "valor", "promoção", "sessão", "anúncio"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 93,
    internalNotes:
      "Não usar automaticamente se o valor da promoção estiver desatualizado.",
  },
  {
    categorySlug: "regioes-corpo",
    title: "Como funciona o valor por região",
    answerText:
      "Quando falamos “por região”, significa que algumas áreas do corpo são divididas para o tratamento. Por exemplo, a barriga é dividida em abdômen superior e abdômen inferior. Já os flancos são divididos em lado direito e lado esquerdo. Na avaliação, a especialista confirma certinho quais regiões entram no seu caso.",
    exampleQuestions: [
      "O que significa por região?",
      "Barriga é uma região só?",
      "Flancos contam separado?",
      "Abdômen superior e inferior são separados?",
      "Como vocês dividem as áreas?",
    ],
    tags: ["região", "barriga", "abdômen", "flancos", "valor por região"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 92,
    internalNotes: "Resposta operacional segura. Pode ser automatizada com baixo risco.",
  },
  {
    categorySlug: "regioes-corpo",
    title: "Abdômen inferior e superior",
    answerText:
      "Sim. Para o tratamento, o abdômen é dividido em duas regiões: abdômen superior e abdômen inferior, ou seja, acima e abaixo do umbigo. Então, se o tratamento for apenas no abdômen inferior, ele conta como uma região.",
    exampleQuestions: [
      "O abdômen inferior conta como uma região?",
      "Como vocês dividem o abdômen?",
      "A barriga é uma região só?",
      "Acima e abaixo do umbigo conta separado?",
    ],
    tags: ["abdômen", "abdômen inferior", "abdômen superior", "região", "preço"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 91,
    internalNotes: "Resposta operacional simples.",
  },
  {
    categorySlug: "avaliacao-protocolo",
    title: "Avaliação como primeiro passo",
    answerText:
      "O primeiro passo é agendar uma avaliação na unidade que ficar melhor para você. No dia, a especialista analisa de perto sua pele e suas estrias, entende o que funciona melhor para o seu caso e orienta o protocolo mais adequado. Ela também consegue explicar a quantidade estimada de sessões e as opções para seguir com o tratamento.",
    exampleQuestions: [
      "Como funciona a avaliação?",
      "Preciso passar por avaliação?",
      "A especialista olha no dia?",
      "Ela fala quantas sessões vou precisar?",
      "Já consigo fazer a primeira sessão?",
    ],
    tags: ["avaliação", "protocolo", "sessões", "especialista", "tratamento"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 90,
    internalNotes: "Evitar “doutora”. Usar especialista/profissional responsável.",
  },
  {
    categorySlug: "quantidade-sessoes",
    title: "Quantas sessões vou precisar",
    answerText:
      "A quantidade de sessões depende da região, do tipo de estria, da quantidade de estrias, da profundidade e da resposta da sua pele. Em muitos casos já é possível notar diferença desde a primeira sessão, mas a indicação mais segura é feita após a avaliação da especialista.",
    exampleQuestions: [
      "Quantas sessões vou precisar?",
      "Com uma sessão resolve?",
      "Minha barriga está assim, quantas sessões?",
      "Pela foto dá para saber?",
      "Quantas sessões são necessárias?",
    ],
    tags: ["sessões", "quantidade", "avaliação", "foto", "resultado"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 89,
    internalNotes: "Não prometer número fixo sem avaliação.",
  },
  {
    categorySlug: "intervalo-sessoes",
    title: "Intervalo entre as sessões",
    answerText:
      "As sessões costumam ter um intervalo médio de 30 a 45 dias. Esse prazo pode variar conforme a recuperação da pele, mas nunca fazemos com menos de 30 dias.",
    exampleQuestions: [
      "As sessões são feitas de quanto em quanto tempo?",
      "Qual o intervalo entre as sessões?",
      "Posso fazer toda semana?",
      "Quanto tempo depois posso fazer outra?",
    ],
    tags: ["intervalo", "sessões", "recuperação", "pele", "tratamento"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 88,
    internalNotes: "Resposta operacional segura, salvo caso específico.",
  },
  {
    categorySlug: "pigmentacao-nao-usa-tinta",
    title: "Não é pintura nem camuflagem",
    answerText:
      "Não. Nosso tratamento não é pintura, camuflagem ou pigmentação da estria. Trabalhamos com um protocolo regenerativo, que estimula a própria pele da região tratada a melhorar o aspecto, a textura e a aparência das estrias. Na avaliação, a especialista analisa seu caso e explica qual protocolo é mais indicado para a sua pele.",
    exampleQuestions: [
      "Vocês pintam a estria?",
      "É camuflagem?",
      "Usa tinta?",
      "É pigmentação?",
      "É tatuagem na estria?",
      "Vocês cobrem a estria com cor?",
    ],
    tags: ["tinta", "pigmento", "camuflagem", "pintura", "regenerativo"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 87,
    internalNotes: "Resposta objetiva e segura.",
  },
  {
    categorySlug: "produto-serum-utilizado",
    title: "O que é o líquido usado no procedimento",
    answerText:
      "Esse líquido é um sérum usado durante o protocolo. Ele é aplicado junto ao estímulo feito na pele para auxiliar no processo regenerativo da região tratada. Na avaliação, a especialista explica melhor o protocolo, o tipo de produto utilizado e como ele se aplica ao seu caso.",
    exampleQuestions: [
      "O que é esse líquido?",
      "O que fica no anel da profissional?",
      "É tinta?",
      "É pigmento?",
      "O que vocês aplicam na pele?",
      "Esse produto mancha?",
    ],
    tags: ["sérum", "líquido", "produto", "protocolo", "microagulhamento"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 86,
    internalNotes:
      "Evitar alegações médicas ou composição detalhada sem validação.",
  },
  {
    categorySlug: "flacidez",
    title: "Tratamento para estrias e flacidez",
    answerText:
      "O nosso foco principal é o tratamento das estrias. Ele não é um tratamento específico para flacidez. Em alguns casos, por estimular a região tratada, pode haver melhora no aspecto geral da pele, mas a indicação correta depende da avaliação da especialista.",
    exampleQuestions: [
      "Trata flacidez?",
      "Ajuda na flacidez?",
      "Minha barriga está flácida, resolve?",
      "Esse tratamento firma a pele?",
      "Serve para pele caída?",
    ],
    tags: ["flacidez", "pele", "barriga", "estrias", "avaliação"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 85,
    internalNotes: "Não prometer tratamento de flacidez. Conduzir para avaliação.",
  },
  {
    categorySlug: "resultados-antes-depois",
    title: "Envio de exemplos de resultado",
    answerText:
      "Posso te mostrar alguns exemplos de evolução para você ter uma ideia do tratamento. Cada pele responde de uma forma, então os resultados podem variar conforme o tipo de estria, região tratada e resposta da pele. Na avaliação, a especialista consegue orientar melhor o que esperar no seu caso.",
    exampleQuestions: [
      "Tem antes e depois?",
      "Pode mandar fotos?",
      "Quero ver resultados",
      "Em uma sessão já muda?",
      "Como fica depois?",
    ],
    tags: ["antes e depois", "resultado", "fotos", "evolução", "sessões"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 84,
    internalNotes: "Não prometer resultado individual.",
  },
  {
    categorySlug: "avaliacao-por-foto",
    title: "Cliente quer enviar foto",
    answerText:
      "Pode mandar sim. Vou analisar aqui e, se necessário, mostro para a especialista avaliar melhor a região. Assim conseguimos te orientar com mais segurança sobre o tratamento e a melhor forma de seguir.",
    exampleQuestions: [
      "Posso mandar foto?",
      "Quer que eu mande uma foto?",
      "Dá para avaliar por foto?",
      "Consigo mostrar a região?",
    ],
    tags: ["foto", "avaliação", "região", "especialista"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 83,
    internalNotes: "Se a foto for íntima/sensível, tratar com cuidado e revisão humana.",
  },
  {
    categorySlug: "tipos-de-estrias",
    title: "Estrias vermelhas ou roxas",
    answerText:
      "Tratamos diferentes tipos de estrias, incluindo estrias vermelhas e roxas. Na avaliação, a especialista analisa a região, o tipo de estria e a resposta esperada da sua pele para indicar o protocolo mais adequado.",
    exampleQuestions: [
      "Minhas estrias são vermelhas, trata?",
      "Vocês tratam estrias vermelhas?",
      "Estrias roxas têm tratamento?",
      "Tenho estrias recentes, funciona?",
    ],
    tags: ["estrias vermelhas", "estrias roxas", "tipos de estrias", "avaliação"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 82,
    internalNotes: "Evitar prometer resultado. Conduzir para avaliação.",
  },
  {
    categorySlug: "localizacao-unidades",
    title: "Unidades disponíveis",
    answerText:
      "Nós atendemos em três regiões para facilitar:\n\n📍 Avenida Paulista — próximo à estação Brigadeiro\n📍 Tatuapé — próximo ao Shopping Boulevard\n📍 Mairiporã — região do Centro\n\nQual dessas unidades fica melhor para você?",
    exampleQuestions: [
      "Onde vocês ficam?",
      "Vocês atendem onde?",
      "Qual a localização?",
      "Tem unidade no Tatuapé?",
      "Tem unidade na Paulista?",
      "Vocês atendem em Mairiporã?",
    ],
    tags: ["localização", "unidades", "Tatuapé", "Paulista", "Mairiporã"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 81,
    internalNotes: "Manter endereços detalhados em respostas separadas por unidade.",
  },
  {
    categorySlug: "endereco-como-chegar",
    title: "Endereço da unidade Tatuapé",
    answerText:
      "📍 UNIDADE TATUAPÉ\n\nEndereço:\nRua Catiguá, 159 – Tatuapé\nEdifício You Metropolitan\n\nFica próximo ao Shopping Boulevard e à Estação Tatuapé. Qualquer dúvida no caminho, pode chamar por aqui.",
    exampleQuestions: [
      "Qual o endereço do Tatuapé?",
      "Onde fica no Tatuapé?",
      "É perto do metrô?",
      "Como chegar no Tatuapé?",
    ],
    tags: ["endereço", "Tatuapé", "localização", "metrô", "Shopping Boulevard"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 80,
    internalNotes: "Confirmar sala/andar atual antes de automatizar completamente.",
  },
  {
    categorySlug: "endereco-como-chegar",
    title: "Endereço da unidade Paulista",
    answerText:
      "📍 UNIDADE PAULISTA\n\nEndereço:\nRua Manoel da Nóbrega, 354 – Paraíso\nPróximo à estação Brigadeiro.\n\nQualquer dúvida no caminho, pode chamar por aqui.",
    exampleQuestions: [
      "Qual o endereço da Paulista?",
      "Onde fica na Paulista?",
      "É perto do metrô?",
      "Fica perto da estação Brigadeiro?",
    ],
    tags: ["endereço", "Paulista", "Brigadeiro", "Paraíso", "localização"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 79,
    internalNotes: "Confirmar andar/sala atual antes de automatizar completamente.",
  },
  {
    categorySlug: "agendamento-disponibilidade",
    title: "Agenda cheia e alternativa de data",
    answerText:
      "A procura está bem alta por causa da promoção e alguns horários já estão quase fechados. Para essa unidade, consigo verificar as próximas opções disponíveis e te passar os melhores horários. Você prefere tentar uma data mais próxima em outro período ou garantir uma vaga em uma próxima data?",
    exampleQuestions: [
      "Ainda tem horário?",
      "Tem vaga esse mês?",
      "Tem horário no Tatuapé?",
      "Tem sábado?",
      "Pode ser no próximo mês?",
      "Tem horário à tarde?",
    ],
    tags: ["agenda", "disponibilidade", "vaga", "promoção", "horário", "unidade"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 78,
    internalNotes: "Não prometer horário sem checar agenda real.",
  },
  {
    categorySlug: "horario-indisponivel-alternativa",
    title: "Cliente só consegue em horário indisponível",
    answerText:
      "Entendi. No momento, para essa unidade, não temos atendimento nesse período. O que posso fazer é verificar as próximas opções disponíveis em outros horários ou datas e te passar a melhor alternativa para você conseguir garantir sua avaliação.",
    exampleQuestions: [
      "Só consigo à noite",
      "Só posso de manhã",
      "Não consigo nesse horário",
      "Tem outro horário?",
      "Tem sábado?",
    ],
    tags: ["horário", "agenda", "indisponível", "alternativa", "encaixe"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 77,
    internalNotes: "Depende da agenda real.",
  },
  {
    categorySlug: "confirmacao-horario",
    title: "Confirmar bloco de 1h30",
    answerText:
      "Para esse atendimento, reservamos 1h30, porque é o tempo para avaliação e, se você quiser, já fazer a primeira sessão. Então o horário ficaria das [início] às [fim]. Esse período funciona para você?",
    exampleQuestions: [
      "Pode ser às 10:30?",
      "Qual horário ficou?",
      "É das 9h às 10h30?",
      "Quanto tempo dura?",
      "Que horas termina?",
    ],
    tags: ["horário", "confirmação", "duração", "agenda", "avaliação", "sessão"],
    canAutoReply: true,
    requiresHuman: false,
    priority: 76,
    internalNotes: "Usar para evitar confundir horário inicial com horário final.",
  },
  {
    categorySlug: "reserva-sinal",
    title: "Taxa de reserva descontada da primeira sessão",
    answerText:
      "Para garantir o agendamento, trabalhamos com uma taxa de reserva de R$ 100. Esse valor reserva a sala e o horário da especialista exclusivamente para você. No dia, se você fizer a primeira sessão, esse valor fica como crédito e é descontado do total. Assim, você paga apenas a diferença da sessão no atendimento.",
    exampleQuestions: [
      "Precisa pagar sinal?",
      "Como garante o horário?",
      "Esse valor é descontado?",
      "É taxa de reserva?",
      "O sinal entra no valor da sessão?",
    ],
    tags: ["sinal", "reserva", "pagamento", "pix", "cartão", "promoção"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 75,
    internalNotes: "Não confirmar pagamento automaticamente.",
  },
  {
    categorySlug: "promocao-validade",
    title: "Promoção garantida pelo sinal no mês vigente",
    answerText:
      "A promoção é garantida para quem faz o sinal dentro do mês vigente. Esse sinal reserva o horário e fica como crédito para a primeira sessão. Como valores e campanhas podem mudar, sempre confirmamos as condições antes de fechar o agendamento.",
    exampleQuestions: [
      "A promoção vai até que dia?",
      "Em junho ainda vale a promoção?",
      "Se eu pagar agora, garante o valor?",
      "Até quando fica R$ 180?",
      "Se eu agendar depois mantém o preço?",
    ],
    tags: ["promoção", "validade", "sinal", "reserva", "valor promocional"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 74,
    internalNotes: "Depende da campanha vigente. Revisar antes de automatizar.",
  },
  {
    categorySlug: "follow-up-pagamento",
    title: "Cliente quer pagar em data futura",
    answerText:
      "Sem problemas. Posso deixar anotado para te chamar no dia [data] e te enviar as informações para garantir sua reserva. Assim verificamos se o horário ainda está disponível e damos continuidade ao agendamento.",
    exampleQuestions: [
      "Só vou ter dinheiro dia 16",
      "Posso pagar depois?",
      "Me chama no dia do pagamento",
      "Manda o Pix tal dia",
      "Quero reservar, mas pago depois",
    ],
    tags: ["follow-up", "pagamento futuro", "reserva", "pix", "lembrete"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 73,
    internalNotes: "Futuramente integrar com tarefas/follow-up automático.",
  },
  {
    categorySlug: "profissional-certificacoes",
    title: "Pergunta sobre registro da profissional",
    answerText:
      "A profissional responsável pelo atendimento é especialista no método de tratamento de estrias por microagulhamento e possui formação/certificações específicas para esse protocolo.\n\nPara ser transparente: ela não é médica nem biomédica. Por isso, quando falamos “especialista”, estamos nos referindo à formação e experiência dela no procedimento estético realizado. Posso te enviar as certificações e também o Instagram da clínica para você conhecer melhor o trabalho.",
    exampleQuestions: [
      "Qual o registro da doutora?",
      "Ela é médica?",
      "Ela é biomédica?",
      "Quem faz o procedimento?",
      "A profissional tem certificado?",
      "Qual a formação dela?",
    ],
    tags: ["registro", "certificação", "profissional", "especialista", "formação"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 72,
    internalNotes: "Categoria sensível. Não usar “doutora” sem título correspondente.",
  },
  {
    categorySlug: "menor-responsavel-legal",
    title: "Cliente menor de idade precisa de responsável",
    answerText:
      "Entendi. Como você é menor de idade, precisamos seguir o protocolo de atendimento com responsável legal. No dia do atendimento, é necessário que uma pessoa maior de idade responsável por você esteja presente para acompanhar e assinar os documentos necessários.",
    exampleQuestions: [
      "Tenho 17 anos, posso fazer?",
      "Sou menor de idade, posso fazer o procedimento?",
      "Meus pais autorizaram, posso ir sozinha?",
      "Preciso ir com responsável?",
      "Minha mãe autorizou, precisa acompanhar?",
    ],
    tags: ["menor de idade", "responsável", "autorização", "documentos", "protocolo"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 71,
    internalNotes: "Não agendar automaticamente menor de idade sem responsável.",
  },
  {
    categorySlug: "gestante-pos-parto",
    title: "Gestante não realiza procedimento agora",
    answerText:
      "Durante a gestação, não realizamos o procedimento. O ideal é aguardar o período adequado após o parto e seguir a orientação da equipe responsável antes de qualquer agendamento. Posso deixar seu contato anotado para te chamar mais para frente e verificar o melhor momento para uma avaliação?",
    exampleQuestions: [
      "Grávida pode fazer?",
      "Estou grávida, posso fazer?",
      "Tenho 24 semanas, posso fazer?",
      "Gestante pode fazer o tratamento?",
      "Posso fazer durante a gravidez?",
    ],
    tags: ["gestante", "grávida", "gravidez", "pós-parto", "puerpério", "procedimento"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 70,
    internalNotes: "Não conduzir para pagamento nem agendamento automático.",
  },
  {
    categorySlug: "gestante-pos-parto",
    title: "Cliente teve bebê recentemente",
    answerText:
      "Parabéns pelo bebê! 💕 Como você teve bebê recentemente, precisamos sempre ter cuidado com o momento certo para realizar o procedimento. A especialista vai avaliar sua pele, o período pós-parto e as condições do seu caso antes de indicar o melhor protocolo. Você está amamentando atualmente?",
    exampleQuestions: [
      "Tive bebê há pouco tempo, posso fazer?",
      "Tive bebê em fevereiro, posso tratar as estrias?",
      "Estou no pós-parto, pode fazer?",
      "Estou amamentando, posso fazer?",
      "Minhas estrias apareceram depois da gestação",
    ],
    tags: ["pós-parto", "puerpério", "bebê", "amamentação", "gestação", "estrias"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 69,
    internalNotes: "Encaminhar para humano. Pode exigir orientação interna.",
  },
  {
    categorySlug: "pagamento-pix-cartao",
    title: "Pix seguro para reserva de horário",
    answerText:
      "Para reservar o horário, eu te envio a chave Pix certinha por aqui. Assim que fizer, me manda o comprovante que eu confirmo sua vaga.\n\nEu só confirmo a reserva depois de conferir o pagamento, combinado?",
    exampleQuestions: [
      "Qual é o Pix?",
      "Me manda a chave Pix",
      "Como faço o pagamento?",
      "Pode pagar no Pix?",
      "Para quem eu mando o comprovante?",
    ],
    tags: ["pix", "pagamento", "comprovante", "reserva", "sinal"],
    canAutoReply: false,
    requiresHuman: true,
    priority: 68,
    internalNotes:
      "Não colocar chave Pix fixa sem confirmação da clínica. Não confirmar pagamento automaticamente.",
  },
  {
    categorySlug: "agendamento-disponibilidade",
    title: "Confirmar unidade e preferência de horário",
    answerText:
      "Eu confirmo a agenda certinha para você. Qual unidade fica melhor e você prefere manhã, tarde ou sábado?\n\nCom isso eu verifico as opções disponíveis e te passo o melhor horário antes de reservar.",
    exampleQuestions: [
      "Quero agendar",
      "Tem horário?",
      "Quais horários vocês têm?",
      "Tem vaga sábado?",
      "Pode marcar para mim?",
    ],
    tags: ["agenda", "horário", "unidade", "disponibilidade", "sábado"],
    canAutoReply: true,
    requiresHuman: true,
    priority: 67,
    internalNotes:
      "Agenda continua manual. Não confirmar horário sem checar disponibilidade real.",
  },
];
