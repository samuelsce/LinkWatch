# Arquitetura proposta

Estado: fundação M0 implementada. Web, schema/migrations, conexão PostgreSQL, readiness e worker com heartbeat estão disponíveis. Os fluxos de agendamento, autenticação e monitoramento abaixo descrevem as próximas entregas.

## Estrutura

Um repositório TypeScript, com aplicação Next.js e um entrypoint Node para o worker. Compartilhar regras de domínio e acesso ao banco; não executar o loop de monitoramento dentro de uma requisição ou importar código de UI no worker. Não adicionar uma API Express ou Redis antes de uma necessidade concreta.

```mermaid
flowchart LR
  U[Usuário] --> W[Next.js: dashboard e autenticação]
  V[Visitante] --> S[Next.js: status público]
  W --> DB[(PostgreSQL)]
  S --> DB
  K[Worker Node: agenda e checks] --> DB
  K --> H[HTTP/HTTPS público]
  K -. etapa M5: outbox .-> N[Discord / e-mail]
```

Estrutura alvo:

```text
src/
  app/                  rotas, páginas e handlers Next.js
  components/           componentes de interface
  features/             monitores, métricas, incidentes e status
  server/               autenticação e acesso privado ao banco
  domain/               regras puras e tipos compartilhados
  monitoring/           URL safety, probe e persistência de resultados
  worker/               scheduler, entrypoint e health
prisma/                 schema e migrações versionadas
tests/                  integração, fixtures HTTP e E2E
docs/                   decisões e especificações
```

## Fluxo de monitoramento

1. A criação do monitor grava nextCheckAt = agora e revisão 1.
2. A cada cinco segundos, o worker reserva apenas tantos monitores vencidos quanto seus slots livres. Usar transação PostgreSQL e `FOR UPDATE SKIP LOCKED`.
3. A reserva cria um CheckRun com scheduledAt, revision, token de lease e vencimento. A combinação monitorId/scheduledAt é única. A lease deve exceder o timeout + margem de persistência.
4. Resolver DNS, validar todos os endereços e fixar o IP permitido no cliente HTTP. Preservar hostname para Host/SNI e validação do certificado.
5. Realizar GET limitado pelo timeout. Não seguir redirects; cancelar/descartar corpo após headers. Classificar resultado sem salvar conteúdo da resposta.
6. Na transação de conclusão, exigir token de lease, validade, configuração vigente e monitor ativo. Persistir o resultado, atualizar estado e incidente. Um worker atrasado não pode publicar após perder a reserva.
7. Agendar o próximo check a partir da conclusão + intervalo. Não criar backlog retroativo. Publicar atraso/lacunas de agenda como métricas do coletor.

Lease expirada: outro worker pode reservar novamente o mesmo CheckRun com um novo token. A chamada HTTP pode se repetir após um crash; a persistência deve ser única. Não prometer exatamente uma chamada externa.

Pausa ou alteração de URL invalida a lease e incrementa a revisão sob lock do monitor. Todos os caminhos de finalização, pausa e edição usam a mesma ordem de locks (monitor, CheckRun) para reduzir deadlocks. Excluir o monitor faz cascade dos dados e impede uma finalização tardia.

Erro interno do coletor grava resultado operacional, sem contaminar disponibilidade do endpoint. Backoff limitado evita loop de erros; a UI mostra perda de coleta quando o limiar de frescor é ultrapassado.

## Autenticação e isolamento

Proposta: Auth.js com GitHub OAuth e adapter Prisma. Confirmar versões compatíveis e o modelo do adapter no scaffold. Proteger dados no servidor, mesmo quando o layout já exige login. Consultas privadas sempre recebem ownerId da sessão, nunca de um campo enviado pelo cliente.

Status público usa uma consulta/projeção própria com allowlist de campos. Não serializar modelos completos. Mutations validam entrada, propriedade, origem/CSRF conforme o mecanismo escolhido e limites por usuário.

## Requisições externas

URLs controladas pelo usuário criam um risco real de SSRF. Não basta validar a string no formulário: o worker precisa validar a resolução e usar o mesmo endereço validado na conexão. Bloquear IPv4/IPv6 privados, loopback, link-local, reservados, IPv4 mapeado em IPv6 e destinos de metadados. Testar formatos alternativos e respostas DNS mistas.

Camada de rede do deploy deve também restringir egress para destinos internos. Nunca remover essa proteção em produção para facilitar demonstrações. Fixtures locais só podem ser habilitadas em um ambiente de testes isolado.

Referência: [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## Retenção e capacidade

Limpeza diária em lotes de checks concluídos há mais de 30 dias; preservar execuções ativas. A tarefa usa uma lease global no banco para não duplicar entre workers. Começar sem particionamento e medir consulta, armazenamento e limpeza.

100 monitores a cada minuto geram aproximadamente 4,32 milhões de checks em 30 dias. Isso é um teto de projeto para validação, não uma promessa de operação gratuita. Começar a demo com poucos monitores e intervalo padrão de cinco minutos.

Métricas são calculadas no servidor. Agregar gráficos em buckets (5 minutos em 24 h, 1 hora em 7 d, 6 horas em 30 d), informando média, amostras e falhas. Calcular p95 do período a partir dos checks, não pela média de percentis dos buckets.

## Operação e deploy

Desenvolvimento: web + worker + PostgreSQL; Docker Compose para o banco se Docker estiver disponível, ou um PostgreSQL acessível por DATABASE_URL. Atualmente Node e Git estão instalados; Docker e GitHub CLI não foram encontrados no PATH.

Produção proposta: web, worker sempre ativo e PostgreSQL, todos na mesma região. Pode ser um host de containers/VPS ou web serverless com worker separado. Selecionar provedor após verificar custos, suspensão por inatividade, backups e egress.

O cron do plano Hobby da Vercel executa no máximo diariamente, portanto não atende a checks de minuto. Essa limitação motiva o worker dedicado: [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).

- Migrações executadas uma vez por release antes de iniciar serviços compatíveis.
- Liveness do processo e readiness da conexão ao banco separados.
- Heartbeat do worker registra última passagem do scheduler; não conta como check de endpoint.
- Shutdown interrompe novas reservas e dá prazo aos checks ativos; reservas restantes expiram.
- Medir atraso de agenda, checks por resultado, leases expiradas e idade do heartbeat.
- Logs estruturados com monitorId/runId e erro sanitizado; segredos ficam fora do repositório.
- Publicar somente após testar restore de backup, smoke test e ausência de vazamentos na página pública.

## Bibliotecas

Next.js App Router + TypeScript conforme [guia oficial](https://nextjs.org/docs/app/getting-started/installation). Para Prisma atual, confirmar `prisma.config.ts` e adapter PostgreSQL conforme [documentação do connector](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql). Versões, schema concreto e lockfile pertencem à etapa de scaffold; estas referências não substituem validação da integração.
