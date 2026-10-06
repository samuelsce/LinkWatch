# Design da interface

Estado: interface implementada nas entregas M0 a M3, com identidade visual revisada em outubro de 2026. Interface em português; README em português. Dados da apresentação inicial são explicitamente ilustrativos. Painel e status público usam resultados armazenados, sem inventar disponibilidade.

## Direção e referências

Uma ferramenta de operação deve facilitar a comparação dos serviços e a investigação de uma interrupção. A direção é clara, com superfícies brancas, texto grafite e azul petróleo nas ações. Verde, âmbar e vermelho identificam estados e sempre acompanham texto.

Pesquisa nas páginas oficiais:

- [Linear](https://linear.app): referência para hierarquia de interface e apresentação do produto dentro da página inicial.
- [Better Stack Uptime](https://betterstack.com/uptime): referência do domínio, com monitoramento, incidentes e comunicação de status.
- [Metabase](https://www.metabase.com): referência para apresentar dados e explicar a ferramenta por meio da interface.
- [frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): orientação aplicada para escolher uma identidade, revisar clichês, reduzir decoração e respeitar acessibilidade.

As referências orientam decisões; a marca, a composição e os textos são próprios do LinkWatch.

## Tokens implementados

| Papel | Cor | Uso |
| --- | --- | --- |
| Fundo | `#F4F7F9` | Área de trabalho |
| Superfície | `#FFFFFF` | Listas, formulários e gráfico |
| Texto | `#172B36` | Títulos e informação principal |
| Secundário | `#536873` | Descrições e contexto |
| Ação | `#136582` | Botões, links, foco e curva de latência |
| Divisor | `#D9E2E7` | Separação entre grupos de informação |

Estados: online `#20734D`, falha `#B33443`, atenção `#895B12`. Campos e botões secundários usam borda `#7C929E` para distinguir controles da superfície. Os tokens ficam em `src/app/globals.css`; os componentes consomem papéis como `muted`, `field`, `button-primary` e `border-soft`.

Tipografia: uma família de interface do sistema, priorizando Segoe UI Variable/Segoe UI e Helvetica Neue como alternativa. Essa escolha acompanha o ambiente do usuário e dispensa download de fontes. Números das métricas e tabelas são tabulares. Títulos usam pesos moderados, sem palavras coloridas ou etiquetas decorativas em caixa alta.

O símbolo é uma linha de monitoramento, reutilizada na marca e nos favicons SVG e ICO. O SVG é a fonte visual; o ICO contém a mesma marca em 32 px. As convenções `app/icon.svg` e `app/favicon.ico` fazem o Next.js incluir os links automaticamente.

## Composição e revisão

```text
Página inicial: marca / entrar
                explicação + ação | exemplo identificado de serviços e latência
                contexto          | três capacidades em texto
                autoria / repositório

Painel:         marca / navegação / conta
                título / novo monitor
                faixa de contagens por estado
                lista contínua de serviços

Detalhe:        identidade / estado / editar
                configuração resumida
                período / métricas / gráfico / verificações / incidentes
```

A decisão central foi usar uma lista contínua no painel, para comparar nome, estado e frequência sem separar cada serviço em um cartão. A página inicial mostra o assunto do produto por meio de um exemplo, com indicação visível de dados fictícios. Na revisão, removemos as antigas caixas numeradas, setas anexadas às ações, texto técnico no rodapé e avisos de entregas antigas. Após revisar capturas, reduzimos o título de desktop para dar mais espaço ao conteúdo.

Formulários têm uma superfície delimitada e controles consistentes. No detalhe, configuração, métricas, gráfico e incidentes têm hierarquias diferentes. O status público apresenta somente a projeção permitida pelo produto, incluindo falta de dados e serviços pausados. Exclusão continua em uma seção expansível com confirmação explícita.

## Movimento e desempenho

A curva ilustrativa da página inicial é desenhada uma vez, em 850 ms, por CSS/SVG. Botões respondem ao clique com deslocamento de 1 px e mudança de fundo em 140 ms. Não há loops, animações acionadas por scroll, bibliotecas novas ou fontes externas. `prefers-reduced-motion: reduce` desativa animações e transições.

A página inicial continua estática no build. O SVG ilustrativo é renderizado no servidor; o gráfico do histórico mantém apenas a interação já existente. Isso limita o custo acrescentado pela revisão visual. Não medimos Lighthouse/Core Web Vitals em produção; avaliação de rede, carga e dispositivos reais continua parte da entrega de deploy.

## Acessibilidade e validação

- Texto principal, secundário, links e cores de estado têm contraste acima de 5,7:1 sobre branco. Divisores decorativos não são usados como limites de campos.
- Controles têm labels, foco visível, estados de espera e mensagens de erro. Ações principais e secundárias têm altura mínima de 44 px.
- Status combina marcador e texto; gráfico oferece legenda, controle por teclado e tabela.
- Capturas revisadas: página inicial em desktop, 360 px e 768 px; login em mobile/tablet; histórico em desktop; status público em 360 px.
- E2E verifica teclado, preferência de movimento reduzido, favicon servido e ausência de overflow nas telas públicas. As jornadas existentes verificam cadastro, histórico mobile, publicação, recuperação e isolamento entre contas.

Busca, filtros de monitores, atualização em tempo real e paginação do histórico não foram adicionados nesta revisão. O histórico mostra até 50 verificações recentes e informa esse limite.

## Temas claro e escuro

O seletor aparece nos cabeçalhos da apresentação, login, painel e página pública. Na primeira visita, segue `prefers-color-scheme`. Depois de uma escolha manual, usa `linkwatch.theme` no armazenamento local. A preferência é compartilhada entre abas pelo evento `storage`; mudanças no tema do dispositivo só alteram a interface quando não há escolha manual.

| Papel | Claro | Escuro |
| --- | --- | --- |
| Fundo | `#F4F7F9` | `#111B22` |
| Superfície | `#FFFFFF` | `#192730` |
| Texto | `#172B36` | `#E5EDF2` |
| Secundário | `#536873` | `#ADBEC9` |
| Ação | `#136582` | `#83C9E3` |
| Divisor | `#D9E2E7` | `#344651` |

Bordas de controles, fundo do login, mensagens, botões, legendas e marcas do gráfico também usam tokens. No tema escuro, o botão principal tem texto escuro sobre azul claro para manter o contraste. O símbolo da marca mantém sua cor original.

O layout raiz executa um script pequeno e estático no cabeçalho, antes da primeira pintura, para aplicar `data-theme` sem esperar o React. Essa técnica segue o guia `preventing-flash-before-hydration.md` da documentação da versão instalada do Next.js. A supressão de aviso de hidratação fica restrita ao elemento HTML, cujo atributo é ajustado pelo script. O componente do seletor reaplica a preferência antes da pintura após montagens e sincroniza eventos; não adiciona biblioteca nem torna a página inicial dinâmica.

O valor armazenado é validado: somente `light` e `dark` chegam ao atributo. Falhas de acesso ao armazenamento não impedem a troca; nesse caso, a escolha é mantida em memória durante a visita. Ícones e textos do botão são alternados por CSS, mantendo a estrutura renderizada pelo servidor igual à do navegador. O botão possui nome acessível, foco visível e suporte a teclado.

Por preferência do proprietário, títulos e textos usam frases, vírgulas ou dois-pontos em vez de travessões. Interface e README permanecem em português.
