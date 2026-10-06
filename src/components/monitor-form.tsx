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
  const fieldClass = "field mt-2 w-full rounded-md border px-3 py-3";
  return (
    <form action={action} className="form-panel mt-8 max-w-2xl space-y-6">
      {initial?.id && <><input type="hidden" name="id" value={initial.id} /><input type="hidden" name="updatedAt" value={initial.updatedAt} /></>}
      {state.message && <div ref={message} tabIndex={-1} role="alert" className="rounded-lg border notice-error p-4 negative">{state.message}</div>}
      <div><label htmlFor="name" className="font-medium">Nome do monitor</label><input id="name" name="name" required maxLength={80} defaultValue={String(value("name", ""))} className={fieldClass} aria-invalid={Boolean(error("name"))} aria-describedby={error("name") ? "name-error" : undefined} />{error("name") && <p id="name-error" className="mt-2 text-sm negative">{error("name")}</p>}</div>
      <div><label htmlFor="url" className="font-medium">URL pública</label><input id="url" name="url" type="url" required maxLength={2048} placeholder="https://api.exemplo.com/health" defaultValue={String(value("url", ""))} className={fieldClass} aria-invalid={Boolean(error("url"))} aria-describedby={`url-hint${error("url") ? " url-error" : ""}`} /><p id="url-hint" className="mt-2 text-sm muted">GET em HTTP/HTTPS, portas 80/443. Sem credenciais ou redirecionamentos.</p>{error("url") && <p id="url-error" className="mt-2 text-sm negative">{error("url")}</p>}</div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div><label htmlFor="intervalSeconds" className="font-medium">Intervalo</label><select id="intervalSeconds" name="intervalSeconds" defaultValue={value("intervalSeconds", 300)} className={fieldClass} aria-invalid={Boolean(error("intervalSeconds"))} aria-describedby={error("intervalSeconds") ? "interval-error" : undefined}><option value="60">1 minuto</option><option value="300">5 minutos</option><option value="900">15 minutos</option></select>{error("intervalSeconds") && <p id="interval-error" className="mt-2 text-sm negative">{error("intervalSeconds")}</p>}</div>
        <div><label htmlFor="timeoutMs" className="font-medium">Timeout (ms)</label><input id="timeoutMs" name="timeoutMs" type="number" required min={2000} max={15000} step={1} defaultValue={value("timeoutMs", 10000)} className={fieldClass} aria-invalid={Boolean(error("timeoutMs"))} aria-describedby={`timeout-hint${error("timeoutMs") ? " timeout-error" : ""}`} /><p id="timeout-hint" className="mt-2 text-sm muted">De 2.000 a 15.000 ms (2 a 15 segundos).</p>{error("timeoutMs") && <p id="timeout-error" className="mt-2 text-sm negative">{error("timeoutMs")}</p>}</div>
      </div>
      <div><label htmlFor="expectedStatus" className="font-medium">Código HTTP esperado</label><input id="expectedStatus" name="expectedStatus" type="number" required min={200} max={599} step={1} defaultValue={value("expectedStatus", 200)} className={fieldClass} aria-invalid={Boolean(error("expectedStatus"))} aria-describedby={error("expectedStatus") ? "status-error" : undefined} />{error("expectedStatus") && <p id="status-error" className="mt-2 text-sm negative">{error("expectedStatus")}</p>}</div>
      <p className="rounded-lg border border-soft p-4 text-sm leading-relaxed muted">O monitor começa aguardando a primeira verificação. A coleta automática depende do serviço de monitoramento em execução. Alterar a URL encerra incidentes anteriores por mudança de configuração.</p>
      <div className="flex flex-wrap items-center gap-4"><button disabled={pending} className="button-primary px-5 py-3">{pending ? "Salvando…" : initial?.id ? "Salvar alterações" : "Criar monitor"}</button><Link href={initial?.id ? `/monitors/${initial.id}` : "/dashboard"} className="px-2 py-3 muted">Cancelar</Link></div>
    </form>
  );
}
