-- Leo Finance - verificação/reforço de segurança
-- Rodar no Supabase SQL Editor apenas se quiser reforçar RLS.
-- Não apaga dados.

alter table if exists public.transacoes enable row level security;
alter table if exists public.compromissos enable row level security;

-- As políticas abaixo podem falhar se já existirem com o mesmo nome. Nesse caso, ignore o erro
-- ou remova a política antiga antes de recriar.

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transacoes' and policyname='Usuário vê somente suas transações') then
    create policy "Usuário vê somente suas transações" on public.transacoes for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transacoes' and policyname='Usuário cria somente suas transações') then
    create policy "Usuário cria somente suas transações" on public.transacoes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transacoes' and policyname='Usuário edita somente suas transações') then
    create policy "Usuário edita somente suas transações" on public.transacoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transacoes' and policyname='Usuário exclui somente suas transações') then
    create policy "Usuário exclui somente suas transações" on public.transacoes for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='compromissos' and policyname='Usuário vê somente seus compromissos') then
    create policy "Usuário vê somente seus compromissos" on public.compromissos for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='compromissos' and policyname='Usuário cria somente seus compromissos') then
    create policy "Usuário cria somente seus compromissos" on public.compromissos for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='compromissos' and policyname='Usuário edita somente seus compromissos') then
    create policy "Usuário edita somente seus compromissos" on public.compromissos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='compromissos' and policyname='Usuário exclui somente seus compromissos') then
    create policy "Usuário exclui somente seus compromissos" on public.compromissos for delete using (auth.uid() = user_id);
  end if;
end $$;
