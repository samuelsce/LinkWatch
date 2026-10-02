"use client";

import { useActionState } from "react";
import { changeMonitorState, deleteMonitor } from "@/app/(private)/monitors/actions";
import type { MonitorFormState } from "@/features/monitors/form-state";

export function MonitorControls({ id, updatedAt, enabled }: { id: string; updatedAt: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<MonitorFormState, FormData>(changeMonitorState, {});
  const [deletion, remove, deleting] = useActionState<MonitorFormState, FormData>(deleteMonitor, {});
  return (
    <div className="mt-8 space-y-6">
      <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="updatedAt" value={updatedAt} /><input type="hidden" name="enabled" value={String(!enabled)} /><button disabled={pending} className="rounded-lg border border-slate-600 px-5 py-3 hover:bg-slate-800 disabled:opacity-50">{pending ? "Atualizando…" : enabled ? "Pausar monitor" : "Retomar monitor"}</button>{state.message && <p role="alert" className="mt-3 text-rose-300">{state.message}</p>}</form>
      <details className="rounded-lg border border-rose-400/20 p-4"><summary className="cursor-pointer text-rose-300">Excluir monitor</summary><form action={remove} className="mt-4 space-y-4"><input type="hidden" name="id" value={id} /><input type="hidden" name="updatedAt" value={updatedAt} /><p className="text-sm text-slate-400">A exclusão remove também o histórico e os incidentes deste monitor.</p><label className="flex items-center gap-3 text-sm"><input name="confirm" type="checkbox" required className="h-4 w-4" />Confirmo que quero excluir este monitor.</label><button disabled={deleting} className="rounded-lg border border-rose-400/50 px-4 py-2 text-rose-200 hover:bg-rose-400/10 disabled:opacity-50">{deleting ? "Excluindo…" : "Excluir definitivamente"}</button>{deletion.message && <p role="alert" className="text-rose-300">{deletion.message}</p>}</form></details>
    </div>
  );
}
