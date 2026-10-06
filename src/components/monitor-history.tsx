import Link from "next/link";
import type { monitorHistory } from "../features/monitors/history";
import { LocalTime } from "./local-time";
import { LatencyChart } from "./latency-chart";

type History = Awaited<ReturnType<typeof monitorHistory>>;
const outcomes = { SUCCESS: "Sucesso", FAILURE: "Falha", BLOCKED: "Bloqueado por segurança", COLLECTOR_ERROR: "Erro de coleta" };
const reasons: Record<string, string> = { TIMEOUT: "Tempo limite", DNS: "Falha de DNS", TLS: "Certificado TLS inválido", CONNECTION: "Falha de conexão", HTTP_STATUS: "Código HTTP inesperado", DNS_POLICY: "DNS fora da política", URL_POLICY: "URL fora da política", CONFIGURATION_CHANGED: "Configuração alterada", SHUTDOWN: "Coletor encerrando" };

export function MonitorHistory({ id, hours, history }: { id: string; hours: number; history: History }) {
  return <>
    <section className="mt-8" aria-labelledby="history-title">
      <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="history-title" className="text-xl font-semibold">Histórico de verificações</h2><nav aria-label="Período do histórico" className="history-periods flex">{[[24, "24 horas"], [168, "7 dias"], [720, "30 dias"]].map(([value, label]) => <Link key={value} href={`/monitors/${id}?hours=${value}`} aria-current={hours === value ? "page" : undefined} className="period px-3 py-2 text-sm">{label}</Link>)}</nav></div>
      <dl className="metrics mt-5 grid sm:grid-cols-3">{[
        ["Disponibilidade observada", history.availability === null ? "Sem dados" : `${history.availability.toFixed(2).replace(".", ",")}%`],
        ["Latência média", history.averageMs === null ? "Sem dados" : `${Math.round(history.averageMs)} ms`],
        ["Latência p95", history.p95Ms === null ? "Sem dados" : `${history.p95Ms} ms`],
      ].map(([label, value]) => <div key={label} className="metric"><dt className="text-sm muted">{label}</dt><dd className="mt-3 text-xl font-semibold">{value}</dd></div>)}</dl>
      <p className="mt-4 text-sm muted">{history.samples} amostras de endpoint · {history.successes} sucessos · {history.operational} resultados operacionais. Disponibilidade por checks, sem garantia de SLA. Latência até os headers, apenas em sucessos.</p>
      <LatencyChart buckets={history.buckets} bucketSeconds={history.bucketSeconds} />
      {(history.stale || history.late > 0 || history.operational > 0 || history.gaps > 0) && <p className="mt-4 rounded-lg border notice-warning p-4 text-sm warning">Há ausência, atraso ou interrupção de coleta. {history.late} checks iniciaram com mais de 30 s de atraso; {history.gaps} lacunas entre observações da revisão atual. Períodos sem checks e erros de coleta ficam fora da disponibilidade.</p>}
      {!history.checks.length ? <p className="mt-5 rounded-xl border border-dashed border-soft p-6 muted">Sem verificações neste período. O worker precisa estar em execução para coletar dados.</p> : <div className="surface mt-5 overflow-x-auto rounded-lg border border-soft"><table className="w-full text-left text-sm"><caption className="p-3 text-left muted">Até 50 verificações recentes · horários no fuso do navegador</caption><thead className="surface muted"><tr>{["Horário", "Resultado", "HTTP", "Latência", "Revisão"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{history.checks.map((check) => <tr key={check.id} className="border-t border-soft"><td className="whitespace-nowrap p-3"><LocalTime value={check.completedAt!.toISOString()} /></td><td className="p-3"><span className={check.outcome === "SUCCESS" ? "positive" : "warning"}>{outcomes[check.outcome!]}</span>{check.errorCode && <p className="mt-1 text-xs muted">{reasons[check.errorCode] ?? "Falha registrada"}</p>}</td><td className="p-3">{check.httpStatus ?? "Sem dados"}</td><td className="whitespace-nowrap p-3">{check.outcome === "SUCCESS" && check.latencyMs !== null ? `${check.latencyMs} ms` : "Sem dados"}</td><td className="p-3">{check.revision}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="mt-8" aria-labelledby="incidents-title"><h2 id="incidents-title" className="text-xl font-semibold">Incidentes</h2>{!history.incidents.length ? <p className="mt-4 muted">Nenhum incidente registrado. Duas falhas consecutivas confirmam uma indisponibilidade.</p> : <ul className="mt-4 space-y-3">{history.incidents.map((incident) => <li key={incident.id} className="rounded-xl border border-soft p-5"><h3 className="font-semibold">{!incident.endedAt ? "Incidente aberto" : incident.endReason === "RECOVERED" ? "Recuperado" : "Encerrado por mudança de configuração"}</h3><p className="mt-2 text-sm muted">Início: <LocalTime value={incident.startedAt.toISOString()} /></p>{incident.endedAt && <p className="mt-2 text-sm muted">Fim: <LocalTime value={incident.endedAt.toISOString()} /> · Duração: {Math.max(0, Math.round((incident.endedAt.getTime() - incident.startedAt.getTime()) / 1000))} s</p>}{incident.startedAt.getTime() < history.now.getTime() - 30 * 86400000 && <p className="mt-2 text-sm warning">Amostras deste incidente podem ter expirado pela retenção de 30 dias.</p>}</li>)}</ul>}</section>
  </>;
}
