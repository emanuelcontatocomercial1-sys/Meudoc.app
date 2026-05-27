-- ========================================================================
-- FIX: adiciona colunas faltantes nas tabelas
-- ========================================================================
-- Execute UMA VEZ no SQL Editor do Supabase pra corrigir o erro:
-- "record 'new' has no field 'updated_at'"
-- ========================================================================

alter table public.documentos
  add column if not exists updated_at timestamptz default now(),
  add column if not exists arquivo_frente_path text,
  add column if not exists arquivo_verso_path text,
  add column if not exists hash_integridade text,
  add column if not exists arquivo_url text;

alter table public.profiles
  add column if not exists updated_at timestamptz default now(),
  add column if not exists cpf text,
  add column if not exists telefone text,
  add column if not exists data_nascimento date,
  add column if not exists cep text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists endereco text,
  add column if not exists sobrenome text,
  add column if not exists plano text default 'gratis';

-- Pronto. Agora pode salvar/editar documentos sem erro.
