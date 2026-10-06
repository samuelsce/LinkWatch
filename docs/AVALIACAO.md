# Guia de avaliação do LinkWatch

O LinkWatch é um projeto de portfólio full stack para acompanhar sites e APIs públicas. Este guia facilita a avaliação do produto e das decisões técnicas sem exigir a leitura de todo o repositório.

## Primeira leitura: dois minutos

1. Veja as [capturas da interface](screenshots/README.md) e a apresentação no [README principal](../README.md).
2. Consulte a tabela abaixo para escolher um problema técnico que você queira inspecionar.
3. Abra a [arquitetura](ARCHITECTURE.md) e o [workflow de validação](../.github/workflows/ci.yml).

Web, worker, incidentes, métricas e publicação estão implementados. A avaliação disponível é local. Deploy, capacidade e retorno OAuth real continuam pendentes; capturas e sessões de testes não comprovam essas etapas.

## Roteiro do produto

Para conferir apenas a apresentação, siga a [prévia local](DESENVOLVIMENTO.md#prévia-visual). Para o fluxo completo, prepare banco, OAuth e worker conforme o [guia de desenvolvimento](DESENVOLVIMENTO.md).

1. **Entrar e cadastrar.** Entre com GitHub, crie um monitor para um endpoint público sob seu controle e confira a primeira observação. O estado inicial deve informar que a verificação ainda não ocorreu.
2. **Investigar.** Abra o detalhe, navegue entre 24 horas, 7 dias e 30 dias e compare gráfico, amostras, média e p95. Um período sem observações não deve parecer 100% disponível.
3. **Acompanhar uma falha.** Em um endpoint de teste que você controle, devolva o código diferente do esperado em duas coletas consecutivas. A primeira deixa instável; a segunda abre um incidente. Volte ao código esperado para observar a recuperação. Não simule uma queda em serviço de terceiros.
4. **Pausar e retomar.** Pause o monitor e recarregue o painel. A pausa não equivale à recuperação de um incidente. Retomar agenda uma observação imediata.
5. **Publicar.** Selecione serviços em Página de status, revise título e nomes públicos e publique. Em uma janela sem sessão, confira a ausência das URLs privadas. Despublique e confirme que o endereço retorna 404.

A aplicação exige recarregar a página para ver novas observações. Ela não implementa alertas nem atualização em tempo real nesta versão.

## Evidências no código

| Questão | Implementação | Validação |
| --- | --- | --- |
| Como impedir acesso entre contas? | [Sessão](../src/server/session.ts), [serviço de monitores](../src/features/monitors/service.ts) e [ações](../src/app/(private)/monitors/actions.ts) | [Integração do serviço](../tests/integration/monitor-service.test.ts), [jornadas com duas contas](../tests/e2e/monitors.spec.ts) |
| Como coletar sem depender da página aberta? | [Runtime do worker](../src/worker/runtime.ts) e [loop](../src/worker/loop.ts) | [Ciclo do worker](../tests/integration/worker-cycle.test.ts), [smoke dos processos](../scripts/smoke.mjs) |
| Como lidar com workers concorrentes e atrasados? | [Scheduler](../src/monitoring/scheduler.ts) e [restrição de ciclo ativo](../prisma/migrations/20261002190000_one_active_check/migration.sql) | [Disputa, expiração e conclusão antiga](../tests/integration/scheduler.test.ts) |
| Como evitar que uma URL alcance rede interna? | [Entrada do monitor](../src/domain/monitor-input.ts) e [probe](../src/monitoring/probe.ts) | [DNS e classificação](../tests/unit/probe.test.ts), [sockets HTTP/TLS](../tests/integration/probe-http.test.ts) |
| Como tornar incidentes consistentes com a coleta? | [Transições puras](../src/domain/check-transition.ts) e transação de conclusão no scheduler | [Regras de estado](../tests/unit/check-transition.test.ts), [ciclo transacional](../tests/integration/worker-cycle.test.ts) |
| Como evitar métricas enganosas? | [Histórico](../src/features/monitors/history.ts) e [estado visível](../src/domain/visible-status.ts) | [Amostras e percentis](../tests/integration/scheduler.test.ts), [resumo de estados](../tests/unit/status-pages.test.ts) |
| Como publicar sem serializar dados privados? | [Projeção pública](../src/features/status-pages/public.ts) e [serviço de publicação](../src/features/status-pages/service.ts) | [Publicação no banco](../tests/integration/status-pages.test.ts), [visitante sem sessão](../tests/e2e/monitors.spec.ts) |
| Como manter a interface acessível e responsiva? | [Tema](../src/components/theme-toggle.tsx), [gráfico](../src/components/latency-chart.tsx) e [CSS](../src/app/globals.css) | [Apresentação e temas](../tests/e2e/presentation.spec.ts), [cabeçalhos e iframe](../tests/e2e/security.spec.ts) |

## O que a validação demonstra

O CI executa instalação pelo lockfile, validação do schema, lint, tipos, testes unitários, integração PostgreSQL/rede, build, navegador, smoke e auditoria de dependências. A [execução da revisão visual](https://github.com/samuelsce/LinkWatch/actions/runs/37405090355) aprovou 102 testes unitários, 44 de integração e 18 jornadas de navegador.

As jornadas usam sessões normais no banco e um provider configurado com credenciais fictícias. Elas verificam proteção e navegação de saída para o GitHub; não executam a autorização completa no provedor. Não existe rota especial para entrar como usuário de teste no produto.

Fixtures de rede são isoladas e injetadas pelo código de testes. O worker de produção continua rejeitando localhost, redes internas e certificados inválidos. Capturas com registros fictícios são evidências da interface, não da disponibilidade de um serviço público.

## Limites para discutir em uma avaliação técnica

- Uma requisição HTTP pode se repetir após falha de processo. O controle garante uma conclusão persistida por ciclo, não exatamente uma chamada externa.
- O banco participa do agendamento. Uma fila adicional pode fazer sentido em outra escala, mas essa necessidade ainda não foi demonstrada.
- Disponibilidade representa amostras concluídas, não SLA. Erros do coletor e períodos sem observação são tratados separadamente.
- Cinco vagas de coleta por worker e dez monitores por conta não estabelecem capacidade global nem proteção completa contra abuso.
- A CSP atual restringe iframe, base e objetos ativos; ainda não é uma política estrita de execução de scripts.
- Produção exige confirmar OAuth, rede, HTTPS, limites de entrada, capacidade, backup e restauração. Veja [segurança](SECURITY.md) e [backlog](BACKLOG.md).

## Autoria e histórico

Projeto de [@samuelsce](https://github.com/samuelsce), construído em entregas pequenas, com apoio de um assistente de IA. A [sequência de aprendizado](README.md#histórico-e-aprendizado) registra o contexto das decisões. O histórico Git permite inspecionar cada mudança e as validações documentadas.
