# Desenvolvimento do LinkWatch

Este guia descreve os comandos disponíveis hoje. Web, worker e PostgreSQL são processos separados. O build e a apresentação inicial podem funcionar sem banco ativo; as rotas autenticadas, a coleta e a publicação exigem configuração completa.

## Requisitos

- Git, Node.js 24 e npm. A versão de Node está em [`.node-version`](../.node-version).
- PostgreSQL para o produto completo. [Compose](../compose.yaml) fornece PostgreSQL 17 para desenvolvimento; Docker é opcional.
- Uma GitHub OAuth App para entrar pelo provedor. Siga o [guia do OAuth](OAUTH_SETUP.md).

## Instalar e preparar o ambiente

```sh
git clone https://github.com/samuelsce/LinkWatch.git
cd LinkWatch
npm ci
node scripts/setup-local-env.mjs
```

O último comando prepara `.env` a partir de [`.env.example`](../.env.example) quando necessário e gera `AUTH_SECRET` sem exibi-lo. Valores existentes são preservados. Credenciais, cliente Prisma gerado, dependências e saída de build ficam fora do Git.

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | Banco da aplicação, com protocolo PostgreSQL e nome de banco |
| `AUTH_SECRET` | Segredo gerado para autenticação; não usar uma senha curta |
| `AUTH_URL` | Origem canônica, localmente `http://localhost:3000` |
| `AUTH_GITHUB_ID` e `AUTH_GITHUB_SECRET` | Credenciais da OAuth App correspondente ao ambiente |
| `AUTH_TRUST_HOST` | Em produção, habilitar apenas com host/proxy controlado; veja [segurança](SECURITY.md) |
| `WORKER_ID` | Identificador diferente para cada processo worker |
| `MONITOR_LIMIT` | Limite por conta, padrão 10; valores aceitos de 1 a 100 |
| `TEST_DATABASE_URL` | Banco descartável exclusivo de integração, E2E e smoke; variável do ambiente de testes |

`MONITOR_LIMIT` não é um limite global nem uma medida de capacidade validada. Não use o mesmo banco para `DATABASE_URL` e `TEST_DATABASE_URL` no seu ambiente de desenvolvimento.

## Prévia visual

```sh
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Você consegue avaliar a apresentação, o tema, a marca, os favicons e o comportamento mobile sem cadastrar monitores. Os números da apresentação são ilustrativos. Sem OAuth configurado, o login informa a configuração necessária.

Mantenha o terminal aberto. Alterações no código atualizam a aplicação durante o desenvolvimento. `Ctrl + C` encerra o processo.

## Produto completo

### Banco

Com Docker instalado:

```sh
docker compose up -d db
```

As credenciais do Compose são exemplos locais. Sem Docker, crie um banco PostgreSQL e configure a URL em `.env`. Não exponha a porta do banco em produção.

Depois de configurar `DATABASE_URL`:

```sh
npm run db:deploy
```

`db:deploy` aplica as migrations versionadas. Ao alterar o schema em desenvolvimento, use `npm run db:migrate`, revise o SQL e versione schema e nova migration juntos. Não edite migrations já aplicadas ou publicadas. `npm run db:generate` recompõe o cliente Prisma; esse código gerado não é versionado.

### Login e aplicação web

Configure a OAuth App e as credenciais conforme [OAUTH_SETUP.md](OAUTH_SETUP.md). Use `localhost` de forma consistente no endereço e callback; `127.0.0.1` é outra origem para cookies e OAuth. Reinicie a web após alterar `.env`.

```sh
npm run dev
```

O retorno OAuth real precisa ser testado manualmente depois da configuração. As jornadas automatizadas não substituem essa etapa.

### Worker em outro terminal

```sh
npm run worker:dev
```

O worker consulta vencimentos a cada cinco segundos e reserva até cinco tarefas simultâneas por processo. Mantém heartbeat, registra resultados/incidentes e executa retenção. Fechar o painel não interrompe a coleta; encerrar o worker interrompe novas verificações.

No encerramento, ele deixa de reservar tarefas, aguarda até 20 segundos e cancela requisições restantes, aguardando a persistência. Reservas não concluídas podem ser retomadas após expirar. Use um `WORKER_ID` distinto por processo.

## Build e execução sem observação de arquivos

```sh
npm run build
npm run start
```

Em outro terminal:

```sh
npm run worker:start
```

Build e geração de cliente não exigem banco ativo. `start` usa o build já gerado; `worker:start` executa o entrypoint TypeScript sem observar arquivos. O worker atualmente depende de `tsx` e Prisma CLI, classificados como ferramentas de desenvolvimento. Não presumir que `npm ci --omit=dev` seja suficiente para empacotar esse processo. A configuração de hospedagem ainda está pendente.

## Verificação rápida

```sh
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

`typecheck` gera o cliente Prisma e os tipos do Next.js antes de verificar o TypeScript. Consulte [TESTING.md](TESTING.md) para interpretar o que cada camada de teste demonstra.

## Testes com banco descartável

Use um banco separado que possa receber migrations e dados de teste. Os scripts exigem `TEST_DATABASE_URL` explicitamente; não fazem fallback para o banco da aplicação.

Com o PostgreSQL local do Compose, crie esse banco uma vez:

```sh
docker compose exec db psql -U linkwatch -d postgres -c "CREATE DATABASE linkwatch_test;"
```

No PowerShell:

```powershell
$env:TEST_DATABASE_URL = "postgresql://linkwatch:linkwatch@localhost:5432/linkwatch_test"
```

No macOS/Linux:

```sh
export TEST_DATABASE_URL="postgresql://linkwatch:linkwatch@localhost:5432/linkwatch_test"
```

Essas URLs usam as credenciais locais do Compose; substitua-as se o seu banco de testes for diferente. Depois, no mesmo terminal:

```sh
npm run test:integration
npm run build
npm exec -- playwright install chromium
npm run test:e2e
npm run test:smoke
```

A integração gera o cliente, aplica migrations no banco indicado e executa testes PostgreSQL/rede. E2E inicia a web de produção na porta 3100, usa sessões inseridas no banco e intercepta a saída para o GitHub. Smoke inicia web e worker e verifica readiness e heartbeat. Os scripts removem os próprios registros de teste e encerram os processos que iniciam.

O CI usa Chromium. Para usar um Edge instalado no Windows, defina `$env:PLAYWRIGHT_CHANNEL = "msedge"` antes de E2E. Isso é uma opção de ambiente local, não certificação de outro navegador.

## Diagnóstico

| Sintoma | O que conferir |
| --- | --- |
| Login informa falta de configuração | `AUTH_SECRET`, ID/secret da OAuth App e reinício da web |
| GitHub rejeita o callback | Origem e porta exatas no `AUTH_URL` e no cadastro da OAuth App |
| Banco indisponível | Processo PostgreSQL, nome do banco, URL e migrations |
| Monitor continua aguardando | Worker ativo, URL pública válida, horário agendado e logs sanitizados |
| Monitor não segue um 301/302 | Comportamento esperado: redirects não são seguidos; cadastre o endereço final |
| Dashboard não mostra a coleta mais recente | Recarregue a página; não há atualização em tempo real |
| E2E não inicia | `TEST_DATABASE_URL`, migrations, build, navegador instalado e porta 3100 livre |

`/api/health/live` informa que a web responde. `/api/health/ready` consulta o banco e retorna 503 quando ele não está disponível. Heartbeat do worker indica atividade do scheduler; não é uma verificação do endpoint monitorado.

## Dependências e fluxo de trabalho

As versões estão fixadas no lockfile. `@eslint/compat` adapta os plugins Next ao ESLint 10; overrides de `deepmerge-ts` e `mysql2` acompanham correções nas dependências da Prisma CLI. O [adaptador local de glob](../tooling/next-root-glob/README.md) está limitado ao helper do plugin Next e tem testes próprios. Reavalie essas escolhas ao atualizar as ferramentas, mantendo os presets e a auditoria completos.

Mudanças são registradas por responsabilidade em commits separados, com validação proporcional ao impacto. Alterações no framework devem consultar a documentação da versão instalada em `node_modules/next/dist/docs`. Veja [CONTRIBUTING.md](../CONTRIBUTING.md) e [o histórico de aprendizado](README.md#histórico-e-aprendizado).
