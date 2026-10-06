# Estratégia de testes e release

M3 inclui 102 testes unitários, 44 de integração PostgreSQL/rede e 10 jornadas de navegador, além de smoke de web/worker. Executar `npm test`, `npm run test:integration`, `npm run test:e2e` e `npm run test:smoke` conforme o README. CI está em `.github/workflows/ci.yml`. Sessões E2E usam o banco normal, sem bypass no app. OAuth real requer smoke manual após configuração. Capacidade, restore e deploy continuam planejados para M4.

## Evidências de M3

- Buckets UTC em três janelas: somas consistentes, média null em falhas/intervalos vazios, p95 calculado das amostras do período.
- Estados públicos: unknown/stale/paused, resumo vazio/pausados sem falsa disponibilidade e degradação por serviço.
- Publicação: padrão despublicado, seleção explícita, propriedade, conflito de versão, disputa de slug, renomeação e despublicação.
- Projeção pública sem IDs, URLs, query strings, identidade, nome privado e erros técnicos. E2E também verifica o HTML recebido pelo visitante.
- Processo worker em tests/fixtures/worker-harness.ts executa o mesmo runtime/loop da aplicação contra um servidor HTTP isolado. O teste acelera a espera e mapeia o transporte por código de fixture, sem variável de produção que libere destinos locais. TEST_DATABASE_URL é obrigatório e independente de DATABASE_URL.
- Navegador acompanha online → instável → offline → recuperado e confirma os estados públicos sem sessão. Troca de slug e despublicação retornam HTTP 404; formulário adulterado não publica monitor estrangeiro.
- Gráfico navegável por teclado, tabela alternativa, filtros de período e telas mobile de 360 px. Screenshots locais são artefatos de teste, não uma demo de produção.
- Correção de tooling após auditoria: adaptador tinyglobby limitado ao helper de diretórios do plugin Next, preservando os presets. Quatro testes exercitam a API real do helper; instalação limpa e auditoria completa devem passar. Reavaliar o override em upgrades do Next.

## Evidências de M2

- Servidor HTTP isolado: headers sem corpo finalizado, timeout, Host preservado e redirect sem seguir destino; HTTPS com certificado autoassinado é rejeitado.
- DNS misto é bloqueado; o transporte recebe somente o IP validado. Resolver/transport de fixtures são injetados somente pelo código dos testes, sem flag de produção para permitir localhost.
- Dois schedulers competem pelo mesmo ciclo; lease expirada troca token sem trocar runId; conclusão antiga, duplicada, após expiração, pausa, edição ou exclusão é rejeitada.
- Ciclo HTTP real pelo WorkerRuntime: online → instável → offline → recuperado, com um incidente. Teste adicional verifica cinco slots e a sexta tarefa sem reserva antecipada.
- Falha de persistência reverte a transação inteira. Coleta preserva updatedAt da configuração para não invalidar formulário apenas pela atividade do worker.
- Disponibilidade vazia é null; p95 de 1 a 20 é 19; janelas UTC e lacunas são verificadas; dois cleaners não duplicam remoção, preservando execuções ativas e incidentes.
- Browser mostra métricas/recuperação e filtros no mobile a partir de registros de fixture. Não confundir essa jornada com a autorização GitHub real ou com E2E orquestrando worker.

## Regras de domínio: testes unitários

- Primeira falha deixa instável; segunda abre incidente com início na primeira falha.
- Falha isolada seguida de sucesso não cria incidente.
- Sucesso resolve apenas um incidente aberto; falhas seguintes não duplicam incidente.
- Pausa, retomada e mudança de URL obedecem às regras de revisão e encerramento.
- Disponibilidade: zero amostras, todas falhas, mistura, falha isolada, erro do coletor e janela temporal.
- p95 nearest-rank com amostras pequenas, repetidas e limites do período.
- Estado sem dados recentes e resumo público com monitores pausados/desconhecidos.

## URL safety: unitários e integração HTTP isolada

Testar localhost, IPv4/IPv6 privados, endereços mapeados, formatos alternativos, DNS público/privado misto, metadados, credenciais, portas e protocolos proibidos. Simular DNS rebinding e confirmar que a conexão usa o IP validado. Testar redirects sem seguir destino, timeout, erro TLS e descarte do corpo.

Usar um resolver/transport injetável para fixtures. Qualquer permissão de host local é exclusiva do harness de testes, sem variável de produção capaz de desabilitar todas as proteções.

## PostgreSQL: integração real

- Dois workers disputam o mesmo monitor: um resultado persistido por ciclo e um incidente aberto.
- Crash antes/depois da requisição e antes/depois do commit; recuperação de lease e rejeição do token antigo.
- Worker antigo finaliza após pausa, edição ou exclusão: não altera o estado atual.
- Duas falhas concluídas: check e incidente consistentes na mesma transação.
- Criações simultâneas não ultrapassam limite de monitores por usuário.
- Publicação rejeita monitor de outro proprietário e campos privados não aparecem na resposta.
- Retenção remove apenas resultados expirados e preserva incidentes/execuções ativas.
- Todas as migrations aplicam em banco vazio; testar restore antes do deploy.

Usar banco descartável separado do ambiente de desenvolvimento/produção. Não executar limpeza de dados contra DATABASE_URL de produção.

## E2E: jornadas críticas

1. Usuário autenticado cria monitor, aguarda check real do fixture e consulta histórico.
2. Fixture falha duas vezes e recupera; incidente aparece e fecha.
3. Usuário pausa/retoma e edita URL; estado respeita as regras.
4. Usuário publica seleção; visitante vê apenas informações permitidas; despublicação retorna 404.
5. Segundo usuário recebe 404/negação em dados privados do primeiro, incluindo mutations.
6. Fluxo vazio e formulário inválido funcionam em mobile e teclado.

Fixtures de sessão são exclusivas de testes e não podem ser ativadas no build de produção. Smoke test do GitHub OAuth real no ambiente de staging, sem usar conta pessoal em CI.

## CI e critérios de release

No scaffold, adicionar lint, typecheck, testes unitários e build. Integração usa serviço PostgreSQL; E2E roda após web e worker estarem disponíveis. Secret scanning e dependency review conforme recursos do repositório, sem badges fictícios.

Release exige todos os checks aplicáveis passando, migrações testadas, smoke test no deploy, worker com heartbeat recente, coleta real, página pública sanitizada e README validado de checkout limpo.

Teste de capacidade: 100 monitores, concorrência 5, endpoints com latência normal e timeouts. Medir p95 do atraso da agenda, memória e crescimento do banco. Ajustar limite do demo ao resultado; não presumir que timeout de todos os monitores cabe na meta.

## Revisão visual de outubro de 2026

A suíte de apresentação verifica navegação da página inicial pelo teclado, foco visível, preferência por movimento reduzido, carregamento dos favicons SVG/ICO e ausência de overflow em 360/768 px na apresentação e login. Capturas são salvas em `test-results/`, ignorado pelo Git, para inspeção visual. As jornadas de monitoramento continuam cobrindo detalhe e status público com dados reais de um worker de testes.

Esta revisão passou 102 testes unitários, 44 de integração PostgreSQL e 12 jornadas de navegador, além de lint, tipos, build de produção e smoke dos processos. As medições de desempenho em hospedagem e o login OAuth real continuam pendentes da configuração do ambiente; não são inferidos desses resultados.

## Validação dos temas

A suíte de apresentação também cobre tema do dispositivo, escolha manual persistida após recarregar, navegação entre rotas, sincronização entre abas e armazenamento bloqueado. Uma jornada impede o carregamento dos arquivos JavaScript do React para comprovar que o tema salvo é aplicado pelo script inicial. O console é observado durante a navegação normal para detectar avisos de hidratação.

Formulário privado em 360 px, histórico e página pública são capturados no tema escuro. A suíte atual possui 102 testes unitários, 44 de integração e 15 jornadas de navegador. Esses testes usam somente o banco descartável indicado por `TEST_DATABASE_URL`.
