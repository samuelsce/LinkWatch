"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { saveMonitor } from "@/app/(private)/monitors/actions";
import type { MonitorFormState } from "@/features/monitors/form-state";

export type MonitorFormDefaults = { id?: string; updatedAt?: string; name: string; url: string; intervalSeconds: number; timeoutMs: number; expectedStatus: number };

export function MonitorForm({ initial }: { initial?: MonitorFormDefaults }) {
  const [state, action, pending] = useActionState<MonitorFormState, FormData>(saveMonitor, {});
  const message = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.message) message.current?.focus(); }, [state]);
  const value = (field: keyof MonitorFormDefaults, fallback: string | number) => state.values?.[field] ?? initial?.[field] ?? fallback;
  const error = (field: string) => state.errors?.[field]?.[0];
  const fieldClass = "mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 focus:border-sky-400";
  return (
    <form action={action} className="mt-8 max-w-2xl space-y-6">
      {initial?.id && <><input type="hidden" name="id" value={initial.id} /><input type="hidden" name="updatedAt" value={initial.updatedAt} /></>}
      {state.message && <div ref={message} tabIndex={-1} role="alert" className="rounded-lg border border-rose-400/40 bg-rose-400/10 p-4 text-rose-200">{state.message}</div>}
      <div><label htmlFor="name" className="font-medium">Nome do monitor</label><input id="name" name="name" required maxLength={80} defaultValue={String(value("name", ""))} className={fieldClass} aria-invalid={Boolean(error("name"))} aria-describedby={error("name") ? "name-error" : undefined} />{error("name") && <p id="name-error" className="mt-2 text-sm text-rose-300">{error("name")}</p>}</div>
      <div><label htmlFor="url" className="font-medium">URL pública</label><input id="url" name="url" type="url" required maxLength={2048} placeholder="https://api.exemplo.com/health" defaultValue={String(value("url", ""))} className={fieldClass} aria-invalid={Boolean(error("url"))} aria-describedby={`url-hint${error("url") ? " url-error" : ""}`} /><p id="url-hint" className="mt-2 text-sm text-slate-400">GET em HTTP/HTTPS, portas 80/443. Sem credenciais ou redirecionamentos.</p>{error("url") && <p id="url-error" className="mt-2 text-sm text-rose-300">{error("url")}</p>}</div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div><label htmlFor="intervalSeconds" className="font-medium">Intervalo</label><select id="intervalSeconds" name="intervalSeconds" defaultValue={value("intervalSeconds", 300)} className={fieldClass} aria-invalid={Boolean(error("intervalSeconds"))} aria-describedby={error("intervalSeconds") ? "interval-error" : undefined}><option value="60">1 minuto</option><option value="300">5 minutos</option><option value="900">15 minutos</option></select>{error("intervalSeconds") && <p id="interval-error" className="mt-2 text-sm text-rose-300">{error("intervalSeconds")}</p>}</div>
        <div><label htmlFor="timeoutMs" className="font-medium">Timeout (ms)</label><input id="timeoutMs" name="timeoutMs" type="number" required min={2000} max={15000} step={1} defaultValue={value("timeoutMs", 10000)} className={fieldClass} aria-invalid={Boolean(error("timeoutMs"))} aria-describedby={`timeout-hint${error("timeoutMs") ? " timeout-error" : ""}`} /><p id="timeout-hint" className="mt-2 text-sm text-slate-400">De 2.000 a 15.000 ms (2 a 15 segundos).</p>{error("timeoutMs") && <p id="timeout-error" className="mt-2 text-sm text-rose-300">{error("timeoutMs")}</p>}</div>
      </div>
      <div><label htmlFor="expectedStatus" className="font-medium">Código HTTP esperado</label><input id="expectedStatus" name="expectedStatus" type="number" required min={200} max={599} step={1} defaultValue={value("expectedStatus", 200)} className={fieldClass} aria-invalid={Boolean(error("expectedStatus"))} aria-describedby={error("expectedStatus") ? "status-error" : undefined} />{error("expectedStatus") && <p id="status-error" className="mt-2 text-sm text-rose-300">{error("expectedStatus")}</p>}</div>
      <p className="rounded-lg border border-slate-800 p-4 text-sm leading-relaxed text-slate-400">Nesta entrega, o monitoramento automático ainda não está ativo. O monitor será cadastrado com o estado “Aguardando primeira verificação”. Alterar o endpoint encerra incidentes anteriores por mudança de configuração.</p>
      <div className="flex flex-wrap items-center gap-4"><button disabled={pending} className="rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50">{pending ? "Salvando…" : initial?.id ? "Salvar alterações" : "Criar monitor"}</button><Link href={initial?.id ? `/monitors/${initial.id}` : "/dashboard"} className="px-2 py-3 text-slate-300">Cancelar</Link></div>
    </form>
  );
}
