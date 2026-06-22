# Controle de Gastos Leo v1

Sistema online de controle de gastos por ciclo financeiro 12 → 12.

## Funcionalidades

- Login por e-mail via Supabase
- Ciclo financeiro personalizado: dia 12 até dia 12
- Receita prevista do ciclo
- Despesas
- Investimentos
- Pagamento de fatura
- Meta mensal de aporte
- Saldo inicial em PIX/Débito
- Controle por conta: Nubank, Inter e XP
- Forma: Débito/PIX ou Crédito
- Natureza: Gastos Fixos ou Gastos Variáveis
- Faturas separadas por cartão
- Dashboard com gráficos
- Projeção do fim do ciclo com base no gasto variável médio diário
- Maiores compras variáveis
- Dias com mais gastos variáveis
- Exportação CSV

## Instalação no Supabase

1. Abra o Supabase.
2. Vá em SQL Editor.
3. Cole o conteúdo de `supabase/schema.sql`.
4. Clique em Run.

Atenção: esse script usa `drop table if exists public.transacoes`, então ele apaga a tabela anterior. Use apenas se ainda não tiver dados reais.

## Variáveis de ambiente

Na Vercel, configure:

VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_PUBLISHABLE_KEY

## Deploy

1. Suba este projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Adicione as variáveis de ambiente.
4. Deploy.
