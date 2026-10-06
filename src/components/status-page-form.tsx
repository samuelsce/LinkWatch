"use client";
import { useActionState } from "react";
import { saveStatusPage } from "../app/(private)/status-page/actions";

type Props = { page: { title: string; description: string | null; slug: string; published: boolean; updatedAt: string; monitors: { monitorId: string; publicName: string }[] } | null; monitors: { id: string; name: string }[] };
export function StatusPageForm({ page, monitors }: Props) {
  const [state, action, pending] = useActionState(saveStatusPage, {});
  return <form action={action} className="mt-8 max-w-3xl space-y-6">
    {page && <input type="hidden" name="updatedAt" value={page.updatedAt} />}
    {state.message && <p role={state.success ? "status" : "alert"} className={`rounded-lg border p-4 ${state.success ? "border-green-400/30 text-green-300" : "border-rose-400/30 text-rose-300"}`}>{state.message}</p>}
    <label className="block">Título<input name="title" required maxLength={120} defaultValue={page?.title ?? ""} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /></label>
    <label className="block">Descrição<textarea name="description" maxLength={500} defaultValue={page?.description ?? ""} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /></label>
    <label className="block">Slug público<input name="slug" required minLength={3} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={page?.slug ?? ""} aria-describedby="slug-help" className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /></label>
    <p id="slug-help" className="text-sm text-slate-400">Endereço: /status/seu-slug. Mudar o slug desativa o endereço anterior.</p>
    <fieldset className="space-y-4"><legend className="mb-3 font-semibold">Escolha os serviços publicados</legend><p className="text-sm text-slate-400">Somente os selecionados aparecem. URLs, identidade da conta e erros técnicos ficam privados. Confira os textos abaixo antes de publicar.</p>
      {!monitors.length && <p className="text-slate-400">Cadastre um monitor para selecionar serviços.</p>}
      {monitors.map((monitor) => { const selected = page?.monitors.find((item) => item.monitorId === monitor.id); return <div key={monitor.id} className="rounded-lg border border-slate-800 p-4"><label className="flex items-center gap-3"><input type="checkbox" name="monitorId" value={monitor.id} defaultChecked={!!selected} />{monitor.name}</label><label className="mt-3 block text-sm text-slate-300">Nome público de {monitor.name}<input name={`publicName:${monitor.id}`} maxLength={80} defaultValue={selected?.publicName ?? monitor.name} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2" /></label></div>; })}
    </fieldset>
    <label className="flex items-center gap-3"><input type="checkbox" name="published" defaultChecked={page?.published ?? false} />Publicar página de status</label>
    <button disabled={pending} className="rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60">{pending ? "Salvando…" : "Salvar página de status"}</button>
  </form>;
}
