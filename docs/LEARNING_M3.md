# Aprendendo com M3 — gráficos e status público

A coleta da M2 já gravava os dados. M3 apresenta essas observações e permite compartilhar uma seleção dos serviços. Não foi preciso mudar o schema: StatusPage e StatusPageMonitor estavam nas migrations iniciais e agora são usados pela aplicação.

## Como os dados viram gráfico

monitorHistory mantém as métricas do período e acrescenta uma agregação por intervalo: cinco minutos para 24 h, uma hora para 7 dias e seis horas para 30 dias. Os limites são alinhados em UTC.

Cada bucket contém amostras de endpoint, sucessos, falhas, resultados operacionais e média da latência de sucessos. Intervalos sem sucesso têm averageMs=null, nunca zero. O componente SVG divide a linha nesses pontos; falhas e operacionais aparecem em faixas separadas.

O p95 continua vindo dos checks originais. Fazer média das médias ou dos percentis de buckets mudaria o peso das amostras e poderia distorcer o resultado. A tabela de checks limita a exibição, mas não limita a janela usada na agregação.

LatencyChart recebe somente os buckets, não o objeto de histórico completo. Usa um controle range navegável com setas, feedback textual do intervalo e tabela alternativa. O tooltip descreve latência até headers, não download do corpo. LocalTime mostra horários no fuso do navegador.

## Autorização para publicar

O formulário envia IDs, mas eles não autorizam nada. A action deriva ownerId da sessão. O serviço verifica todos os monitores sob lock e substitui a seleção na mesma transação. FKs compostas impedem associar monitores de proprietários diferentes também no banco.

O lock do usuário serializa a primeira criação. Locks dos monitores vêm em ordem de ID antes da página; updatedAt detecta formulário desatualizado. Slug é único no PostgreSQL: duas contas não podem obter o mesmo endereço mesmo enviando pedidos ao mesmo tempo.

A publicação começa desativada. O usuário escolhe serviços, nomes públicos e textos, e marca Publicar. Desmarcar faz visitantes receberem 404. Renomear o slug também invalida o endereço antigo.

## Privacidade por projeção

A rota pública não reutiliza monitorHistory nem serializa um Monitor. readPublicPage tem uma consulta própria com select explícito e monta um DTO, isto é, um objeto com os campos necessários para a apresentação pública.

O resultado inclui título/descrição, nomes públicos, estados, disponibilidade/amostras de 24 h, última coleta e datas/motivos de encerramento de incidentes. Não inclui ID, ownerId, URL, query string, nome privado ou erro técnico. Até campos usados internamente para consultar amostras ficam fora do retorno.

Isso é diferente de esconder a URL com CSS: dados enviados ao navegador ainda seriam públicos. O teste compara os campos do DTO e procura segredos no HTML do visitante. Textos escolhidos pelo usuário são públicos e devem ser revisados antes de publicar.

A leitura usa snapshot RepeatableRead para manter publicação, seleção e observações consistentes. A rota é dinâmica, sem cache global; após despublicar, novas requisições recebem 404. Dados já recebidos não podem ser apagados do navegador de outra pessoa.

## Um resumo que não promete demais

visibleStatus é uma regra compartilhada entre painel e página pública. Sem observação, não chamamos um monitor de online; dados antigos mostram Sem dados recentes. Pausados são tratados separadamente.

Se todos os serviços selecionados estiverem pausados, ou não houver seleção, mostramos Nenhum serviço ativo publicado. Um serviço offline degrada o resumo; instabilidade e ausência de dados também impedem afirmar que todos estão online. Disponibilidade continua sendo por amostras, sem SLA.

## E2E com três participantes

A jornada principal usa PostgreSQL de teste, servidor HTTP controlado, processo worker e dois contextos de navegador: proprietário autenticado e visitante sem sessão.

O fixture passa por sucesso, duas falhas e recuperação. O worker persiste o ciclo, o proprietário consulta o gráfico e o visitante acompanha os estados publicados. Depois o teste renomeia/despublica a página, verifica HTTP 404 e confirma que o HTML não contém dados privados.

O harness é um arquivo dentro de tests/, executado em processo separado. Ele injeta o transporte local e acelera a espera apenas para os testes. Nenhuma flag, provider especial ou rota de login foi adicionada ao app para facilitar essa jornada. OAuth real ainda precisa de smoke com credenciais.

## Como estudar o código

O CI também encontrou uma dependência vulnerável do lint: braces, sem versão corrigida no momento da entrega. Um adaptador local substitui somente a API de glob de diretórios usada pelo plugin Next por tinyglobby. Preservamos os presets e a auditoria, e testamos o helper real em quatro configurações. Leia tooling/next-root-glob/README.md; esse override deve ser reavaliado ao atualizar o Next. A instalação limpa pelo lockfile faz parte da validação.

Leia `src/features/monitors/history.ts` → `src/components/latency-chart.tsx` para o gráfico. Para publicação: `src/app/(private)/status-page/actions.ts` → `src/features/status-pages/service.ts`. Para privacidade: `src/features/status-pages/public.ts` → `src/app/status/[slug]/page.tsx`.

Compare os commits com `git log --oneline` e `git show <commit>`. Os testes de banco estão em `tests/integration/status-pages.test.ts`; a jornada completa está em `tests/e2e/monitors.spec.ts`. A próxima entrega é operação: escolher hospedagem, validar capacidade, backup/restore e publicar a demo.
