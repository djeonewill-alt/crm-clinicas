-- BASE 15U.9 - Limpeza revisavel de aberturas e explicacao com ativos.
-- Revisar antes de executar no Supabase.
-- Objetivo: rebaixar aberturas antigas que deixam a cliente solta,
-- priorizar "Abertura padrao WhatsApp - v15" e conferir respostas
-- principais que ainda falam microagulhamento sem mencionar ativos.
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
    'BASE 15U.9: abertura antiga rebaixada por deixar a cliente solta. Preferir "Abertura padrao WhatsApp - v15".'
  ),
  updated_at = now()
where
  title ilike '%Primeira mensagem enviada pelo cliente%'
  or answer_text ilike '%o que você quer saber primeiro%'
  or answer_text ilike '%o que voce quer saber primeiro%'
  or answer_text ilike '%como funciona o tratamento, valores, locais%'
  or answer_text ilike '%como funciona, valores, locais%'
  or answer_text ilike '%alguma dúvida específica sobre o seu caso%'
  or answer_text ilike '%alguma duvida especifica sobre o seu caso%'
  or answer_text ilike '%alguma dúvida específica sobre seu caso%'
  or answer_text ilike '%alguma duvida especifica sobre seu caso%';

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
    'BASE 15U.9: abertura padrao WhatsApp v15 priorizada; saudacao real deve ser adaptada pela rota da IA.'
  ),
  updated_at = now()
where title ilike '%Abertura padrão WhatsApp%v15%'
  or title ilike '%Abertura padrao WhatsApp%v15%';

-- 3) Rebaixar respostas antigas principais que competem com abertura/funcionamento
-- e mencionam microagulhamento sem ativos.
update commercial_responses
set
  priority = least(priority, 20),
  can_auto_reply = false,
  requires_human = true,
  internal_notes = concat_ws(
    E'\n',
    nullif(internal_notes, ''),
    'BASE 15U.9: resposta principal rebaixada para revisar texto de microagulhamento + ativos.'
  ),
  updated_at = now()
where is_active = true
  and answer_text ilike '%microagulhamento%'
  and answer_text not ilike '%ativos%'
  and (
    title ilike '%abertura%'
    or title ilike '%primeira%'
    or title ilike '%como funciona%'
    or array_to_string(tags, ' ') ilike '%abertura%'
    or array_to_string(tags, ' ') ilike '%primeira mensagem%'
    or array_to_string(tags, ' ') ilike '%como funciona%'
  )
  and title not ilike '%v15%';

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
  or answer_text ilike '%alguma dúvida específica sobre o seu caso%'
  or answer_text ilike '%alguma duvida especifica sobre o seu caso%'
  or answer_text ilike '%alguma dúvida específica sobre seu caso%'
  or answer_text ilike '%alguma duvida especifica sobre seu caso%'
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

-- 4) Respostas ativas principais com microagulhamento e sem ativos.
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
  and answer_text ilike '%microagulhamento%'
  and answer_text not ilike '%ativos%'
  and (
    title ilike '%abertura%'
    or title ilike '%primeira%'
    or title ilike '%como funciona%'
    or array_to_string(tags, ' ') ilike '%abertura%'
    or array_to_string(tags, ' ') ilike '%primeira mensagem%'
    or array_to_string(tags, ' ') ilike '%como funciona%'
  )
order by priority desc, title asc;
