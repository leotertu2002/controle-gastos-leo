-- Supabase SQL Editor > New query > cole tudo > Run
-- Esse script recria a tabela no modelo correto da v1.
-- Se você já cadastrou dados reais, NÃO rode este drop. Para primeira instalação, pode rodar.

drop table if exists public.transacoes;

create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('Receita Prevista', 'Despesa', 'Investimento', 'Pagamento Fatura')),
  categoria text not null,
  conta text not null check (conta in ('Nubank', 'Inter', 'XP')),
  forma text not null check (forma in ('Débito/PIX', 'Crédito')),
  natureza text not null check (natureza in ('Gastos Fixos', 'Gastos Variáveis')),
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  created_at timestamptz default now()
);

alter table public.transacoes enable row level security;

create policy "Usuário vê somente suas transações"
on public.transacoes for select
using (auth.uid() = user_id);

create policy "Usuário cria somente suas transações"
on public.transacoes for insert
with check (auth.uid() = user_id);

create policy "Usuário edita somente suas transações"
on public.transacoes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuário exclui somente suas transações"
on public.transacoes for delete
using (auth.uid() = user_id);
