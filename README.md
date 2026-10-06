# LinkWatch

Monitor de disponibilidade para sites e APIs HTTP. Cadastre um endpoint, acompanhe a disponibilidade e a latência, investigue incidentes e compartilhe uma página pública de status.

**Estado do projeto:** entregas M0 a M3 implementadas. O worker executa verificações HTTP seguras e registra incidentes e recuperações. O painel apresenta métricas reais e gráficos; a publicação de serviços selecionados está disponível. O login GitHub funciona em ambientes configurados, mas o ciclo OAuth real ainda precisa de credenciais locais e validação manual. Deploy, testes de capacidade e alertas continuam planejados.

## Funcionalidades disponíveis

- Interface em português com temas claro e escuro, cores compartilhadas e favicons SVG/ICO.
- Tema inicial conforme o dispositivo, seletor nos cabeçalhos e preferência salva no navegador.
- Apresentação com exemplo identificado, animações curtas em CSS e respeito à preferência por movimento reduzido.
- Login GitHub, sessões no banco, rotas privadas e encerramento da sessão ao sair.
- Cadastro, edição, pausa, retomada e exclusão de monitores com validação no servidor.
- Isolamento entre usuários, limite configurável de monitores e detecção de alterações concorrentes.
- Banco PostgreSQL com Prisma 7, migrations versionadas e restrições de domínio.
- Worker independente com até cinco verificações concorrentes, reservas no banco, recuperação após falhas e encerramento controlado.
- Validação de DNS e do IP da conexão, TLS verificado, tempo limite total e ausência de redirecionamentos ou download do corpo da resposta.
- Incidentes registrados na mesma transação das verificações, confirmados após duas falhas consecutivas e resolvidos após um sucesso.
- Histórico de 24 horas, 7 dias e 30 dias, disponibilidade observada, latência média e p95.
- Gráficos com lacunas reais, marcas de falhas e erros de coleta, controle por teclado e tabela alternativa.
- Página pública opcional com seleção explícita dos serviços, nomes públicos, alteração de endereço e despublicação.
- Dados públicos sem URLs monitoradas, identidade do dono, IDs internos, credenciais ou erros técnicos.
- Retenção de verificações concluídas por 30 dias; incidentes permanecem enquanto o monitor existir.
- Endpoints de saúde da aplicação e do banco, testes automatizados e CI no GitHub Actions.

## Por que este projeto

O LinkWatch explora decisões de uma ferramenta de monitoramento: agendamento em segundo plano, concorrência entre workers, transições de incidentes, métricas com significado claro, isolamento dos dados e segurança das requisições HTTP.

## Próximas entregas

- Hospedagem da aplicação e do worker, com backups e teste de restauração.
- Validação do login OAuth real, capacidade e atraso do agendamento.
- Demonstração pública, capturas e gravação do fluxo de queda e recuperação.
- Alertas por Discord e, depois, e-mail.

Múltiplas regiões, cobrança, equipes e testes completos de navegador em endpoints monitorados ficam fora do escopo inicial.

## Tecnologias

| Camada | Escolha | Finalidade |
| --- | --- | --- |
| Web | Next.js 16, React 19 e TypeScript | Painel privado e gestão de monitores |
| Worker | Node.js 24, TypeScript e tsx | Agendamento, coleta, incidentes e retenção |
| Dados | PostgreSQL, Prisma 7 e adaptador pg | Persistência, migrations e reservas de execução |
| Autenticação | Auth.js v5 beta, adaptador Prisma e GitHub OAuth | Sessões no banco e login pelo GitHub |
| Interface | Tailwind CSS 4 e variáveis CSS | Layout responsivo e temas |
| Validação | Vitest 5, PostgreSQL, Playwright e testes de processos | Regras, segurança, isolamento e jornadas completas |

As versões exatas estão fixadas em `package.json` e `package-lock.json`. A hospedagem deve permitir um worker em execução contínua; o monitoramento não depende de um cron diário.

## Documentação

- [Requisitos do produto](docs/PRODUCT.md): escopo, regras e critérios de aceite.
- [Design da interface](docs/DESIGN.md): referências, cores, temas, composição e acessibilidade.
- [Arquitetura](docs/ARCHITECTURE.md): divisão entre aplicação web e worker.
- [Modelo do banco](docs/DATABASE.md): entidades, relações, restrições e índices.
- [Backlog](docs/BACKLOG.md): entregas e tarefas planejadas.
- [Estratégia de testes](docs/TESTING.md): validação e critérios de release.
- [Revisão de segurança](docs/SECURITY.md): proteções verificadas, correções e pendências antes do deploy público.
- [Decisão sobre o worker](docs/adr/0001-separate-monitoring-worker.md): por que a coleta usa um processo separado.
- [Guia da fundação](docs/LEARNING.md): estrutura inicial e evolução por commits.
- [Guia de M1](docs/LEARNING_M1.md): autenticação, autorização e alterações de dados.
- [Guia de M2](docs/LEARNING_M2.md): DNS, reservas, incidentes, métricas e retenção.
- [Guia de M3](docs/LEARNING_M3.md): gráficos, publicação, privacidade e jornadas com worker.
- [Configuração do GitHub OAuth](docs/OAUTH_SETUP.md): criação da OAuth App e credenciais locais.

Interface, README e documentação do produto usam português. Repositório: [samuelsce/LinkWatch](https://github.com/samuelsce/LinkWatch).

## Desenvolvimento local

Requisitos: Node.js 24, npm, Git e PostgreSQL. Docker Compose é opcional; `compose.yaml` fornece PostgreSQL 17 para desenvolvimento. As credenciais desse arquivo são exemplos locais e não devem ser usadas em produção.

```bash
git clone https://github.com/samuelsce/LinkWatch.git
cd LinkWatch
npm ci
```

Prepare o arquivo `.env` e gere um segredo de sessão sem exibi-lo:

```bash
node scripts/setup-local-env.mjs
```

Configure `DATABASE_URL` e as credenciais GitHub OAuth no `.env`, seguindo o [guia de configuração](docs/OAUTH_SETUP.md). O script preserva os valores existentes. Use `http://localhost:3000` de forma consistente no OAuth, sem alternar com `127.0.0.1`.

Com Docker instalado:

```bash
docker compose up -d db
npm run db:deploy
npm run dev
```

Sem Docker, configure um banco PostgreSQL existente no `.env`, aplique as migrations com `npm run db:deploy` e execute `npm run dev`. A aplicação fica disponível em [localhost:3000](http://localhost:3000).

Em um segundo terminal:

```bash
npm run worker:dev
```

O worker consulta monitores vencidos a cada cinco segundos e reserva apenas as vagas disponíveis, com limite de cinco verificações por processo. Depois de concluir, agenda a próxima coleta usando o horário do banco e o intervalo configurado. Cada ciclo registra um sinal de atividade no banco. Use um `WORKER_ID` diferente para cada processo.

`npm run worker:start` executa sem observar alterações de arquivos. Atualmente, exige dependências de desenvolvimento como tsx e Prisma CLI; o empacotamento de produção faz parte da entrega M4.

## Como usar

Com as migrations aplicadas, aplicação web e worker ativos, entre pelo GitHub e cadastre um site ou endpoint público. Abra o monitor e recarregue a página para acompanhar verificações e incidentes.

O código HTTP esperado começa em 200. O monitoramento usa GET em HTTP/HTTPS, portas 80/443, sem seguir redirecionamentos. Não há suporte a headers personalizados, cookies, credenciais ou corpos de requisição. A validação TLS e as restrições de destinos internos permanecem ativas.

Em `/status-page`, defina título, descrição e endereço, selecione os serviços e revise seus nomes públicos. A página começa despublicada. Publicar libera `/status/seu-slug` sem login. Despublicar retorna 404; alterar o slug faz o endereço anterior retornar 404. Título, descrição e nomes públicos devem conter somente informações que você deseja compartilhar. A atualização ocorre ao recarregar a página.

O seletor de tema aparece nos cabeçalhos da apresentação, login, painel e página pública. Sem escolha salva, o tema acompanha o dispositivo. A escolha manual é mantida entre visitas e sincronizada entre abas. Se o navegador bloquear o armazenamento, a troca continua funcionando durante a visita.

Ao encerrar, o worker para de reservar tarefas, aguarda até 20 segundos antes de cancelar requisições ativas e espera a persistência. Após uma falha de processo, a mesma requisição HTTP pode ocorrer novamente. O controle das reservas impede duas conclusões para um único ciclo agendado; não garante uma única chamada externa.

`db:deploy` aplica migrations existentes. `db:migrate` cria uma migration quando o schema muda durante o desenvolvimento. Salve schema e migration juntos; nunca altere uma migration já aplicada ou publicada.

## Validação

```bash
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run build
```

A geração do cliente e o build não precisam de banco ativo nem credenciais de banco. `/api/health/ready` retorna 503 quando PostgreSQL está indisponível; `/api/health/live` pode continuar retornando 200.

Integração, navegador e testes de processos exigem um **banco descartável separado**, configurado exclusivamente por `TEST_DATABASE_URL`. Nunca use o banco da aplicação como substituto.

Com Compose, crie o banco de testes uma vez:

```bash
docker compose exec db psql -U linkwatch -d postgres -c "CREATE DATABASE linkwatch_test;"
```

No PowerShell:

```powershell
$env:TEST_DATABASE_URL = "postgresql://linkwatch:linkwatch@localhost:5432/linkwatch_test"
npm run test:integration
npm run build
npm run test:smoke
```

No macOS/Linux, defina a mesma URL com `export TEST_DATABASE_URL=...`. A integração aplica as migrations no banco de testes e remove apenas os próprios dados de teste. O teste de processos inicia e encerra uma aplicação web de produção e um worker.

Para as jornadas de navegador, mantenha `TEST_DATABASE_URL` configurada:

```bash
npm exec -- playwright install chromium
npm run test:integration
npm run build
npm run test:e2e
```

As sessões de teste são registros normais no banco; a aplicação não tem rota especial de login nem desvio de autenticação. A saída para GitHub é interceptada durante o teste. O retorno OAuth real precisa de validação manual após configurar as credenciais.

A suíte cobre segurança de URLs, concorrência, isolamento, alterações de monitores, incidentes, privacidade da publicação, alteração de slug, despublicação, teclado, temas e telas estreitas. Uma jornada executa um worker separado contra um servidor HTTP isolado para observar queda e recuperação reais. Localmente usamos Edge; a CI usa Chromium e PostgreSQL 17. Consulte os resultados em [GitHub Actions](https://github.com/samuelsce/LinkWatch/actions).

## Significado das métricas e limites

Disponibilidade observada é a proporção de verificações bem-sucedidas sobre verificações concluídas de endpoint. Não representa disponibilidade contínua medida em tempo nem SLA. Erros operacionais e períodos sem coleta ficam fora do cálculo e são informados separadamente.

Latência média e p95 usam somente sucessos. O p95 segue nearest-rank, calculado sobre todas as amostras bem-sucedidas da janela, sem usar médias dos agrupamentos. As tabelas mostram até 50 verificações e 20 incidentes; verificações expiram após 30 dias, enquanto incidentes permanecem.

O gráfico agrupa em cinco minutos para 24 horas, uma hora para 7 dias e seis horas para 30 dias, alinhados em UTC. Lacunas interrompem a linha; falhas não viram sucessos com latência zero. A página pública mostra disponibilidade de 24 horas e até dez incidentes por serviço. Seleções vazias ou somente com serviços pausados não afirmam que tudo está operacional.

A meta de 100 monitores e o atraso esperado do agendamento ainda precisam de teste de carga antes do deploy.

## Notas sobre dependências

`@eslint/compat` adapta os plugins Next.js ao ESLint 10 enquanto as versões declaradas pelos plugins ainda apontam para versões anteriores. O npm pode mostrar avisos de compatibilidade; lint e instalação limpa são verificados. As substituições de `deepmerge-ts` e `mysql2` fixam versões corrigidas de dependências da Prisma CLI. Reavalie ao atualizar essas ferramentas.

O auxiliar de busca de diretórios do plugin ESLint do Next.js usa um [adaptador local com tinyglobby](tooling/next-root-glob/README.md), removendo a dependência vulnerável de braces documentada em [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Os presets de lint e a auditoria completa continuam ativos. Quatro testes exercitam diretórios padrão, literais, padrões e listas. Reavalie essa substituição ao atualizar Next.js.

## Preparação para publicação

- [x] Painel autenticado e worker implementados; login OAuth real ainda exige configuração e validação manual.
- [x] Testes de segurança de URLs, isolamento, incidentes e concorrência.
- [x] Instalação reproduzível e explicação da arquitetura.
- [ ] Demonstração pública com dados de exemplo identificados.
- [ ] Aplicação hospedada, worker saudável, backups e restauração validada.
- [ ] Testes de capacidade e atraso do agendamento.
- [ ] Capturas e gravação da demonstração.
- [ ] Custos de operação documentados.
- [ ] Licença escolhida antes da publicação do primeiro release.

Números de desempenho, afirmações de uptime, badges e links de demonstração só serão publicados após validação.
