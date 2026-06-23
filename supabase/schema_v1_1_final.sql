drop table if exists public.compromissos;
drop table if exists public.transacoes;
create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('Receita Prevista', 'Receita Recebida', 'Despesa', 'Investimento', 'Pagamento Fatura')),
  categoria text not null,
  conta text not null check (conta in ('Nubank', 'Inter', 'XP')),
  forma text not null check (forma in ('Débito/PIX', 'Crédito')),
  natureza text not null check (natureza in ('Gastos Fixos', 'Gastos Variáveis')),
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  created_at timestamptz default now()
);
alter table public.transacoes enable row level security;
create policy "Usuário vê somente suas transações" on public.transacoes for select using (auth.uid() = user_id);
create policy "Usuário cria somente suas transações" on public.transacoes for insert with check (auth.uid() = user_id);
create policy "Usuário edita somente suas transações" on public.transacoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Usuário exclui somente suas transações" on public.transacoes for delete using (auth.uid() = user_id);
create table public.compromissos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ciclo_inicio date not null,
  ciclo_fim date not null,
  descricao text not null,
  categoria text not null,
  conta text not null check (conta in ('Nubank', 'Inter', 'XP')),
  forma text not null check (forma in ('Débito/PIX', 'Crédito')),
  natureza text not null check (natureza in ('Gastos Fixos', 'Gastos Variáveis')),
  valor_previsto numeric(12,2) not null check (valor_previsto >= 0),
  status text not null default 'Previsto' check (status in ('Previsto', 'Confirmado', 'Cancelado')),
  data_confirmacao date,
  transacao_id uuid references public.transacoes(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.compromissos enable row level security;
create policy "Usuário vê somente seus compromissos" on public.compromissos for select using (auth.uid() = user_id);
create policy "Usuário cria somente seus compromissos" on public.compromissos for insert with check (auth.uid() = user_id);
create policy "Usuário edita somente seus compromissos" on public.compromissos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Usuário exclui somente seus compromissos" on public.compromissos for delete using (auth.uid() = user_id);
