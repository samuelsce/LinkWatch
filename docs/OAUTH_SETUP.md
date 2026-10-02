# Configurar o login GitHub local

O login usa uma OAuth App: o GitHub identifica você e devolve ao LinkWatch uma autorização temporária. O LinkWatch cria uma sessão no banco. Não precisamos receber sua senha do GitHub.

1. Abra [GitHub Developer settings → OAuth Apps](https://github.com/settings/developers) e escolha **New OAuth App**.
2. Preencha:

| Campo | Valor local |
| --- | --- |
| Application name | LinkWatch Local |
| Homepage URL | http://localhost:3000 |
| Application description | Monitor de sites e APIs — ambiente local |
| Authorization callback URL | http://localhost:3000/api/auth/callback/github |

3. Registre a aplicação. Copie o **Client ID**; gere um **Client Secret**.
4. Na pasta do LinkWatch, rode `node scripts/setup-local-env.mjs`. Esse comando prepara `.env` e gera AUTH_SECRET sem imprimir o segredo ou substituir configurações existentes.
5. Abra `.env` localmente e preencha:

```dotenv
AUTH_URL="http://localhost:3000"
AUTH_GITHUB_ID="seu-client-id"
AUTH_GITHUB_SECRET="seu-client-secret"
```

O arquivo já deve conter AUTH_SECRET gerado pelo script e DATABASE_URL apontando para PostgreSQL. Não substitua AUTH_SECRET por uma senha curta. Não envie Client Secret pelo chat nem version­e `.env`.

6. Com PostgreSQL disponível, rode `npm run db:deploy` e `npm run dev`. Reinicie o servidor após alterar o ambiente.
7. Abra **http://localhost:3000/login**, escolha entrar com GitHub e autorize a aplicação. Mantenha o mesmo hostname (`localhost`) durante o fluxo; `127.0.0.1` é outra origem para cookies e OAuth.
8. Você deve chegar ao painel. Cadastre um monitor e teste sair/entrar novamente.

O callback precisa corresponder ao host e porta usados. Para produção, crie outra OAuth App com a URL HTTPS do deploy e outro secret. Só habilite AUTH_TRUST_HOST quando o host/proxy de entrada estiver sob seu controle.

Sem credenciais GitHub, a tela de login mostra que a integração precisa ser configurada. O CI usa sessões reais inseridas no banco de teste para validar proteção e CRUD; isso não substitui a autorização real no GitHub. Não há provider de teste ou rota que permita entrar como outro usuário na aplicação.

Referências: [provider GitHub do Auth.js](https://authjs.dev/getting-started/providers/github), [criando uma OAuth App no GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
