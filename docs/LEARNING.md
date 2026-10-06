# Aprendendo com a fundação do LinkWatch

Registro histórico da entrega M0. O texto descreve o estado naquele momento. Para executar ou avaliar a versão atual, consulte o [índice da documentação](README.md) e o [guia de desenvolvimento](DESENVOLVIMENTO.md).

Esta entrega é M0: preparar uma base executável e verificável. Login e monitoramento real entram depois. O objetivo é entender cada camada antes de juntar as funcionalidades.

## O que cada commit representa

1. **Planejamento:** requisitos, arquitetura, design, modelo lógico e backlog.
2. **Scaffold web:** Next.js, TypeScript, Tailwind, lint, ferramentas de teste e lockfile.
3. **Banco:** schema Prisma, migrations, restrições PostgreSQL, acesso ao banco e readiness.
4. **Worker:** processo separado, heartbeat, tratamento de sinais e testes de ciclo de vida.
5. **CI:** a verificação que roda automaticamente no GitHub e smoke dos processos.
6. **Documentação:** instruções atualizadas e este guia.
7. **Ajuste do ambiente de desenvolvimento:** excluir `next-env.d.ts` gerado do versionamento e impedir que `next dev` reescreva automaticamente o acordo de trabalho em AGENTS.md.

Um commit agrupa uma mudança coerente. Evitamos juntar banco, UI e worker num commit gigante porque isso dificulta revisão, aprendizado e investigação de bugs. Para explorar:

```bash
git log --oneline
git show --stat c7c4ad8
git show c7c4ad8 -- prisma/schema.prisma
```

O hash identifica uma versão específica. `git show` só lê o histórico; você pode estudar sem mudar os arquivos.

## Web: por que Next.js?

`src/app/page.tsx` é a página inicial; `layout.tsx` define idioma, metadados e estrutura compartilhada. O App Router transforma diretórios em rotas. A página inicial é renderizada sem JavaScript interativo desnecessário; componentes cliente serão usados quando precisarmos de interação.

`src/app/api/health/live/route.ts` é uma rota HTTP. Ela devolve JSON e ajuda a verificar se o servidor responde. Não depende do banco.

O TypeScript checa tipos antes de executar; não valida automaticamente dados de formulários ou requisições. Por isso a futura entrada de usuários precisará de validação de runtime, além dos tipos.

`next-env.d.ts` é gerado pelo Next.js e muda entre desenvolvimento e build. Ele fica fora do Git; `next typegen`, `next dev` e `next build` o recriam. Isso evita que simplesmente iniciar a aplicação produza uma alteração pendente no repositório.

## Banco: schema, client e migration são coisas diferentes

`prisma/schema.prisma` descreve os modelos. `prisma generate` produz um client TypeScript com métodos como `database.monitor.create(...)`. O client é gerado em `src/generated/prisma` e fica fora do Git porque pode ser reconstruído.

Uma migration é SQL versionado que muda o banco. `prisma/migrations/..._initial/migration.sql` cria as tabelas. A migration seguinte adiciona restrições que não estão todas expressas no schema Prisma.

Exemplo: o índice parcial de Incident só considera linhas com `endedAt IS NULL`. Como ele é único por monitor, PostgreSQL permite muitos incidentes históricos, mas apenas um aberto. Um teste faz duas gravações concorrentes e confirma que só uma vence.

Outra regra usa chaves estrangeiras compostas: a seleção pública combina ID e ownerId. Assim, o banco rejeita a associação de uma página ao monitor de outra pessoa. Isso reforça a validação de propriedade que ainda será implementada no servidor.

`src/db/client.ts` configura o adapter PostgreSQL; `src/server/db.ts` mantém um client reutilizável na web e impede sua importação em componentes cliente. A criação é tardia: a página estática pode ser compilada sem credenciais do banco.

## Worker: por que outro processo?

O worker entra por `src/worker/index.ts`. Hoje ele escreve somente heartbeat; o scheduler e o probe HTTP ainda não existem. Sua independência permite executar tarefas mesmo sem visitantes.

`src/worker/loop.ts` espera cada heartbeat terminar antes de iniciar outro. Não usamos um `setInterval` com callback assíncrono que poderia acumular operações lentas.

Ao receber SIGINT/SIGTERM, um AbortController interrompe a espera, evita uma nova iteração e permite fechar a conexão. SIGINT corresponde normalmente a Ctrl+C no terminal. A primeira conexão precisa funcionar para o worker anunciar que iniciou; uma falha posterior é registrada sem expor detalhes privados do driver.

O heartbeat usa o relógio do PostgreSQL. Quando o scheduler existir, vamos comparar horários de agenda no mesmo relógio para reduzir divergências entre máquinas.

## Testes: o que foi comprovado?

- **Unitários:** configuração inválida não vaza credenciais; worker rejeita falha no início, tolera falha temporária e encerra corretamente.
- **Integração:** Prisma conversa com PostgreSQL real; constraints, chaves estrangeiras, cascades, unicidade e heartbeat funcionam.
- **Smoke:** inicia a web de produção e o worker como processos reais; confirma página, live, ready e heartbeat.

Um mock de banco não comprovaria um índice PostgreSQL. Por isso testamos as restrições no banco. Os testes exigem TEST_DATABASE_URL explícita e removem apenas seus próprios registros.

Como Docker não estava disponível nesta máquina, a validação local usou PostgreSQL 18 temporário dentro de uma pasta ignorada, encerrado ao final. Essa ferramenta não é dependência do projeto. No CI, um container PostgreSQL 17 fornece o banco de teste.

## CI: quem executa os comandos?

`.github/workflows/ci.yml` descreve os passos para uma máquina temporária do GitHub Actions. Ela baixa o código, prepara Node, instala o lockfile, verifica o schema, executa lint/tipos/testes e compila. Depois inicia web e worker para o smoke.

CI significa integração contínua: verificar automaticamente se uma alteração mantém o projeto saudável. Não é deploy; esta entrega não publica a aplicação na internet.

## Experimentos seguros para você fazer

1. Rode `npm run dev` e altere o título em `src/app/page.tsx`. Observe a atualização no navegador e revise `git diff`.
2. Com o banco local configurado, compare `/api/health/live` com `/api/health/ready` antes e depois de parar **seu banco local**.
3. Rode `npm test` e leia os casos em `tests/unit/worker-loop.test.ts` junto com o loop.
4. Leia as duas migrations e procure `Incident_one_open_per_monitor_idx`.
5. Abra Actions no GitHub e compare cada etapa com os scripts de `package.json`.

Próxima entrega: login GitHub, proteção de dados por proprietário e cadastro de monitores. Ainda não será necessário implementar gráficos para provar esse fluxo.
