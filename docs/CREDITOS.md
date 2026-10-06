# Créditos e licenças

## Autoria e processo

Projeto de [@samuelsce](https://github.com/samuelsce), desenvolvido incrementalmente com apoio de um assistente de IA no planejamento, implementação e documentação. Os guias de aprendizado e o histórico Git registram as decisões e verificações.

A organização da apresentação e do guia de avaliação foi inspirada no README do RoomLab fornecido pelo autor, adaptada ao fluxo web/worker/banco do LinkWatch.

## Identidade e assets

- **Marca e ícones:** símbolo com dois elos, favicons SVG/ICO, ícones do tema e gráficos implementados em SVG no repositório. A interface não depende de uma biblioteca adicional de ícones.
- **Fonte da marca:** [Bricolage Grotesque, de Atelier Triay](https://github.com/ateliertriay/bricolage), distribuída sob SIL Open Font License 1.1. O [recorte local](../src/assets/fonts/README.md) contém apenas as letras de `linkwatch`; a [licença integral](../src/assets/fonts/OFL.txt) acompanha o arquivo.
- **Tipografia da interface:** famílias do sistema operacional; não são redistribuídos arquivos dessas fontes.
- **Capturas:** imagens do build local, com origem e natureza dos registros descritas em [screenshots/README.md](screenshots/README.md). Não são mockups nem capturas de uma hospedagem pública.

As referências visuais de Linear, Better Stack e Metabase estão registradas em [DESIGN.md](DESIGN.md). Elas orientaram hierarquia e apresentação; os assets desses produtos não foram incorporados ao LinkWatch.

## Bibliotecas e ferramentas

Next.js, React, TypeScript, Tailwind CSS, Auth.js, Prisma, PostgreSQL, pg, Zod, ipaddr.js, Vitest e Playwright são usados conforme as versões fixadas no [manifesto](../package.json) e no [lockfile](../package-lock.json). Os respectivos créditos e licenças permanecem nos pacotes distribuídos por seus projetos.

O [adaptador de glob](../tooling/next-root-glob/README.md) é tooling local limitado ao plugin de lint do Next.js; não integra o código de execução da web ou do worker. A [chave TLS de fixture](../tests/fixtures/README.md) é pública e intencionalmente inválida para a validação do probe, não uma credencial de hospedagem.

## Licença do projeto

A licença geral do código do LinkWatch ainda não foi escolhida. Este documento não declara uma licença global. A licença da fonte e as licenças dos componentes de terceiros estão preservadas separadamente.
