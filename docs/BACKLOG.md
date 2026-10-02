# Backlog pronto para GitHub

Issues propostas para [samuelsce/LinkWatch](https://github.com/samuelsce/LinkWatch); nenhuma foi criada no GitHub. A criação remota depende de acesso autenticado à conta. Números abaixo são IDs de planejamento, não números reais de issues.

## GitHub Project proposto

Nome: LinkWatch — Product & Engineering. Colunas: Backlog, Ready, In progress, In review, Done. Campos: Priority (P0/P1/P2), Milestone, Area (web/worker/data/docs/ops) e Size (S/M/L). Labels: feature, bug, security, tests, documentation e infrastructure.

“Ready” exige escopo, critérios de aceite e dependências resolvidas. “Done” exige código revisável, testes aplicáveis e documentação atualizada. Preferir PRs por entrega coerente.

## Issues

| ID | Título | Prioridade / marco | Depende de | Aceite |
| --- | --- | --- | --- | --- |
| LW-01 | Scaffold Next.js/TypeScript e entrypoint do worker | P0 / M0 | — | Scripts dev/build/lint/typecheck; lockfile; worker separado; versões compatíveis |
| LW-02 | PostgreSQL, Prisma e migrations iniciais | P0 / M0 | LW-01 | Schema implementado, índices/restrições, banco local e migration em banco vazio |
| LW-03 | CI e instruções reproduzíveis | P0 / M0 | LW-01, LW-02 | Checks executam e README funciona em checkout limpo |
| LW-04 | Login GitHub e isolamento por proprietário | P0 / M1 | LW-02 | Sessão, logout, consultas/mutations isoladas e testes com dois usuários |
| LW-05 | Cadastro e gestão de monitores | P0 / M1 | LW-04 | Regras R02, estados vazios, limites concorrentes, pausa/revisão |
| LW-06 | Probe HTTP seguro e classificação de resultados | P0 / M2 | LW-01 | Timeout, TLS, SSRF, DNS pinning, sem redirects e testes isolados |
| LW-07 | Scheduler com leases e recuperação | P0 / M2 | LW-02, LW-06 | Reservas concorrentes, fencing, heartbeat e shutdown verificados |
| LW-08 | Transições de estado e incidentes | P0 / M2 | LW-05, LW-07 | Regras R04 e persistência transacional sem incidente duplicado |
| LW-09 | Métricas, agregação e retenção | P1 / M2 | LW-07 | Regras R05, zero dados, p95 correto, limpeza em lotes e testes |
| LW-10 | Dashboard e detalhe com gráficos | P1 / M3 | LW-05, LW-08, LW-09 | Dados reais, teclado/mobile, falhas/lacunas no gráfico e estados de erro |
| LW-11 | Configuração e página pública de status | P1 / M3 | LW-08, LW-09 | Seleção explícita, slug, projeção pública e isolamento testado |
| LW-12 | E2E do ciclo de queda e recuperação | P0 / M3 | LW-10, LW-11 | Fixture controlado verifica jornada completa com worker ativo |
| LW-13 | Deploy, health e backup/restore | P0 / M4 | LW-03, LW-12 | Provedor definido, serviços ativos, smoke test e restore documentados |
| LW-14 | README final, screenshots e demo | P1 / M4 | LW-13 | Evidências reais, setup validado, limitações e decisão de licença |
| LW-15 | Outbox e alertas Discord | P1 / M5 | LW-08, LW-13 | Eventos únicos, segredo protegido, backoff e falha de envio isolada |
| LW-16 | Alertas por e-mail | P2 / M5 | LW-15 | Provedor configurado, destinatário verificado e entregas testadas |

## Ordem inicial

Status da entrega M0: LW-01, LW-02 e LW-03 implementadas. Schema, migrations, web, worker com heartbeat e CI estão versionados; README e guia de aprendizado documentam o ambiente. A validação local passou; o resultado remoto de CI é consultado em GitHub Actions. Os IDs continuam sendo de planejamento; não equivalem a issues criadas.

Status M1: implementação de LW-04/LW-05 disponível, com sessões, CRUD, limites e isolamento validados em PostgreSQL e navegador. O smoke OAuth real permanece pendente da criação/configuração da OAuth App local.

Status M2: LW-06–LW-09 implementadas: probe HTTP/TLS seguro, leases e fencing, incidentes transacionais, métricas UTC e retenção em lotes. Histórico básico foi conectado ao detalhe para conferir os resultados; gráficos, publicação e E2E com worker + navegador permanecem LW-10–LW-12. Testes não comprovam ainda a meta de capacidade/atraso de 100 monitores.

Começar por LW-01 a LW-03. Depois acesso/cadastro; em seguida um ciclo vertical com probe + scheduler + incidente. Só então gráficos, publicação e deploy. Alertas dependem de incidentes confiáveis.

## Corpo sugerido das issues

Usar o template de feature em `.github/ISSUE_TEMPLATE/feature.yml`. Para cada ID acima, incluir os requisitos correspondentes em `docs/PRODUCT.md`, detalhar o aceite em checklist e vincular dependências com números reais após criação. Não transformar um marco inteiro em uma única issue.
