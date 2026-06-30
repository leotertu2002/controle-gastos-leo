# Leo Finance V1.2.1

Atualização sem SQL e sem apagar dados.

Inclui:
- Calendário do ciclo na aba Análises
- Filtros avançados em Lançamentos
- Ordenação dos lançamentos
- Resumo dos filtros
- Duplicar lançamento
- Textos explicativos no Dashboard
- Recomendações do ciclo
- Explicação da projeção do ciclo

## Deploy
Subir os arquivos no GitHub. A Vercel publica automaticamente.


## V1.2.2

- Remove o campo fixo de meta mensal de aporte das abas.
- Corrige o calendário do ciclo para usar formato real de calendário.
- Calendário passa a considerar apenas despesas variáveis, alinhado ao gráfico de gastos variáveis por dia.

## V1.2.3

- Análises de gastos por categoria agora consideram apenas lançamentos do tipo Despesa.
- Removido "Disponível / não gasto" do resumo por categoria.
- Detalhes por categoria: botão "Ver gastos" com lista do maior para o menor.
- Detalhes fixos x variáveis: botão "Ver gastos" com lista do maior para o menor.
- Filtros em compromissos previstos.
- Seleção e exclusão em lote de compromissos.
- Cores fixas por instituição: Nubank roxo, Inter laranja e XP preto/cinza.
- Revisão básica de segurança do código e inclusão de `SECURITY.md`.
