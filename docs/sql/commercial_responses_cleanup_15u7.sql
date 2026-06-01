-- BASE 15U.7 - Limpeza revisavel da base de respostas comerciais.
-- Revisar antes de executar no Supabase.
-- Objetivo: rebaixar/desativar respostas antigas com preco R$ 180,
-- reduzir respostas de promocao que puxam Pix/sinal cedo demais,
-- e garantir que respostas v14 sensiveis fiquem com revisao humana.
--
-- IMPORTANTE: este arquivo nao deve ser executado automaticamente pelo Codex.

begin;

-- 1) Desativar respostas antigas conflitantes com o preco atual.
-- Nao deletar registros: manter historico/auditoria, mas impedir competicao na sugestao.
update commercial_responses
set
  is_active = false,
  priority = 0,
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.7: desativada/rebaixada por conter preco antigo R$ 180. Preco atual: 1 regiao R$ 377,00; abdomen total R$ 550,00.'
  ),
  updated_at = now()
where
  (
    title ilike '%v13%'
    and (
      answer_text ilike '%R$ 180%'
      or answer_text ilike '%R$180%'
      or answer_text ilike '%180 por região%'
      or answer_text ilike '%180 por regiao%'
      or answer_text ilike '%Mães 180%'
      or answer_text ilike '%Maes 180%'
    )
  )
  or answer_text ilike '%R$ 180%'
  or answer_text ilike '%R$180%'
  or answer_text ilike '%180 por região%'
  or answer_text ilike '%180 por regiao%'
  or answer_text ilike '%Mães 180%'
  or answer_text ilike '%Maes 180%'
  or (
    (
      title ilike '%valor promocional%'
      or answer_text ilike '%valor promocional%'
      or title ilike '%promoção%'
      or title ilike '%promocao%'
    )
    and (
      answer_text ilike '%R$ 180%'
      or answer_text ilike '%R$180%'
      or answer_text ilike '%180 por região%'
      or answer_text ilike '%180 por regiao%'
    )
  );

-- 2) Rebaixar respostas antigas de promocao que puxam Pix/sinal cedo demais.
-- Mantem como referencia interna, mas exige revisao humana.
update commercial_responses
set
  priority = 0,
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.7: promocao rebaixada por puxar Pix/sinal/reserva cedo demais. Usar respostas v14 ou revisar manualmente conforme o momento da conversa.'
  ),
  updated_at = now()
where
  (
    title ilike '%promoção%'
    or title ilike '%promocao%'
    or title ilike '%valor promocional%'
    or answer_text ilike '%valor promocional%'
    or answer_text ilike '%campanha atual%'
  )
  and (
    answer_text ilike '%pix%'
    or answer_text ilike '%sinal%'
    or answer_text ilike '%reserva%'
    or answer_text ilike '%comprovante%'
    or answer_text ilike '%crédito%'
    or answer_text ilike '%credito%'
  );

-- 3) Garantir que respostas v14 sensiveis nao fiquem automatizadas.
update commercial_responses
set
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.7: resposta v14 sensivel mantida com revisao humana.'
  ),
  updated_at = now()
where
  title ilike any (array[
    '%Valores atuais%v14%',
    '%Como funciona e valores atuais%v14%',
    '%Abdômen superior inferior total%v14%',
    '%Abdomen superior inferior total%v14%',
    '%Dor e sensibilidade%v14%',
    '%Anestesia no procedimento%v14%',
    '%Pacote de 5 sessões%v14%',
    '%Pacote de 5 sessoes%v14%'
  ]);

commit;

-- Conferencia pos-execucao.

-- 1) Respostas ativas que ainda mencionam R$ 180.
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority,
  updated_at
from commercial_responses
where is_active = true
  and (
    answer_text ilike '%R$ 180%'
    or answer_text ilike '%R$180%'
    or answer_text ilike '%180 por região%'
    or answer_text ilike '%180 por regiao%'
    or answer_text ilike '%Mães 180%'
    or answer_text ilike '%Maes 180%'
  )
order by priority desc, title asc;

-- 2) Respostas v14 ativas.
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority,
  updated_at
from commercial_responses
where title ilike '%v14%'
  and is_active = true
order by priority desc, title asc;

-- 3) Respostas de dor/anestesia.
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority,
  updated_at
from commercial_responses
where
  title ilike '%dor%'
  or title ilike '%anestesia%'
  or title ilike '%anestésico%'
  or title ilike '%anestesico%'
  or array_to_string(tags, ' ') ilike '%dor%'
  or array_to_string(tags, ' ') ilike '%anestesia%'
  or array_to_string(tags, ' ') ilike '%anestésico%'
  or array_to_string(tags, ' ') ilike '%anestesico%'
order by priority desc, title asc;

-- 4) Inconsistencias: respostas marcadas como auto-reply e revisao humana ao mesmo tempo.
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority,
  updated_at
from commercial_responses
where can_auto_reply = true
  and requires_human = true
order by priority desc, title asc;
