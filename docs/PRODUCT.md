# LinkWatch — requisitos do produto

Estado: requisitos definidos em 2 de outubro de 2026; fundação M0 implementada. Login, cadastro, checks HTTP e demais funcionalidades de produto ainda não estão disponíveis.

## Objetivo

Ajudar desenvolvedores e pequenos responsáveis por serviços a descobrir indisponibilidades de sites e APIs, consultar evidências e comunicar o estado dos serviços. O primeiro lançamento deve permitir cadastrar um endpoint e acompanhar verificações reais sem manter o navegador aberto.

O projeto também deve demonstrar no portfólio decisões de arquitetura, regras de domínio, segurança, testes e operação. O critério de sucesso é um fluxo completo e demonstrável, com documentação reproduzível.

## Público e jornada

Desenvolvedor com alguns sites ou APIs públicas. Entra com GitHub, cadastra um monitor, acompanha a primeira verificação, consulta um incidente e publica uma página de status com os serviços que escolheu compartilhar.

## Escopo por entrega

| Entrega | Conteúdo | Critério de conclusão |
| --- | --- | --- |
| M0 — fundação | Documentação, scaffold, banco local e CI | Uma pessoa consegue preparar o ambiente seguindo o README |
| M1 — acesso e cadastro | Login e gestão de monitores | Dois usuários não conseguem acessar os dados privados um do outro |
| M2 — monitoramento | Worker, histórico e incidentes | Um endpoint de teste fica offline e volta; o sistema registra o ciclo sem duplicações |
| M3 — apresentação | Dashboard, gráficos e status público | Dados reais aparecem no painel; dados privados não vazam na página pública |
| M4 — portfólio publicado | Deploy, smoke tests, screenshots e README | Demo acessível, worker ativo e instalação validada de um checkout limpo |
| M5 — alertas | Discord, depois e-mail | Notificações de abertura/recuperação com tentativas e deduplicação |

## Requisitos e critérios de aceite

### R01 — autenticação e propriedade

- Login via GitHub OAuth; proposta de Auth.js a validar no scaffold.
- Cada monitor, incidente e página de status pertence a um usuário.
- Toda leitura e mutação privada verifica sessão e propriedade no servidor.
- Sair invalida a sessão; erros de login têm uma mensagem útil.
- Não haverá cadastro de senha nem equipes no MVP.

### R02 — gestão de monitores

- Criar, listar, editar, pausar, retomar e excluir um monitor com confirmação de exclusão.
- Campos: nome de 1–80 caracteres, URL até 2.048 caracteres, intervalo de 1/5/15 minutos, timeout de 2–15 segundos e código HTTP esperado de 200–599 (padrão 200).
- Método GET, portas 80/443, HTTP ou HTTPS. Sem cookies, credenciais na URL, headers personalizados ou corpos de requisição no MVP.
- Até 10 monitores por usuário no MVP; limite configurável no servidor.
- Nome e status esperado podem ser editados. Mudar URL, intervalo ou timeout inicia uma nova revisão de configuração.
- A revisão é salva em cada verificação para o histórico manter o significado original.
- Pausar cancela verificações futuras. Retomar agenda uma verificação imediata e zera a sequência de falhas.
- Um monitor novo mostra “Aguardando primeira verificação”.

### R03 — verificações

- Worker verifica monitores ativos e vencidos, independente de visitas ao painel.
- Sucesso: resposta com o código esperado antes do timeout. Latência mede o tempo até os headers; o corpo é descartado e a conexão liberada.
- Falha: timeout, DNS, conexão, TLS inválido ou código diferente do esperado. Não desabilitar validação TLS.
- Redirecionamentos não são seguidos no MVP. Um 3xx pode ser explicitamente o status esperado, mas o destino não é verificado.
- Cada ciclo gera no máximo um resultado persistido por monitor e horário agendado.
- Erros do worker e bloqueios por política de URL são estados operacionais separados de falhas do endpoint.
- Uma revisão antiga ou um worker sem lease válida não pode alterar o estado atual.

### R04 — estado e incidentes

- Estados visíveis: aguardando, online, instável, offline, pausado e sem dados recentes.
- Primeira falha: instável. Segunda falha consecutiva: offline e abertura de um incidente.
- Início do incidente: horário da primeira falha da sequência confirmada. Uma única falha seguida de sucesso não cria incidente.
- Um sucesso após incidente aberto resolve o incidente; duração = recuperação menos início.
- Só pode existir um incidente aberto por monitor. Check, mudança de estado e incidente são persistidos na mesma transação.
- Pausa mantém um incidente existente aberto, sem presumir recuperação; retomada permite resolvê-lo com uma nova verificação bem-sucedida.
- Ao alterar a URL, fechar um incidente aberto como “encerrado por mudança de configuração”, sem chamar isso de recuperação. Zerar sequência e aguardar uma verificação da nova revisão.
- Ausência de resultados por mais de duas vezes o intervalo + timeout + 30 segundos mostra “Sem dados recentes”; nunca presumir online porque o último check passou.

### R05 — métricas e histórico

- Filtros de 24 horas, 7 dias e 30 dias, calculados no servidor em UTC.
- Disponibilidade observada = checks bem-sucedidos / checks concluídos de endpoint × 100. Não representa SLA ou disponibilidade contínua medida em tempo.
- Checks que falham contam no denominador mesmo quando não abrem incidente. Erros internos, bloqueios de segurança e períodos sem check não contam.
- Mostrar total de amostras e avisar quando há lacunas de coleta. Zero amostras resulta em “Sem dados”, nunca 100%.
- Atrasos não geram checks retroativos fictícios. A agenda retoma a partir do horário atual, registrando lacunas.
- Latência média e p95 usam apenas checks bem-sucedidos; falhas aparecem como marcas no gráfico, sem atribuir latência zero.
- p95 usa nearest-rank: ordenar valores e selecionar índice ceil(0,95 × n), com índices iniciando em 1.
- Retenção inicial de checks: 30 dias. Incidentes permanecem enquanto o monitor existir; indicar quando as amostras do incidente já expiraram.
- Exibir última coleta e fuso do usuário. O tooltip distingue latência até headers de tempo total de download.

### R06 — página pública de status

- Uma página por usuário, com título, descrição, slug único e escolha explícita dos monitores publicados.
- Despublicada por padrão; usuário pode publicar e despublicar.
- Expor somente nome público, estado, disponibilidade observada, última coleta e incidentes dos monitores selecionados.
- Não expor URL monitorada, query string, identidade do dono, logs, erros técnicos ou credenciais.
- Nenhum monitor ativo publicado: mostrar ausência de serviços ativos, sem afirmar que tudo está operacional.
- Degradação/falta de dados de um serviço deve aparecer no resumo geral. Pausados aparecem separadamente.
- Página inexistente ou despublicada retorna 404. Renomear slug faz o slug anterior retornar 404.

### R07 — alertas (após o MVP)

- Discord primeiro, e-mail depois; ativação explícita por canal.
- Eventos de abertura e recuperação geram uma entrega por evento/canal, com chave única.
- Usar outbox transacional e registrar tentativas, sucesso e falha final.
- Repetir até três vezes com backoff; interrupção de alertas não interrompe checks.
- Não prometer exactly-once no provedor externo: um timeout após envio pode resultar em duplicação. Documentar entrega at-least-once e usar idempotência do provedor quando disponível.
- Webhook do Discord deve ter formato/destino permitido e segredo protegido; não aceitar webhooks arbitrários.

## Qualidade e limites

- Interface responsiva desde 360 px, navegação por teclado, foco visível e estados acompanhados de texto/ícone.
- Meta inicial: até 100 monitores totais em uma instância, concorrência máxima de 5 checks. Medir atrasos antes de ampliar limites.
- Meta de agenda sob essa carga: p95 de início de check até 30 segundos após o vencimento, a confirmar por teste de carga.
- Requisições para destinos internos, locais, reservados e metadados de nuvem são proibidas. Validar DNS e o IP usado na conexão para impedir DNS rebinding.
- Logs estruturados com IDs; nunca registrar query strings, tokens de sessão ou webhooks.
- Datas persistidas como timestamptz em UTC. Comparar agenda usando o relógio do banco.

## Fora do primeiro lançamento

Billing, planos pagos, equipes, múltiplas regiões, testes de navegador, certificados/expiração de domínio, POST autenticado, manutenção programada, SLA contratual e configuração de retries por usuário.

## Decisões em aberto

- Provedor e orçamento de hospedagem; a coleta requer um processo que permaneça executando.
- Provedor de e-mail na etapa M5.

## Decisões confirmadas

- Repositório: [samuelsce/LinkWatch](https://github.com/samuelsce/LinkWatch).
- Interface em português e README em inglês.
