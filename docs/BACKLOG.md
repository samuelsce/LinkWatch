# Estado das entregas e próximos passos

As entregas de fundação, acesso, coleta e publicação estão implementadas. Deploy, capacidade, OAuth real e alertas permanecem pendentes. Este documento diferencia implementação, evidência disponível e próximos critérios de aceite.

Os IDs `LW-xx` são identificadores internos de planejamento; não são números de issues do GitHub. O quadro e as labels abaixo são uma proposta de organização, não uma afirmação de que existe um GitHub Project configurado.

## Entregas implementadas

| IDs | Entrega | Evidência |
| --- | --- | --- |
| LW-01 a LW-03 | Fundação: Next.js/TypeScript, PostgreSQL/Prisma, migrations, worker e CI | Scripts reproduzíveis, três migrations em banco vazio e smoke de processos |
| LW-04 e LW-05 | Acesso e gestão de monitores | Sessões de banco, CRUD, limites concorrentes e isolamento entre contas; OAuth completo pendente |
| LW-06 a LW-09 | Probe, scheduler, incidentes, métricas e retenção | DNS/IP/TLS, reservas e resultados antigos, ciclo transacional, p95 e limpeza |
| LW-10 a LW-12 | Dashboard, gráficos, status público e E2E com worker | Visitante sem sessão, projeção restrita, queda/recuperação, slug e despublicação |
| Parte de LW-14 | Apresentação do portfólio | README, guia de avaliação, capturas locais, temas, identidade e revisão de segurança |

Os [testes](TESTING.md), o [guia de avaliação](AVALIACAO.md) e o histórico Git permitem conferir esses resultados. As capturas são locais e identificam registros fictícios; não encerram o critério de demo hospedada de LW-14.

## Próximas entregas

| ID | Prioridade | Trabalho pendente | Critério de aceite |
| --- | --- | --- | --- |
| LW-13 | P0 | Configuração OAuth real, limites de abuso/capacidade, empacotamento, deploy e backup | Login completo validado; limites definidos e testados; web/worker/banco ativos; smoke, backup e restauração documentados |
| LW-14 | P1 | Demonstração pública e fechamento do portfólio | Demo hospedada com dados identificados, capturas do ambiente, custos documentados, instalação limpa e licença geral escolhida |
| LW-15 | P1 | Outbox e alertas Discord | Evento/canal único, segredo protegido, backoff, deduplicação e falha de envio isolada da coleta |
| LW-16 | P2 | Alertas por e-mail | Provedor configurado, destinatário verificado e entregas testadas |

### Sequência antes de publicar

1. Configurar a OAuth App e executar o retorno real conforme [OAUTH_SETUP.md](OAUTH_SETUP.md).
2. Definir rate limiting, acesso ao demo e capacidade global; medir atraso do worker e crescimento do banco.
3. Escolher hospedagem compatível com worker contínuo e empacotar os processos.
4. Configurar HTTPS, host/proxy, secrets, rede e papéis do banco conforme [SECURITY.md](SECURITY.md).
5. Testar backup/restore, executar smoke e validar isolamento/publicação no domínio público.
6. Publicar a demonstração e registrar links, custos, licença e evidências reais no README.

Alertas dependem de incidentes confiáveis e operação validada. Equipes, cobrança e múltiplas regiões continuam fora do escopo inicial.

## Organização proposta no GitHub

Quadro: **LinkWatch: Product & Engineering**. Colunas: Backlog, Ready, In progress, In review e Done. Campos: prioridade, entrega, área e tamanho. Labels: feature, bug, security, tests, documentation e infrastructure.

Uma tarefa fica pronta para execução quando tem escopo, aceite e dependências definidos. Considerar concluída somente após implementação, validação aplicável e documentação atualizada. Preferir mudanças revisáveis por responsabilidade.

Para abrir issues, usar os [templates](../.github/ISSUE_TEMPLATE/feature.yml), relacionar as regras de [PRODUCT.md](PRODUCT.md) e vincular dependências com números reais. Não usar `LW-xx` como se fosse uma issue existente nem fechar um marco inteiro com um único critério genérico.
