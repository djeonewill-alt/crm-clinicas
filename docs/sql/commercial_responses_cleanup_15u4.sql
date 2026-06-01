-- BASE 15U.4 — Limpeza segura da base de respostas comerciais.
-- Revisar antes de executar.
-- Objetivo: reduzir competição de respostas antigas com o pacote v13,
-- sem apagar histórico e sem depender de IDs fixos.

begin;

-- 1) Desativar resposta antiga/perigosa de foto.
-- Risco: prometer "analisar aqui" ou induzir avaliação definitiva por WhatsApp.
update commercial_responses
set
  is_active = false,
  can_auto_reply = false,
  requires_human = true,
  priority = 0,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.4: desativada por risco de sugerir avaliação/análise por foto no WhatsApp. Usar "Foto como referência de prontuário — v13".'
  ),
  updated_at = now()
where
  title ilike '%Cliente quer enviar foto%'
  or answer_text ilike '%vou analisar aqui%';

-- 2) Rebaixar respostas antigas que competem com as respostas v13.
-- Elas podem continuar como referência interna, mas não devem competir na sugestão principal.
update commercial_responses
set
  priority = 0,
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.4: rebaixada para não competir com respostas v13 mais contextuais.'
  ),
  updated_at = now()
where title in (
  'Explicação simples do tratamento regenerativo',
  'Como funciona e valor promocional',
  'Endereço da unidade Paulista',
  'Promoção garantida pelo sinal no mês vigente',
  'Avaliação como primeiro passo'
);

-- 3) Desativar variações antigas que puxam preço em pergunta genérica de funcionamento.
-- Mantém a separação: "Como funciona?" sem preço; "Como funciona e valores" com preço.
update commercial_responses
set
  priority = 0,
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.4: resposta antiga rebaixada porque mistura funcionamento e preço.'
  ),
  updated_at = now()
where
  title ilike '%como funciona%'
  and title not ilike '%v13%'
  and (
    answer_text ilike '%R$ 180%'
    or answer_text ilike '%valor%'
    or answer_text ilike '%preço%'
    or answer_text ilike '%preco%'
  );

-- 4) Se a resposta antiga da Paulista for mantida ativa, corrigir endereço incompleto.
-- A resposta v13 continua sendo a preferencial; este update evita informação incompleta no legado.
update commercial_responses
set
  answer_text = 'Perfeito.

A unidade Paulista fica neste endereço:

📍 Rua Manoel da Nóbrega, 354 – Paraíso
CEP: 04001-001
Referência: próximo à estação Brigadeiro
9º andar, sala 93

Para eu te orientar melhor agora, qual região do corpo você gostaria de tratar?
Exemplo: barriga, flancos, glúteos, coxas, seios ou outra região.',
  can_auto_reply = false,
  requires_human = true,
  priority = least(priority, 10),
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.4: endereço Paulista corrigido; preferir "Endereço Paulista completo — v13".'
  ),
  updated_at = now()
where
  title ilike '%Endereço da unidade Paulista%'
  or title ilike '%Endereco da unidade Paulista%';

-- 5) Promoção antiga não deve puxar Pix/sinal cedo demais.
update commercial_responses
set
  priority = 0,
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.4: promoção rebaixada por puxar sinal/Pix cedo; usar "Promoção campanha atual sem Pix cedo — v13".'
  ),
  updated_at = now()
where
  title ilike '%Promoção garantida pelo sinal%'
  or title ilike '%Promocao garantida pelo sinal%'
  or (
    title ilike '%promo%'
    and answer_text ilike '%sinal%'
    and answer_text ilike '%crédito%'
  )
  or (
    title ilike '%promo%'
    and answer_text ilike '%sinal%'
    and answer_text ilike '%credito%'
  );

-- 6) Respostas sensíveis ficam sempre com revisão humana.
-- Não desativa todas, apenas garante que não fiquem prontas para auto-resposta.
update commercial_responses
set
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.4: categoria/tema sensível exige revisão humana antes do envio.'
  ),
  updated_at = now()
where
  title ilike any (array[
    '%foto%',
    '%pix%',
    '%sinal%',
    '%pagamento%',
    '%agenda%',
    '%agendamento%',
    '%avaliação%',
    '%avaliacao%',
    '%promoção%',
    '%promocao%',
    '%gestante%',
    '%pós-parto%',
    '%pos-parto%',
    '%profissional%',
    '%registro%'
  ])
  or array_to_string(tags, ' ') ilike any (array[
    '%foto%',
    '%pix%',
    '%sinal%',
    '%pagamento%',
    '%agenda%',
    '%agendamento%',
    '%avaliação%',
    '%avaliacao%',
    '%promoção%',
    '%promocao%',
    '%gestante%',
    '%pós-parto%',
    '%pos-parto%',
    '%profissional%',
    '%registro%'
  ]);

commit;

-- Conferência pós-execução.
-- 1) Respostas desativadas/rebaixadas pela BASE 15U.4:
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority,
  updated_at
from commercial_responses
where internal_notes ilike '%BASE 15U.4%'
order by updated_at desc, title asc;

-- 2) Respostas v13 ativas:
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority
from commercial_responses
where title ilike '%v13%'
order by priority desc, title asc;

-- 3) Possíveis inconsistências para revisar:
select
  id,
  title,
  can_auto_reply,
  requires_human,
  priority
from commercial_responses
where can_auto_reply = true
  and requires_human = true
order by priority desc, title asc;
