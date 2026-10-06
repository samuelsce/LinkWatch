# Aprendendo com M1: acesso e cadastro

Registro histórico da entrega M1. Os itens descritos como futuros se referem àquele momento. O comportamento atual está no [índice da documentação](README.md) e no [guia de desenvolvimento](DESENVOLVIMENTO.md).

Esta entrega liga o banco à interface. O usuário entra com GitHub e gerencia apenas os próprios monitores. As requisições periódicas aos endpoints ainda não existem: o worker continua registrando heartbeat.

## Autenticação e autorização

Autenticação responde “quem é este usuário?”. GitHub OAuth valida a identidade; Auth.js salva conta e sessão no PostgreSQL. O navegador recebe um cookie com o identificador da sessão, não a senha do GitHub. O pedido OAuth solicita somente `read:user user:email`, sem acesso aos repositórios.

Autorização responde “quais dados ele pode acessar?”. `src/server/session.ts` recupera a sessão; `MonitorService` sempre recebe o ownerId derivado dela. Não usamos ownerId enviado pelo formulário. O layout privado organiza navegação, mas não substitui a autorização em cada ação.

`currentUser` usa React `cache` para reutilizar a leitura da sessão dentro de uma mesma renderização no servidor. O cache é por requisição; não compartilha uma sessão entre usuários. Isso evita consultas duplicadas e duas tentativas de remover uma sessão expirada.

Veja `src/auth.ts`, `src/server/session.ts` e `src/app/login/actions.ts`. A integração usa a linha v5 beta recomendada pelo guia oficial do Auth.js para App Router, com versão fixada. Ela deve ser reavaliada ao atualizar dependências.

## Server Actions

Um formulário chama uma função marcada com `use server`. Essa função roda no servidor, verifica sessão, valida a entrada e grava no banco. `useActionState` conecta retorno, erros e estado de envio à interface. `revalidatePath` atualiza o conteúdo; `redirect` leva ao detalhe depois de salvar.

`redirect` é um sinal de controle do Next.js, implementado como uma exceção interna. Por isso ele fica fora do catch que converte erros de gravação em mensagens. Um catch genérico ao redor de tudo poderia esconder um redirecionamento válido.

Server Actions conferem Origin/Host para proteção contra CSRF. Um teste altera Origin e verifica que o cadastro é rejeitado. Isso não elimina a necessidade de autorização: uma ação com sessão válida ainda deve conferir o dono do monitor.

## Validação

HTML ajuda com campos obrigatórios e limites, mas qualquer pessoa pode enviar uma requisição alterada. Zod valida novamente no servidor. A validação aceita apenas HTTP/HTTPS, portas 80/443, sem credenciais ou fragmentos, e rejeita IPs privados/locais, inclusive representações alternativas de IPv4 e IPv6.

Esta etapa não faz a requisição nem resolve DNS. Em M2, o worker precisará resolver e validar os endereços e fixar o IP validado na conexão para impedir DNS rebinding. Validar apenas o cadastro seria insuficiente para uma ferramenta que faz chamadas externas.

## Transação e concorrência

Uma transação reúne mudanças que precisam acontecer juntas. Ao criar um monitor, bloqueamos a linha do usuário antes de contar seus monitores. Duas criações simultâneas passam pela mesma fila; a segunda vê o resultado da primeira e respeita o limite.

Ao editar, bloquear Monitor antes de CheckRun prepara a mesma ordem que o worker usará. Mudanças relevantes invalidam leases e execuções antigas. Trocar URL encerra um incidente como CONFIG_CHANGED; isso não significa que o endpoint recuperou.

O formulário guarda updatedAt como versão. Depois do lock, o servidor compara essa versão com a atual. Se outro pedido mudou o monitor, a gravação retorna conflito. Essa informação não autoriza ninguém: ID e versão continuam sujeitos à verificação de proprietário.

Nome pode mudar sem alterar a regra de coleta. URL, intervalo, timeout e código HTTP esperado iniciam outra revisão; mudar o status esperado também muda o significado de sucesso. Pausa preserva incidente aberto; retomada limpa a sequência de falhas e agenda uma coleta nova.

## Horários em UTC

Um teste de alteração detectou diferença entre horários gravados e retornados pelo adapter. PostgreSQL podia usar o fuso local da máquina; o adapter Prisma espera resultados em UTC. A conexão agora define timezone=UTC.

O teste compara um timestamp com seu epoch para garantir que não houve deslocamento de fuso. Usamos o relógio do banco para alterações e comparações de estado, reduzindo divergências entre processos.

## Testes sem atalho de login

Os testes de navegador inserem usuários e sessões normais apenas em TEST_DATABASE_URL. O app de produção lê esses cookies pela mesma implementação Auth.js usada no login. Não há provider especial, header para se passar por usuário ou rota de criação de sessão na aplicação.

São verificados: visitante/expiração; CRUD e validação; duas contas; adulteração de ID escondido no formulário; logout e reutilização de cookie antigo; mobile; parâmetros do pedido OAuth; Origin inválido.

O teste de OAuth intercepta a navegação para GitHub e verifica client/callback/scopes. Ele não valida a autorização real nem a troca do código com o GitHub. Para isso, configure a OAuth App pelo [guia local](OAUTH_SETUP.md) e faça o smoke manual.

## Como estudar o histórico

```bash
git log --oneline
git show 0c6d9cb -- src/db/client.ts
git show b4bcae0 -- src/auth.ts
git show 6a8fc40 -- src/features/monitors/service.ts
git show 62b59e7 -- src/app
```

Experimente ler primeiro o formulário, depois a action e por fim o serviço. Esse caminho mostra como um clique vira uma gravação validada e autorizada no PostgreSQL.
