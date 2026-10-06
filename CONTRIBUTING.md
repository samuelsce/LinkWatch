# Contribuir com o LinkWatch

O LinkWatch é um projeto de portfólio de [@samuelsce](https://github.com/samuelsce). Para entender a versão atual, comece pelo [README](README.md), pelo [produto](docs/PRODUCT.md) e pelo [guia de desenvolvimento](docs/DESENVOLVIMENTO.md).

## Reportar um problema

Abra uma issue com o comportamento esperado, o que aconteceu, passos para reproduzir e informações do ambiente. Existem templates para [bugs](.github/ISSUE_TEMPLATE/bug.yml) e [funcionalidades](.github/ISSUE_TEMPLATE/feature.yml). Em capturas e logs, remova dados pessoais, tokens e URLs que contenham credenciais.

Para suspeita de vulnerabilidade, não publique credenciais ou detalhes de exploração em uma issue pública. Use o canal privado de reporte do GitHub se estiver disponível ou entre em contato com o autor antes de divulgar detalhes. A [revisão de segurança](docs/SECURITY.md) descreve as proteções e as pendências conhecidas.

## Propor uma mudança

1. Discuta mudanças maiores de escopo em uma issue e relacione a proposta às regras do produto.
2. Trabalhe em uma branch dedicada e separe mudanças coerentes em commits próprios.
3. Mantenha a interface, o README e a documentação do produto em português. Prefira frases, vírgulas e dois-pontos a travessões.
4. Explique a decisão, atualize os documentos afetados e execute os checks proporcionais à alteração.
5. No pull request, descreva o problema, o comportamento final, as verificações executadas e as limitações restantes.

Não inclua `.env`, credenciais, `node_modules`, cliente Prisma gerado, bancos de teste ou saída de build. Mudanças no schema devem incluir uma nova migration; não editar SQL já aplicado ou publicado. Testes de dados exigem um `TEST_DATABASE_URL` separado do banco da aplicação.

## Validar

```sh
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run build
```

Para mudanças de dados, concorrência ou jornadas, execute integração, E2E e smoke conforme o [guia](docs/DESENVOLVIMENTO.md#testes-com-banco-descartável). Testes devem verificar comportamento relevante, não apenas repetir a implementação. Em alterações específicas do Next.js, consulte a documentação da versão instalada em `node_modules/next/dist/docs`.

Atualizações de dependências devem preservar o lockfile, a auditoria e os presets de lint. Revise os overrides descritos no guia de desenvolvimento antes de alterar Prisma, Next.js ou ESLint.

## Escopo e licença

Deploy, capacidade e alertas estão no [backlog](docs/BACKLOG.md). A licença geral do projeto ainda não foi escolhida. Licenças de fontes e bibliotecas devem ser preservadas; veja os [créditos](docs/CREDITOS.md).
