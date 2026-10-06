# Testes e critérios de release

A validação do LinkWatch combina regras puras, PostgreSQL real, rede isolada, navegador e processos. O objetivo é verificar o comportamento relevante de cada camada, incluindo concorrência, isolamento e recuperação de falhas.

A suíte atual contém **102 testes unitários, 44 de integração e 18 jornadas de navegador**, além de smoke dos processos. A [execução da revisão visual](https://github.com/samuelsce/LinkWatch/actions/runs/37405090355) aprovou essas verificações. Os comandos reproduzíveis estão no [guia de desenvolvimento](DESENVOLVIMENTO.md).

## Cobertura por camada

| Camada | Evidência | Arquivos para inspecionar |
| --- | --- | --- |
| Domínio | Falhas consecutivas, recuperação, revisão, estado sem dados e entrada validada | [Transições](../tests/unit/check-transition.test.ts), [entrada](../tests/unit/monitor-input.test.ts), [estados públicos](../tests/unit/status-pages.test.ts) |
| Rede | DNS misto bloqueado, IP fixado, Host preservado, timeout, TLS inválido, redirect sem seguir destino e descarte do corpo | [Probe unitário](../tests/unit/probe.test.ts), [servidores HTTP/TLS isolados](../tests/integration/probe-http.test.ts) |
| Autenticação e dados | Adapter, sessões, propriedade, limites por conta e conflitos de edição | [Adapter](../tests/integration/auth-adapter.test.ts), [serviço](../tests/integration/monitor-service.test.ts), [restrições do banco](../tests/integration/database.test.ts) |
| Coleta | Disputa de reserva, troca de token, revisão antiga, conclusão duplicada, rollback, incidentes e cinco slots | [Scheduler](../tests/integration/scheduler.test.ts), [runtime](../tests/integration/worker-cycle.test.ts) |
| Métricas e retenção | p95 nearest-rank, ausência de amostras, filtros UTC, lacunas e limpeza concorrente | [Histórico e retenção](../tests/integration/scheduler.test.ts) |
| Publicação | Propriedade, seleção, projeção pública, slug único, despublicação e endereço antigo inválido | [Banco](../tests/integration/status-pages.test.ts), [navegador](../tests/e2e/monitors.spec.ts) |
| Interface | Teclado, foco, telas estreitas, favicons, movimento reduzido, temas e armazenamento bloqueado | [Apresentação](../tests/e2e/presentation.spec.ts) |
| Segurança no navegador | Origem externa de Server Action, HTML malicioso armazenado, cabeçalhos e iframe bloqueado | [Jornadas de monitores](../tests/e2e/monitors.spec.ts), [cabeçalhos e iframe](../tests/e2e/security.spec.ts) |
| Processos | Web de produção, readiness PostgreSQL e heartbeat de worker separado | [Smoke](../scripts/smoke.mjs) |
| Tooling | Compatibilidade do helper Next com diretórios padrão, literais, padrões e listas | [Adaptador de glob](../tests/unit/next-root-glob.test.ts) |

## Jornadas no navegador

As jornadas executam o build de produção e incluem:

- Visitante anônimo e sessão expirada bloqueados em rotas privadas.
- Cadastro inválido, cadastro válido, edição, pausa, retomada e exclusão.
- Segunda conta sem acesso ou permissão de alteração nos monitores da primeira.
- Logout com exclusão de sessão e rejeição do cookie antigo.
- POST de Server Action com origem externa sem alteração no banco.
- Publicação por formulário real, seleção estrangeira rejeitada, slug alterado e despublicação.
- Ciclo de queda e recuperação com processo worker, servidor HTTP isolado e visitante sem sessão.
- Texto contendo `script`, `img onerror` e `svg onload` armazenado e exibido como texto inativo.
- Temas do dispositivo, escolha persistida, sincronização entre abas, armazenamento bloqueado e inicialização antes do React.
- Cabeçalhos em páginas, autenticação, saúde, favicon, 404 e redirecionamento privado; iframe recusado pelo navegador.

O teste de iframe usa um servidor local real em outra origem. Assim, o bloqueio da CSP é exercitado sem ser substituído pelo bloqueio de acesso à rede local aplicado a páginas interceptadas pelo navegador.

## Isolamento dos testes

Integração, E2E e smoke exigem `TEST_DATABASE_URL` apontando para um banco descartável separado do banco da aplicação. O script de integração gera o cliente, aplica as migrations nesse banco e executa os testes. Nunca usar uma URL de desenvolvimento ou produção como substituto.

Sessões de navegador são registros normais no banco de teste. A aplicação não tem provider de entrada especial ou rota para assumir uma identidade de teste. A navegação de autorização GitHub é interceptada; o callback completo com credenciais reais ainda exige validação manual.

Resolvers e transportes locais são injetados apenas nos fixtures. Não existe variável de produção para liberar localhost ou desabilitar a validação TLS. Os testes de coleta não dependem da estabilidade de sites de terceiros.

Chromium é usado no CI com PostgreSQL 17. Localmente, as jornadas foram executadas via Edge no Windows. Isso não equivale a testes em todos os navegadores ou dispositivos físicos. Capturas de E2E são artefatos ignorados pelo Git; as imagens selecionadas para o portfólio têm [proveniência própria](screenshots/README.md).

## CI

O [workflow](../.github/workflows/ci.yml) executa, nesta ordem:

1. Instalação reproduzível pelo lockfile e validação do schema.
2. Lint, tipos e testes unitários.
3. Integração PostgreSQL e aplicação das migrations.
4. Build de produção sem credenciais do banco.
5. Instalação do Chromium e jornadas de navegador.
6. Smoke de web/worker e auditoria de dependências.

Actions são fixadas por commit, com permissão `contents: read` e sem persistir credenciais do checkout. Overrides e adaptações de tooling são documentados no [guia de desenvolvimento](DESENVOLVIMENTO.md#dependências-e-fluxo-de-trabalho).

## O que ainda precisa ser validado

- OAuth completo em ambiente configurado.
- HTTPS, cookies, host/proxy e cabeçalhos no domínio público.
- Rate limiting, teto global de monitores e capacidade real do worker.
- Atraso de agendamento, memória e crescimento do banco sob carga.
- Backup e restauração, empacotamento do worker e smoke do deploy.
- Desempenho em dispositivos e redes reais; não foram publicados resultados de Core Web Vitals em produção.

A meta inicial de carga é 100 monitores, concorrência de cinco e p95 de início de coleta até 30 segundos após o vencimento. São metas de projeto, não resultados obtidos. Verificar endpoints rápidos e cenários de timeout antes de definir a capacidade da demonstração.

Release público exige os checks aplicáveis aprovados, migrations testadas, smoke do deploy, worker saudável, coleta real, privacidade da página pública, restauração validada e instruções de um checkout limpo. Veja também [SECURITY.md](SECURITY.md) e [BACKLOG.md](BACKLOG.md).
