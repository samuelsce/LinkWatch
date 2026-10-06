"use client";
import { useId, useState } from "react";
import type { HistoryBucket } from "../features/monitors/history";
import { LocalTime } from "./local-time";

export function LatencyChart({ buckets, bucketSeconds }: { buckets: HistoryBucket[]; bucketSeconds: number }) {
  const title = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const index = Math.min(selected ?? buckets.length - 1, buckets.length - 1);
  const bucket = buckets[index];
  const max = Math.max(1, ...buckets.map((item) => item.averageMs ?? 0));
  const x = (i: number) => 48 + i / Math.max(1, buckets.length - 1) * 624;
  const y = (value: number) => 180 - value / max * 145;
  const segments: string[] = [];
  let current = "";
  buckets.forEach((item, i) => {
    if (item.averageMs === null) { if (current) segments.push(current); current = ""; }
    else current += `${current ? " L" : "M"}${x(i)},${y(item.averageMs)}`;
  });
  if (current) segments.push(current);
  return <section className="mt-6 rounded-xl border border-soft surface p-4" aria-labelledby={title}>
    <h3 id={title} className="font-semibold">Latência e falhas ao longo do tempo</h3>
    <p className="mt-2 text-sm muted">Média dos sucessos em intervalos de {bucketSeconds / 60} min. Trechos sem média permanecem vazios. Latência até os headers, não tempo de download.</p>
    <svg viewBox="0 0 720 230" className="mt-4 w-full" role="img" aria-label="Gráfico de latência média com marcas de falhas e erros de coleta" onPointerMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setSelected(Math.max(0, Math.min(buckets.length - 1, Math.round(((event.clientX - rect.left) / rect.width * 720 - 48) / 624 * (buckets.length - 1)))));
    }}>
      <title>Latência média por intervalo; falhas não são representadas como zero</title>
      {[0, 0.5, 1].map((fraction) => <g key={fraction}><line x1="48" x2="672" y1={y(max * fraction)} y2={y(max * fraction)} stroke="var(--border)" /><text x="42" y={y(max * fraction) + 4} textAnchor="end" fill="var(--muted)" fontSize="12">{Math.round(max * fraction)}</text></g>)}
      <text x="48" y="20" fill="var(--muted)" fontSize="12">ms</text>
      {segments.map((path, i) => <path key={i} d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />)}
      {buckets.map((item, i) => <g key={item.at}>{item.averageMs !== null && <circle cx={x(i)} cy={y(item.averageMs)} r="2" fill="var(--accent)" />}{item.failures > 0 && <path d={`M${x(i)},195 l4,5 l-4,5 l-4,-5 Z`} fill="var(--negative)" />}{item.operational > 0 && <rect x={x(i) - 3} y="212" width="6" height="6" fill="var(--warning)" />}</g>)}
      {bucket && <line x1={x(index)} x2={x(index)} y1="30" y2="220" stroke="var(--muted)" strokeDasharray="4 4" />}
    </svg>
    {buckets.length > 0 && <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs muted"><span>Início: <LocalTime value={buckets[0]!.at} /></span><span>Último intervalo: <LocalTime value={buckets[buckets.length - 1]!.at} /></span></div>}
    <p className="text-xs muted">Linha azul: latência média. Losango vermelho: falha de endpoint. Quadrado âmbar: resultado operacional.</p>
    <label className="mt-4 block text-sm muted">Intervalo do gráfico<input className="mt-2 block w-full" type="range" min="0" max={Math.max(0, buckets.length - 1)} value={index} onChange={(event) => setSelected(Number(event.target.value))} /></label>
    {bucket && <div className="mt-3 min-h-16 text-sm muted" role="status"><LocalTime value={bucket.at} /> · {bucket.samples} amostras · {bucket.failures} falhas · {bucket.operational} operacionais<p className="mt-1">Latência média: {bucket.averageMs === null ? "Sem dados" : `${Math.round(bucket.averageMs)} ms`}</p></div>}
    <details className="mt-4 text-sm"><summary className="cursor-pointer link">Consultar dados do gráfico em tabela</summary><div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left"><caption className="p-2 text-left">Todos os intervalos da janela selecionada</caption><thead><tr>{["Início", "Amostras", "Falhas", "Operacionais", "Média (ms)"].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{buckets.map((item) => <tr key={item.at} className="border-t border-soft"><td className="whitespace-nowrap p-2"><LocalTime value={item.at} /></td><td className="p-2">{item.samples}</td><td className="p-2">{item.failures}</td><td className="p-2">{item.operational}</td><td className="p-2">{item.averageMs === null ? "Sem dados" : Math.round(item.averageMs)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
