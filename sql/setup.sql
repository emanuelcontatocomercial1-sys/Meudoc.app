-- ========================================================================
-- MeuDoc.app — Setup completo do banco
-- ========================================================================
-- Execute este script no Supabase SQL Editor (Database → SQL Editor → New query)
-- Cria: 5 tabelas, RLS, trigger de profile automatico, indices uteis
-- ========================================================================


-- ========================================================================
-- 1. TABELA: profiles
-- ========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  sobrenome text,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,
  cep text,
  cidade text,
  estado text,
  endereco text,
  plano text default 'gratis',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_email on public.profiles(email);


-- ========================================================================
-- 2. TABELA: documentos
-- ========================================================================
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  tipo text,
  categoria text,
  numero text,
  orgao_emissor text,
  data_emissao date,
  data_vencimento date,
  observacoes text,
  arquivo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_documentos_user on public.documentos(user_id);
create index if not exists idx_documentos_vencimento on public.documentos(data_vencimento);


-- ========================================================================
-- 3. TABELA: alertas
-- ========================================================================
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  documento_id uuid references public.documentos(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text,
  lido boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_alertas_user on public.alertas(user_id);
create index if not exists idx_alertas_lido on public.alertas(user_id, lido);


-- ========================================================================
-- 4. TABELA: agendamentos
-- ========================================================================
create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  orgao text,
  servico text,
  data_agendamento date,
  horario text,
  local text,
  protocolo text,
  status text default 'agendado',
  created_at timestamptz default now()
);

create index if not exists idx_agendamentos_user on public.agendamentos(user_id);


-- ========================================================================
-- 5. TABELA: waitlist (publica, qualquer um pode inserir)
-- ========================================================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);


-- ========================================================================
-- 6. TRIGGER: criar profile automaticamente quando user se cadastra
-- ========================================================================
-- Solucao para o bug onde signUp tentava criar profile sem sessao ativa
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, plano)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.email,
    'gratis'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ========================================================================
-- 7. RLS — Row Level Security
-- ========================================================================

-- profiles: cada user vê/edita só o próprio
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- documentos: cada user vê/edita só os próprios
alter table public.documentos enable row level security;
drop policy if exists "documentos_all_own" on public.documentos;
create policy "documentos_all_own" on public.documentos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- alertas: cada user vê/edita só os próprios
alter table public.alertas enable row level security;
drop policy if exists "alertas_all_own" on public.alertas;
create policy "alertas_all_own" on public.alertas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- agendamentos: cada user vê/edita só os próprios
alter table public.agendamentos enable row level security;
drop policy if exists "agendamentos_all_own" on public.agendamentos;
create policy "agendamentos_all_own" on public.agendamentos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- waitlist: publica para inserir, somente leitura para os próprios usuarios (anonimo nao le)
alter table public.waitlist enable row level security;
drop policy if exists "waitlist_insert_anyone" on public.waitlist;
drop policy if exists "waitlist_select_admin" on public.waitlist;
create policy "waitlist_insert_anyone" on public.waitlist for insert with check (true);
-- (intencionalmente sem policy de SELECT publico — voce le via dashboard)


-- ========================================================================
-- 8. FUNCAO: atualizar updated_at automaticamente
-- ========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_documentos on public.documentos;
create trigger set_updated_at_documentos
  before update on public.documentos
  for each row execute function public.set_updated_at();


-- ========================================================================
-- PRONTO
-- ========================================================================
-- Proximos passos no painel Supabase:
-- 1. Authentication > Providers > Email: deixar "Confirm email" ATIVADO
-- 2. Authentication > URL Configuration:
--    Site URL: https://meudoc-app.vercel.app
--    Redirect URLs: https://meudoc-app.vercel.app/dashboard.html
-- 3. (Opcional, Fase 1) Configurar Google OAuth em Providers > Google
-- ========================================================================
