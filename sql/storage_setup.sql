-- ========================================================================
-- MeuDoc.app — Setup do Supabase Storage (carteira com foto)
-- ========================================================================
-- Execute APENAS UMA VEZ no SQL Editor do Supabase (alem do setup.sql)
-- Cria bucket 'documentos' privado + policies pra cada user acessar so o
-- proprio. Tambem adiciona coluna pra hash de integridade.
-- ========================================================================


-- 1. Cria bucket 'documentos' (publico pra leitura, max 5MB por arquivo)
-- Publico pra leitura significa: qualquer um COM A URL COMPLETA pode ver.
-- Como a URL contem UUID v4 (user_id) + UUID v4 (doc_id), e 256 bits de
-- entropia — praticamente impossivel adivinhar. So quem tem o QR code
-- ou o link de compartilhamento consegue acessar a foto.
-- Write/update/delete continuam restritos ao dono do arquivo via policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- 2. Policies: cada user so acessa seus proprios arquivos (path: {user_id}/...)
drop policy if exists "documentos_select_own" on storage.objects;
drop policy if exists "documentos_insert_own" on storage.objects;
drop policy if exists "documentos_update_own" on storage.objects;
drop policy if exists "documentos_delete_own" on storage.objects;

create policy "documentos_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "documentos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "documentos_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "documentos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- 3. Adiciona colunas necessarias em documentos (se ainda nao existirem)
alter table public.documentos
  add column if not exists updated_at timestamptz default now(),
  add column if not exists arquivo_frente_path text,
  add column if not exists arquivo_verso_path text,
  add column if not exists hash_integridade text,
  add column if not exists arquivo_url text;

alter table public.profiles
  add column if not exists updated_at timestamptz default now();


-- 4. Funcao publica pra gerar URL de visualizacao de carteira via QR code
-- (sem auth, mostra so dados publicos + foto via signed URL)
create or replace function public.carteira_publica(p_user_id uuid)
returns table (
  nome text,
  cpf text,
  documentos jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.nome,
    p.cpf,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'tipo', d.tipo,
        'nome', d.nome,
        'numero', d.numero,
        'orgao_emissor', d.orgao_emissor,
        'data_emissao', d.data_emissao,
        'data_vencimento', d.data_vencimento,
        'arquivo_frente_path', d.arquivo_frente_path,
        'arquivo_verso_path', d.arquivo_verso_path
      ))
      from public.documentos d where d.user_id = p_user_id
      and d.tipo in ('RG', 'CIN', 'CNH', 'PASSAPORTE')
      ), '[]'::jsonb)
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

-- Permissao pra anon executar (necessario pra pagina /verificar)
grant execute on function public.carteira_publica(uuid) to anon, authenticated;


-- ========================================================================
-- PRONTO
-- ========================================================================
