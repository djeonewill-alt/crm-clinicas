-- BASE 15W - Banco de Materiais Comerciais
-- Revisar e executar manualmente no Supabase. Este arquivo NAO foi executado pelo Codex.

create table if not exists public.commercial_materials (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  title text not null,
  description text null,
  category text not null check (
    category in (
      'before_after',
      'address',
      'payment_pix',
      'schedule',
      'certification',
      'document',
      'other'
    )
  ),
  material_type text not null default 'image' check (material_type = 'image'),
  region text null,
  skin_tone text null,
  sessions_count integer null check (sessions_count is null or sessions_count >= 0),
  audience text null,
  file_name text null,
  file_mime_type text null,
  file_size integer null,
  storage_bucket text null,
  storage_path text null,
  public_url text null,
  caption text null,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_materials_empresa_id_idx
  on public.commercial_materials (empresa_id);

create index if not exists commercial_materials_category_idx
  on public.commercial_materials (category);

create index if not exists commercial_materials_region_idx
  on public.commercial_materials (region);

create index if not exists commercial_materials_skin_tone_idx
  on public.commercial_materials (skin_tone);

create index if not exists commercial_materials_is_active_idx
  on public.commercial_materials (is_active);

create index if not exists commercial_materials_created_at_idx
  on public.commercial_materials (created_at desc);

create or replace function public.set_commercial_materials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists commercial_materials_set_updated_at
  on public.commercial_materials;

create trigger commercial_materials_set_updated_at
before update on public.commercial_materials
for each row
execute function public.set_commercial_materials_updated_at();

alter table public.commercial_materials enable row level security;

-- RLS:
-- Ajuste as policies abaixo ao padrao real do seu projeto antes de executar.
-- A ideia e seguir as demais tabelas comerciais: usuario autenticado so acessa
-- registros da propria empresa/perfil.
--
-- Exemplo seguro somente se public.profiles tiver user_id/id e empresa_id:
--
-- create policy "commercial_materials_select_own_empresa"
-- on public.commercial_materials
-- for select
-- to authenticated
-- using (
--   empresa_id in (
--     select profiles.empresa_id
--     from public.profiles
--     where profiles.id = auth.uid()
--        or profiles.user_id = auth.uid()
--   )
-- );
--
-- create policy "commercial_materials_insert_own_empresa"
-- on public.commercial_materials
-- for insert
-- to authenticated
-- with check (
--   empresa_id in (
--     select profiles.empresa_id
--     from public.profiles
--     where profiles.id = auth.uid()
--        or profiles.user_id = auth.uid()
--   )
-- );
--
-- create policy "commercial_materials_update_own_empresa"
-- on public.commercial_materials
-- for update
-- to authenticated
-- using (
--   empresa_id in (
--     select profiles.empresa_id
--     from public.profiles
--     where profiles.id = auth.uid()
--        or profiles.user_id = auth.uid()
--   )
-- )
-- with check (
--   empresa_id in (
--     select profiles.empresa_id
--     from public.profiles
--     where profiles.id = auth.uid()
--        or profiles.user_id = auth.uid()
--   )
-- );

-- Storage:
-- Se for usar upload, criar manualmente um bucket publico ou com policy adequada:
-- Bucket sugerido: commercial-materials
--
-- Exemplo via dashboard Supabase:
-- 1. Storage > New bucket > commercial-materials
-- 2. Decidir se sera publico.
-- 3. Criar policies de storage.objects seguindo o mesmo isolamento por empresa.
--
-- A aplicacao tambem permite cadastrar material por URL publica, caso o bucket
-- ainda nao esteja configurado.
