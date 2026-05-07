# AGENTS.md — CRM Clínicas Next

## Função do agente

Você atua como diagnosticador técnico e assistente de manutenção deste projeto.

O projeto é um CRM para clínicas, migrado de HTML standalone para Next.js.

Stack atual:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- Multiempresa
- Módulo Comercial em migração/refatoração

## Regras obrigatórias

1. Não altere arquivos sem autorização explícita.
2. Não crie arquivos sem autorização explícita.
3. Não rode comandos destrutivos.
4. Não rode `npm audit fix --force`.
5. Não instale pacotes sem autorização.
6. Não faça refactor amplo de arquivos grandes.
7. Não altere SQL, RLS ou Supabase sem solicitação explícita.
8. Não use `service_role_key` no frontend.
9. Não crie backups `.tsx` dentro de `src`.
10. Backups devem usar `.bak` e ficar fora da compilação.
11. Antes de corrigir erro, faça diagnóstico.
12. Antes de extrair componente/hook, mapeie imports, usos e riscos.
13. Depois de qualquer alteração, rodar `npm.cmd run build`.
14. O módulo Comercial funcionando não pode ser quebrado.

## Fluxo padrão

Para qualquer tarefa:

1. Diagnosticar.
2. Listar arquivos envolvidos.
3. Listar funções/estados/imports envolvidos.
4. Explicar risco.
5. Sugerir alteração mínima.
6. Aguardar autorização.
7. Aplicar somente a alteração aprovada.
8. Rodar build.
9. Reportar resultado.

## Arquivos principais do Comercial

- `src/components/comercial/ComercialTrabalhoClient.tsx`
  - Orquestrador da tela de trabalho comercial.
  - Mantém estados e handlers principais.

- `src/components/comercial/ComercialWorkHeader.tsx`
  - Header da tela de trabalho.

- `src/components/comercial/NewLeadForm.tsx`
  - Formulário de novo lead.

- `src/components/comercial/FunnelStatCards.tsx`
  - Cards de contagem dos funis.

- `src/components/comercial/LeadQueue.tsx`
  - Lateral da fila, busca, modo Fila/Todos e seleção de lead.

- `src/components/comercial/LeadDetail.tsx`
  - Painel do lead selecionado.

- `src/components/comercial/LeadActions.tsx`
  - Ações rápidas: WhatsApp, qualificar, retorno, fechar, desqualificar, voltar dia.

- `src/components/comercial/TentativasList.tsx`
  - Lista e registro de tentativas do dia.

- `src/components/comercial/ComercialFunisClient.tsx`
  - Kanban/funis em modo leitura.

## Regras de negócio críticas

1. Fila inteligente:
   - Prospecção mostra apenas `d1`.
   - Qualificação mostra apenas `q1`.
   - Retorno mostra leads com data de retorno vencida/hoje.
   - Leads de outros dias ficam ocultos no modo Fila.
   - Modo Todos mostra leads ocultos do funil.

2. Tentativas:
   - Cada dia cria tentativas específicas.
   - Ao concluir tentativas do dia, pode avançar para o próximo dia.
   - As ações salvam no Supabase.

3. Movimentações:
   - Qualificar move para `qualificacao/q1`.
   - Retorno move para `retorno/r1` com data.
   - Fechar move para `clientes` e marca `fechado`.
   - Desqualificar move para `desqualificado`.
   - Voltar dia recria tentativas do dia anterior.

4. Multiempresa:
   - Leads devem ser filtrados por `empresa_id`.
   - Não misturar empresas.

## Proibições específicas

Nunca fazer:

- Refatorar o Comercial inteiro de uma vez.
- Apagar `_backups` sem autorização.
- Criar backup `.tsx`.
- Mover lógica de Supabase para frontend inseguro.
- Alterar RLS sem SQL explícito.
- Alterar várias frentes ao mesmo tempo.
- Mexer em Financeiro enquanto estiver ajustando Comercial, salvo solicitação clara.

## Antes de usar Codex para diagnóstico

Prompt recomendado:

"Analise sem alterar arquivos. Liste arquivos envolvidos, funções, imports, riscos e alteração mínima. Não edite, não crie, não instale e não rode comandos destrutivos."
