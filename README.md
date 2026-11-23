# ClientCRM – Gerenciador de clientes

CRM leve, feito em HTML, CSS e JavaScript puro. Não precisa de instalação, servidor nem banco de dados: os dados ficam salvos no navegador (localStorage) e podem ser exportados/importados em JSON.

## Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Dashboard** | Receita ganha, taxa de conversão, ticket médio, ciclo de venda, pipeline aberto, previsão ponderada, receita por mês, funil com conversão entre etapas, ranking de responsáveis, top clientes, atendimentos por canal, motivos de perda e próximos fechamentos. Filtro por período. |
| **Clientes** | Cadastro completo (nome, empresa, e-mail, telefone, CPF/CNPJ, cidade, segmento, status), busca, filtros, validação de e-mail duplicado e ficha do cliente com histórico e oportunidades. |
| **Atendimentos** | Histórico em linha do tempo (ligação, e-mail, reunião, WhatsApp, visita, suporte), resultado, responsável, data do próximo contato e alerta de follow-ups vencidos. |
| **Funil de vendas** | Kanban com arrastar e soltar entre Prospecção → Qualificação → Proposta → Negociação → Ganho / Perdido, com totais por etapa. |
| **Oportunidades** | Lista com valor, probabilidade, previsão de fechamento, responsável e origem; filtros (abertas, atrasadas, por etapa e responsável), ordenação e registro do motivo de perda. |

Outros recursos: backup (exportar/importar JSON), dados de exemplo no primeiro acesso, tema claro/escuro automático e layout responsivo.

## Como usar

Abra o arquivo `index.html` no navegador. Para servir localmente (opcional):

```bash
npx serve .
# ou
python -m http.server 8000
```

Também funciona publicado no **GitHub Pages** (Settings → Pages → branch `main`).

## Estrutura

```
index.html
css/styles.css
js/
  store.js          # dados (localStorage) e utilitários de interface
  app.js            # roteamento e inicialização
  seed.js           # dados de exemplo
  dashboard.js      # dashboard de desempenho
  clientes.js       # cadastro de clientes
  atendimentos.js   # histórico de atendimento
  oportunidades.js  # funil de vendas e oportunidades
```

## Observação

Como os dados ficam no navegador, eles são individuais por máquina/navegador. Use **Exportar backup** com frequência para não perdê-los.
