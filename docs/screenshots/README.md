# Capturas da interface

Capturadas em 6 de outubro de 2026 a partir do build de produção local da revisão `801b1c0`, usando Chromium via Edge no Windows. A web foi executada em uma porta de teste, com PostgreSQL descartável separado e sem acesso ao banco da aplicação. O código da interface não foi modificado para gerar as imagens.

| Captura | O que mostra | Origem dos dados |
| --- | --- | --- |
| [Apresentação](home-desktop.png) | Marca atual, tema claro, proposta e exemplo visual | Dados ilustrativos fixos da própria apresentação, identificados na interface |
| [Painel](dashboard-desktop.png) | Lista de serviços, contagens de estado e frequência | Conta, monitores e observações fictícios inseridos no banco descartável |
| [Histórico](history-dark-desktop.png) | Tema escuro, métricas, gráfico e recuperação de incidente | Mesmos registros fictícios, incluindo sucessos e duas falhas seguidas |
| [Status público](status-mobile.png) | Serviços selecionados e incidente em uma tela de 390 px | Página publicada no banco de teste, aberta em sessão de navegador sem autenticação |

As URLs usadas nos registros são de `example.com`. Não foram executadas verificações contra esses endpoints para produzir as capturas. Os horários e as métricas exibidos vêm dos registros sintéticos; não representam uptime real, carga suportada ou uma demo em produção.

Uma sessão normal de banco foi criada somente no ambiente isolado para abrir as rotas privadas. Isso não comprova o retorno do OAuth GitHub. A aplicação não possui rota de login de teste nem flag de produção para desabilitar a política de rede.

O navegador aguardou o carregamento da fonte local e usou preferência por movimento reduzido. As imagens mostram a interface em execução, sem montagem ou retoque. São evidências de apresentação do produto; testes do ciclo de queda e recuperação com worker estão descritos em [TESTING.md](../TESTING.md).
