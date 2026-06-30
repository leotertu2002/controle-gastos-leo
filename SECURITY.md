# Segurança do Leo Finance

## O que foi verificado no código
- O app usa apenas variáveis públicas do Vite: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Não há `service_role` key no código fonte.
- Senhas são tratadas pelo Supabase Auth; o front-end não armazena nem acessa senhas.
- As operações de leitura/escrita gravam `user_id` do usuário autenticado.

## Recomendações importantes
1. Deixe o repositório GitHub como privado.
2. Nunca publique a chave `service_role` do Supabase.
3. Mantenha RLS habilitado nas tabelas `transacoes` e `compromissos`.
4. Use senha forte no login do Supabase/Google/GitHub/Vercel.
5. Para reforçar o banco, rode opcionalmente o arquivo `supabase/security_check.sql`.

## Sobre segurança
Nenhum sistema é 100% seguro, mas com Supabase Auth + RLS configurado corretamente, o risco de outro usuário acessar dados privados é baixo.
