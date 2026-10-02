# Design da interface

Direção inicial, sem telas implementadas. Interface em português, conforme decisão do proprietário; README em inglês. Exemplos de números são fictícios e só devem aparecer em um modo demo identificado.

## Direção visual

Ferramenta de operação com boa leitura e hierarquia simples. Tema escuro inicial: fundo #0B1120, superfícies #111C2E, bordas #26344A, texto #F1F5F9 e texto secundário #AAB8CC. Cor de ação #38BDF8; status online #4ADE80, instável #FBBF24, offline #FB7185. Validar contraste antes da entrega.

Tipografia de interface sans-serif; números tabulares para métricas e monospace para URLs. Cards discretos e alinhados, sem efeitos que dificultem leitura. Status sempre acompanha texto e ícone, sem depender de cor. Evitar excesso de gráficos sem dados suficientes.

## Rotas e telas

| Rota alvo | Conteúdo | Estados necessários |
| --- | --- | --- |
| / | Apresentação breve, captura real futura e botão entrar | Sessão existente direciona ao painel |
| /login | Entrar com GitHub | Carregando, cancelamento e falha OAuth |
| /dashboard | Resumo, lista de monitores e incidentes abertos | Vazio, carregando, erro, dados antigos |
| /monitors/new | Formulário de monitor | Validação, salvando, limite atingido |
| /monitors/[id] | Estado, configuração, disponibilidade, latência e incidentes | Sem amostras, pausado, coleta atrasada, 404 privado |
| /monitors/[id]/edit | Editar monitor e explicar mudança de endpoint | Validação e erro de concorrência |
| /status-page | Configurar título/slug, selecionar serviços e publicar | Despublicado, slug ocupado, sem serviços |
| /status/[slug] | Visão pública dos serviços e incidentes | Operacional, instável/offline, pausado, sem dados, 404 |

## Painel desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ LinkWatch                           Status público   Conta   │
├──────────────────────────────────────────────────────────────┤
│ Visão geral                               + Novo monitor     │
│ [Ativos: 3] [Online: 2] [Incidentes: 1] [Última coleta: ...]   │
│                                                              │
│ Monitores                         Buscar…   Filtro de estado  │
│ Nome / URL privada     Estado       Último check     Ações    │
│ API principal          ● Online     82 ms            ⋯        │
│ Site institucional     ● Offline    Timeout          ⋯        │
│                                                              │
│ Incidentes abertos                                           │
│ Site institucional · desde 14:32 · ver detalhes               │
└──────────────────────────────────────────────────────────────┘
```

O detalhe concentra gráficos e disponibilidade por período. Não usar média global de uptime no painel: serviços com quantidades diferentes de checks tornam esse número ambíguo.

## Detalhe do monitor

Cabeçalho com nome, URL privada, badge de estado, última verificação e ações pausar/editar. Seletor de período compartilhado por métricas e histórico. Cards: disponibilidade observada + amostras, latência média, p95 e incidentes no período.

Gráfico de latência com unidade ms, timezone e tooltip; marcas de falhas e lacunas sem interpolação que sugira coleta inexistente. Incluir resumo textual acessível e tabela de verificações paginada. Timeline de incidentes mostra começo, confirmação, fim e motivo.

## Cadastro

Campos visíveis: nome, URL, intervalo, timeout e status esperado. Padrões: cinco minutos, dez segundos e 200. Texto curto explica GET e ausência de redirects. Erros junto ao campo e resumo com foco após submissão inválida. Mostrar os limites antes de salvar.

Ao salvar, redirecionar ao detalhe com “Aguardando primeira verificação”. Não apresentar um sucesso de rede fictício baseado somente na validação do formulário.

## Página pública

Título e descrição, resumo geral e lista de serviços. Para cada serviço: nome público, estado textual, última coleta e disponibilidade observada com amostras. Histórico de incidentes só dos serviços publicados, sem detalhes de infraestrutura.

Indicador claro de dados antigos e horário de atualização. Sem URL do endpoint ou contato do dono. Uma página sem serviços ativos não recebe o texto “Todos os sistemas operacionais”.

## Mobile e acessibilidade

- Em 360 px: cards de resumo em duas colunas; monitores como cards; ações em menu acessível.
- Navegação compacta no cabeçalho; formulários em uma coluna.
- Botões com área de toque confortável, labels explícitos e foco visível.
- Modal de exclusão gerencia foco, Escape e retorno ao disparador.
- Gráficos oferecem texto/tabela; mensagens de estado usam região acessível sem anunciar cada refresh.
- Verificar teclado, contraste, zoom 200% e ausência de overflow horizontal.

## Evidências para o portfólio

Capturar painel, detalhe com incidente e página pública após implementação. Marcar exemplos de demonstração; não publicar screenshot que sugira métricas reais sem coleta. Gravar um ciclo controlado de queda e recuperação como demonstração do worker.
