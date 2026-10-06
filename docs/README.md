# Documentação do LinkWatch

O [README principal](../README.md) apresenta o produto. Este índice reúne a documentação atual e os registros das entregas, para facilitar a leitura conforme seu objetivo.

## Avaliar e experimentar

| Documento | Conteúdo |
| --- | --- |
| [Avaliação](AVALIACAO.md) | Roteiro do produto, decisões e arquivos/testes para inspecionar |
| [Desenvolvimento](DESENVOLVIMENTO.md) | Prévia, configuração completa, comandos e diagnóstico |
| [OAuth](OAUTH_SETUP.md) | Cadastro da GitHub OAuth App e validação manual |
| [Capturas](screenshots/README.md) | Apresentação, painel, histórico e status público, com origem dos dados |
| [Contribuição](../CONTRIBUTING.md) | Como reportar problemas e propor mudanças |

## Entender a implementação atual

| Documento | Conteúdo |
| --- | --- |
| [Produto](PRODUCT.md) | Regras, escopo atual e critérios de aceite |
| [Arquitetura](ARCHITECTURE.md) | Web, worker, banco, concorrência, métricas e tradeoffs |
| [Banco](DATABASE.md) | Entidades implementadas, restrições e transações |
| [Design](DESIGN.md) | Composição, temas, marca, acessibilidade e desempenho |
| [Testes](TESTING.md) | Evidências por camada e critérios de release |
| [Segurança](SECURITY.md) | Revisão datada, proteções verificadas e pendências de hospedagem |
| [Backlog](BACKLOG.md) | Estado das entregas e próximos passos |
| [ADR do worker](adr/0001-separate-monitoring-worker.md) | Decisão de separar a coleta do ciclo de vida da web |
| [Créditos](CREDITOS.md) | Assets, referências e licenças |

## Histórico e aprendizado

Os guias abaixo registram o contexto de cada entrega. Frases como “ainda será implementado” descrevem o estado daquele momento; para o comportamento atual, use os documentos da seção anterior. O histórico foi preservado para permitir acompanhar as decisões pelo Git.

| Etapa | Registro |
| --- | --- |
| Fundação | [LEARNING.md](LEARNING.md): scaffold, migrations, heartbeat e CI |
| Acesso e cadastro | [LEARNING_M1.md](LEARNING_M1.md): sessão, autorização, validação e conflitos |
| Coleta | [LEARNING_M2.md](LEARNING_M2.md): DNS, reservas, incidentes, métricas e retenção |
| Histórico e publicação | [LEARNING_M3.md](LEARNING_M3.md): gráficos, projeção pública e jornada com worker |
| Revisão visual | [DESIGN.md](DESIGN.md): temas, fonte local e símbolo da marca |
| Revisão de segurança | [SECURITY.md](SECURITY.md): resultados e limites da análise de 5 de outubro de 2026 |

## Estado da avaliação

As entregas de fundação, acesso, coleta e publicação estão implementadas. O CI valida as camadas descritas em TESTING.md. A versão apresentada pelas capturas usa o build local e registros de teste.

O OAuth completo com credenciais reais, a capacidade, o empacotamento do worker, a hospedagem e o teste de restauração ainda precisam ser validados. Discord e e-mail permanecem planejados. Esses itens não devem ser interpretados como funcionalidades disponíveis por aparecerem no backlog ou nos registros de planejamento.
