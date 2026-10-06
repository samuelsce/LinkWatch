# Revisão de segurança do LinkWatch

Data: 5 de outubro de 2026. Base examinada: `42ea486`, com as correções de cabeçalhos e os testes desta revisão. Escopo: código web e worker, autenticação, isolamento no PostgreSQL, publicação, dependências, arquivos versionados e histórico Git local disponível.

Não foram identificadas falhas críticas ou altas nos caminhos examinados. Isso descreve o resultado desta revisão, não uma garantia de ausência de vulnerabilidades. A aplicação ainda não tem deploy validado: TLS público, regras de rede, proxy, backups, carga e o ciclo GitHub OAuth real não foram avaliados em produção.

## Ameaças consideradas

- Visitante sem sessão tenta acessar ou alterar dados privados.
- Conta autenticada manipula IDs e campos ocultos para acessar dados de outra conta.
- URL monitorada tenta alcançar localhost, rede interna ou metadados de nuvem, inclusive por DNS e redirecionamento.
- Texto salvo tenta executar JavaScript no navegador de um visitante.
- Página pública expõe URLs com tokens, identidade do dono ou detalhes internos.
- Outro site tenta induzir uma alteração ou colocar a interface em um iframe enganoso.
- Credenciais ou dependências vulneráveis entram no repositório.

## Resultados e evidências

| Área | Resultado | Evidência e limite |
| --- | --- | --- |
| Autenticação | Sessão persistida no banco, expiração e logout verificados | Jornadas de sessão anônima/expirada e reutilização do cookie após logout. O login OAuth completo com credenciais reais continua pendente. |
| Autorização | Dono verificado no servidor em leituras e alterações | Serviços filtram por `ownerId`; testes manipulam IDs e seleção de monitores de outra conta por formulários reais. Campos ocultos não são considerados autorização. |
| CSRF | Server Action com origem diferente é rejeitada | Jornada envia POST com `Origin` externo e confirma ausência da alteração no banco. Depende de o proxy não aceitar cabeçalhos de host encaminhados pelo cliente como confiáveis. |
| SSRF | Destinos internos e DNS misto bloqueados; conexão usa o IP validado | Testes unitários de IPv4/IPv6, DNS e transporte; testes de sockets confirmam ausência de redirecionamento, descarte do corpo, timeout e rejeição de certificado inválido. Manter também restrições de saída na rede do deploy. |
| SQL e dados | Consultas SQL parametrizadas; limites e concorrência verificados | Não foram encontradas consultas `queryRawUnsafe`/`executeRawUnsafe`. Testes PostgreSQL cobrem isolamento, limites por dono, transações e reservas do worker. |
| Publicação | Seleção explícita e resposta com campos públicos | Jornadas confirmam ausência de URL, token da URL, identidade do dono e IDs privados, além de despublicação e alteração de slug. Os textos escolhidos pelo dono são públicos por definição. |
| XSS armazenado | Payloads examinados permanecem texto | Jornada salva título com `script`, descrição com `svg onload` e nome com `img onerror`, publica e verifica o navegador anônimo. React escapa os textos; o único script HTML inserido diretamente é uma constante do tema, sem dados do usuário. |
| Cabeçalhos do navegador | Lacuna corrigida nesta revisão | Respostas passaram a impedir iframe, objetos ativos, mudança de base para outra origem e detecção automática de tipo. Referrer não é enviado; câmera, microfone e localização são desabilitados. Testes cobrem páginas, saúde, favicon e 404; outro teste confirma o bloqueio de iframe pelo navegador. |
| Dependências | Auditoria retornou zero vulnerabilidades conhecidas | `npm audit --json` no lockfile atual, incluindo desenvolvimento. Next.js `16.3.8` corresponde à versão corrigida da atualização de segurança de setembro. O resultado depende dos avisos conhecidos na data da consulta. |
| Segredos | Nenhuma ocorrência suspeita nos padrões examinados | Busca em 235 blobs do histórico disponível por tokens GitHub, chaves de acesso AWS e chaves privadas. `.env` não foi versionado. A chave TLS em `tests/fixtures/` é uma fixture pública intencional, documentada e rejeitada pelo transporte. Esta busca não detecta todo formato possível de segredo. |
| CI | Dependências fixadas e permissões reduzidas | Actions fixadas por commit, `contents: read`, credenciais do checkout não persistidas e auditoria de dependências no pipeline. Banco e credenciais do CI são exclusivos de testes. |

### O que os cabeçalhos corrigem

`frame-ancestors 'none'` e `X-Frame-Options: DENY` impedem que a interface seja apresentada dentro de um iframe, mesmo na mesma origem. Isso reduz a possibilidade de enganar uma pessoa para clicar em controles cobertos por outro site.

`X-Content-Type-Options: nosniff` evita que o navegador tente reinterpretar uma resposta como outro tipo de conteúdo. `Referrer-Policy: no-referrer` evita compartilhar a URL da página de origem na navegação. `base-uri 'self'` e `object-src 'none'` restringem a alteração da base dos links e a inclusão de objetos ativos.

A CSP aplicada é uma base de proteção, sem `script-src` ou `default-src`. Ela não bloqueia todo JavaScript injetado. Uma CSP estrita com nonces exige adaptar os scripts iniciais, o tema e a renderização do Next.js; essa evolução permanece planejada. Os testes de XSS verificam o escape dos campos atuais e não atribuem essa proteção à CSP parcial. A página inicial permanece estática.

## Pendências antes de abrir a demonstração pública

1. **Limitar abuso e capacidade.** Não existe rate limiting por conta/origem nem um teto global de monitores. Dez monitores por conta e cinco slots de coleta não impedem muitas contas ou muitas requisições. Configurar limites no gateway para login, alterações e páginas públicas; usar uma origem confiável para identificar clientes. Antes de permitir cadastro irrestrito, definir capacidade global ou acesso por convite e verificar o atraso do worker sob carga. Um contador apenas na memória de uma instância não resolve limites entre réplicas.
2. **HTTPS e host canônico.** Usar `AUTH_URL` com a origem HTTPS exata e outra OAuth App para produção. Redirecionar HTTP para HTTPS e validar cookies `Secure`, `HttpOnly` e `SameSite` no deploy. Configurar HSTS na entrada HTTPS após confirmar a operação e o alcance desejado; a aplicação não o configura nesta entrega.
3. **Proxy confiável.** Só habilitar `AUTH_TRUST_HOST=true` com entrada controlada. O proxy deve sobrescrever `Host`, `X-Forwarded-Host` e `X-Forwarded-Proto` conforme a origem permitida, rejeitar hosts desconhecidos e impedir acesso direto ao servidor que contorne essas regras. Não ampliar `allowedOrigins` indiscriminadamente.
4. **Rede e banco.** PostgreSQL sem porta pública, credenciais exclusivas de produção e TLS quando a conexão atravessar rede não confiável. Separar o papel de migrations dos papéis de execução, com permissões mínimas. Bloquear saída do worker para redes internas/metadados também na infraestrutura, mantendo as verificações de URL e DNS no código.
5. **Operação e segredos.** Guardar secrets no provedor, restringir acesso aos logs e testar backup/restauração. Ativar detecção de segredos no GitHub conforme disponibilidade. Nunca usar as credenciais locais de `compose.yaml` ou a chave TLS de fixture em produção. Ao detectar exposição real, revogar/rotacionar o segredo; apagar o arquivo no último commit é insuficiente.
6. **Validação após deploy.** Exercitar o OAuth completo, confirmar cabeçalhos e cookies no domínio público, testar limites, isolamento, despublicação e coleta de um endpoint controlado. Repetir auditoria de dependências em atualizações e revisar as políticas quando alertas por Discord/e-mail forem implementados.

## Como reproduzir as verificações

Executar lint, tipos, testes unitários e build conforme o README. Integração, navegador e smoke exigem um PostgreSQL descartável indicado explicitamente por `TEST_DATABASE_URL`; nunca substituir pela URL do banco da aplicação. A suíte de navegador usa o build de produção e inclui `tests/e2e/security.spec.ts` e o cenário de HTML armazenado em `tests/e2e/monitors.spec.ts`.

Nesta revisão passaram 102 testes unitários, 44 de integração e 18 jornadas de navegador, além de lint, tipos, build e smoke dos processos web/worker, incluindo readiness com banco indisponível. Os testes mantiveram os temas e a renderização estática da apresentação funcionando. Nenhum esquema ou migration foi alterado.

A busca de segredos foi uma verificação local por padrões, sem imprimir os valores examinados. Não constitui uma nova ferramenta permanente de secret scanning no CI. A auditoria de dependências pode ser repetida com `npm audit --json`.

## Referências

- [OWASP: prevenção de SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
- [OWASP: cabeçalhos HTTP de segurança](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).
- [Next.js: atualização de segurança de setembro de 2026](https://nextjs.org/blog/september-2026-security-release).
- [Auth.js: erros e exigência de host confiável](https://authjs.dev/reference/core/errors#untrustedhost).
- Documentação da versão instalada: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`, `content-security-policy.md` e `01-app/03-api-reference/05-config/01-next-config-js/headers.md`.
