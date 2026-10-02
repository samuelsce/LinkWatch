# ADR 0001 — separar o worker de monitoramento da aplicação web

Status: proposta para implementação inicial. Data: 2026-10-02.

## Contexto

As verificações devem acontecer a cada 1, 5 ou 15 minutos, mesmo sem visitas ao painel. Requisições web têm duração limitada e instâncias podem escalar ou desaparecer. Agendar um loop no processo web pode gerar checks duplicados e interromper coleta silenciosamente.

O cron do plano Hobby da Vercel não oferece frequência menor que um dia: [limites oficiais](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Decisão

Executar um worker Node independente, usando PostgreSQL para agendamento, reservas com lease e persistência. Next.js fornece interface e ações autenticadas. Código de domínio compartilhado no mesmo repositório. Sem Redis/fila adicional no MVP.

## Alternativas

| Alternativa | Avaliação |
| --- | --- |
| Loop dentro do Next.js | Acopla coleta ao ciclo de vida web; descartado |
| Cron externo chamando endpoint web | Possível, mas sujeito à duração/concorrência da função e configuração adicional; reavaliar se worker não for viável |
| Redis + fila distribuída | Útil em escala maior; adiciona serviço e operação desnecessários agora |
| Worker + reservas PostgreSQL | Atende ao escopo, permite testar concorrência e mantém dependências pequenas |

## Consequências

Deploy precisa suportar processo ativo e orçamento compatível. Banco participa da agenda e recebe índices específicos. Reservas exigem recuperação de crash e fencing de resultados antigos. HTTP pode ser repetido após crash, mas check e incidente precisam ter persistência idempotente.

Revisitar se atraso de agenda exceder a meta, manutenção no banco afetar coleta ou múltiplas regiões forem necessárias. Medir antes de introduzir uma fila.
