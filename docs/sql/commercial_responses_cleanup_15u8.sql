-- BASE 15U.8 - Limpeza revisavel de aberturas comerciais.
-- Revisar antes de executar no Supabase.
-- Objetivo: reduzir aberturas antigas que deixam a cliente solta
-- e priorizar "Abertura padrao WhatsApp - v15".
--
-- IMPORTANTE: este arquivo nao deve ser executado automaticamente pelo Codex.

begin;

-- 1) Rebaixar/desativar aberturas antigas que nao conduzem para regiao.
update commercial_responses
set
  is_active = false,
  priority = 0,
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.8: abertura antiga rebaixada por deixar a cliente solta. Preferir "Abertura padrao WhatsApp - v15".'
  ),
  updated_at = now()
where
  title ilike '%Primeira mensagem enviada pelo cliente%'
  or answer_text ilike '%o que você quer saber primeiro%'
  or answer_text ilike '%o que voce quer saber primeiro%'
  or answer_text ilike '%como funciona o tratamento, valores, locais%'
  or answer_text ilike '%como funciona, valores, locais%'
  or answer_text ilike '%valores, unidades de atendimento e como agendar%';

-- 2) Garantir que a abertura v15 fique ativa, revisavel e com prioridade alta.
update commercial_responses
set
  is_active = true,
  can_auto_reply = false,
  requires_human = true,
  priority = greatest(priority, 180),
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.8: abertura padrao WhatsApp v15 priorizada; saudacao real deve ser adaptada pela rota da IA.'
  ),
  updated_at = now()
where title ilike '%Abertura padrão WhatsApp%v15%'
  or title ilike '%Abertura padrao WhatsApp%v15%';

commit;

-- Conferencia pos-execucao.

-- 1) Respostas ativas de abertura.
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
    title ilike '%abertura%'
    or title ilike '%primeira%'
    or array_to_string(tags, ' ') ilike '%abertura%'
    or array_to_string(tags, ' ') ilike '%primeira mensagem%'
  )
order by priority desc, title asc;

-- 2) Respostas que ainda deixam a cliente solta.
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
  answer_text ilike '%o que você quer saber primeiro%'
  or answer_text ilike '%o que voce quer saber primeiro%'
  or answer_text ilike '%como funciona o tratamento, valores, locais%'
  or answer_text ilike '%como funciona, valores, locais%'
order by is_active desc, priority desc, title asc;

-- 3) Respostas v15.
select
  id,
  title,
  is_active,
  can_auto_reply,
  requires_human,
  priority,
  updated_at
from commercial_responses
where title ilike '%v15%'
order by priority desc, title asc;
