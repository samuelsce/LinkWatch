# Aprendendo com M2: coleta e incidentes

Registro histórico da entrega M2. Para configurar e avaliar a versão atual, consulte o [índice da documentação](README.md) e o [guia de desenvolvimento](DESENVOLVIMENTO.md).

Nesta entrega, o monitor deixa de ser apenas um cadastro: um processo Node faz GET periodicamente, grava a observação e mantém o incidente. A página lê esses registros; fechar o navegador não interrompe o worker.

## Caminho de uma verificação

1. WorkerRuntime pede ao Scheduler tantos monitores quanto os seus slots livres, até cinco.
2. PostgreSQL seleciona monitores vencidos com FOR UPDATE SKIP LOCKED. Um segundo worker pula os que já estão reservados.
3. A transação cria um CheckRun e grava a mesma lease no monitor e no run.
4. O probe valida URL e DNS, conecta ao IP aprovado e classifica o resultado.
5. Outra transação confere a lease e persiste check, estado, incidente e próxima agenda juntos.
6. A página consulta o histórico com propriedade verificada e calcula as métricas no banco.

O intervalo começa na conclusão, usando o relógio do PostgreSQL. Um worker atrasado não fabrica verificações que teriam acontecido durante a ausência.

## URL pública não basta

Um domínio aparentemente público pode resolver para um endereço interno. Por isso verificamos todos os endereços retornados pelo DNS; uma resposta mista também é bloqueada. Depois fixamos o IP validado no lookup da conexão para não fazer outra resolução.

O hostname permanece no pedido e na validação TLS. Trocar toda a URL pelo IP quebraria Host, SNI e certificados. Usamos uma conexão dedicada, sem pooling, seguimos zero redirects e encerramos o corpo após os headers. Um redirect conta apenas como seu código HTTP, se esse for o código esperado.

O timeout cobre DNS, conexão, TLS e headers. Falhas são classificadas em códigos fixos: mensagens originais podem conter URLs/segredos e não vão para os logs. Os testes usam transporte injetado com servidores locais; a configuração de produção não permite liberar localhost.

Referências: [Node HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html) e [OWASP SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## Lease e fencing

Lease é uma reserva com prazo. O token é a prova de qual tentativa ainda está autorizada a concluir. Após crash, outro worker reaproveita o mesmo runId e troca o token. Quando a tentativa antiga retorna, seu resultado é descartado.

O prazo é timeout + 30 s. Pausa e mudança de configuração invalidam a lease. Um índice SQL impede dois ciclos inacabados por monitor. Os caminhos de edição/conclusão bloqueiam Monitor antes de CheckRun para manter a mesma ordem de locks.

Isso garante uma conclusão persistida por ciclo; não garante uma única chamada externa, porque um crash pode acontecer depois do GET e antes do commit. Essa distinção vale também para filas e integrações de pagamento.

updatedAt representa a versão do formulário. Alterar a lease ou registrar um check preserva esse campo; caso contrário, a coleta invalidaria uma edição que o usuário deixou aberta.

## Estado e incidente

Primeira falha: instável. Segunda falha consecutiva: offline e incidente começando na primeira falha. As falhas seguintes mantêm o mesmo incidente. Um sucesso limpa a sequência e encerra o incidente como RECOVERED.

Bloqueio de segurança e erro interno são resultados operacionais: não contam como endpoint offline nem como recuperação. Eles interrompem a sequência consecutiva e não atualizam lastCompletedAt do endpoint. Um incidente existente continua aberto.

Tudo é gravado na mesma transação. O teste provoca uma gravação inválida e confirma que check e estado não ficam parcialmente atualizados.

## Métricas honestas

Se quatro checks tiveram três falhas e um sucesso, a disponibilidade observada é 25%. Isso descreve as amostras, não uma medição contínua de tempo disponível. Sem amostras, mostramos Sem dados. Bloqueios, erros internos e intervalos sem coleta não entram no denominador.

Média e p95 usam apenas sucessos. O p95 nearest-rank de valores 1 a 20 é 19: ceil(0,95 × 20). PostgreSQL percentile_disc calcula esse percentil, sem interpolar valores inexistentes. Os filtros usam UTC; a interface apresenta horários no fuso do navegador.

A tabela limita a 50 checks e 20 incidentes, mas a agregação cobre toda a janela escolhida. A UI avisa sobre resultados operacionais, atrasos e lacunas entre observações da revisão atual; não inventa amostras para completar o gráfico. Gráficos virão em M3.

## Retenção e encerramento

Um cleaner com lease global remove checks concluídos de mais de 30 dias em lotes de mil, no máximo dez por passagem. Se há backlog, repete em uma hora; caso contrário, no dia seguinte. Execuções ativas e incidentes permanecem.

SIGINT/SIGTERM interrompem novas reservas e esperam o trabalho ativo. Após 20 s, os probes recebem abort e a persistência termina antes de desconectar o banco. Uma falha de persistência deixa a lease expirar para recuperação. Esse prazo de probes não substitui timeouts operacionais do banco/provedor.

## Como estudar

Leia nesta ordem: `src/monitoring/probe.ts`, `src/monitoring/scheduler.ts`, `src/domain/check-transition.ts`, `src/worker/runtime.ts`, `src/features/monitors/history.ts`. Depois acompanhe `tests/integration/worker-cycle.test.ts`: ele usa um servidor HTTP real para verificar a queda e a recuperação.

Use `git log --oneline` e `git show <commit>` para comparar os commits de rede, persistência, worker, interface e documentação. Capacidade de 100 monitores e meta de atraso continuam sem teste de carga; deploy e OAuth real ainda dependem da configuração do ambiente.
