# Estratégia de testes e release

Plano de verificação, ainda sem testes executáveis. CI será criada quando houver aplicação e lockfile; não publicar um badge verde para etapas não verificadas.

## Regras de domínio — testes unitários

- Primeira falha deixa instável; segunda abre incidente com início na primeira falha.
- Falha isolada seguida de sucesso não cria incidente.
- Sucesso resolve apenas um incidente aberto; falhas seguintes não duplicam incidente.
- Pausa, retomada e mudança de URL obedecem às regras de revisão e encerramento.
- Disponibilidade: zero amostras, todas falhas, mistura, falha isolada, erro do coletor e janela temporal.
- p95 nearest-rank com amostras pequenas, repetidas e limites do período.
- Estado sem dados recentes e resumo público com monitores pausados/desconhecidos.

## URL safety — unitários e integração HTTP isolada

Testar localhost, IPv4/IPv6 privados, endereços mapeados, formatos alternativos, DNS público/privado misto, metadados, credenciais, portas e protocolos proibidos. Simular DNS rebinding e confirmar que a conexão usa o IP validado. Testar redirects sem seguir destino, timeout, erro TLS e descarte do corpo.

Usar um resolver/transport injetável para fixtures. Qualquer permissão de host local é exclusiva do harness de testes, sem variável de produção capaz de desabilitar todas as proteções.

## PostgreSQL — integração real

- Dois workers disputam o mesmo monitor: um resultado persistido por ciclo e um incidente aberto.
- Crash antes/depois da requisição e antes/depois do commit; recuperação de lease e rejeição do token antigo.
- Worker antigo finaliza após pausa, edição ou exclusão: não altera o estado atual.
- Duas falhas concluídas: check e incidente consistentes na mesma transação.
- Criações simultâneas não ultrapassam limite de monitores por usuário.
- Publicação rejeita monitor de outro proprietário e campos privados não aparecem na resposta.
- Retenção remove apenas resultados expirados e preserva incidentes/execuções ativas.
- Todas as migrations aplicam em banco vazio; testar restore antes do deploy.

Usar banco descartável separado do ambiente de desenvolvimento/produção. Não executar limpeza de dados contra DATABASE_URL de produção.

## E2E — jornadas críticas

1. Usuário autenticado cria monitor, aguarda check real do fixture e consulta histórico.
2. Fixture falha duas vezes e recupera; incidente aparece e fecha.
3. Usuário pausa/retoma e edita URL; estado respeita as regras.
4. Usuário publica seleção; visitante vê apenas informações permitidas; despublicação retorna 404.
5. Segundo usuário recebe 404/negação em dados privados do primeiro, incluindo mutations.
6. Fluxo vazio e formulário inválido funcionam em mobile e teclado.

Fixtures de sessão são exclusivas de testes e não podem ser ativadas no build de produção. Smoke test do GitHub OAuth real no ambiente de staging, sem usar conta pessoal em CI.

## CI e critérios de release

No scaffold, adicionar lint, typecheck, testes unitários e build. Integração usa serviço PostgreSQL; E2E roda após web e worker estarem disponíveis. Secret scanning e dependency review conforme recursos do repositório, sem badges fictícios.

Release exige todos os checks aplicáveis passando, migrações testadas, smoke test no deploy, worker com heartbeat recente, coleta real, página pública sanitizada e README validado de checkout limpo.

Teste de capacidade: 100 monitores, concorrência 5, endpoints com latência normal e timeouts. Medir p95 do atraso da agenda, memória e crescimento do banco. Ajustar limite do demo ao resultado; não presumir que timeout de todos os monitores cabe na meta.
