"use client";
import { useActionState } from "react";
import { saveStatusPage } from "../app/(private)/status-page/actions";

type Props = { page: { title: string; description: string | null; slug: string; published: boolean; updatedAt: string; monitors: { monitorId: string; publicName: string }[] } | null; monitors: { id: string; name: string }[] };
export function StatusPageForm({ page, monitors }: Props) {
  const [state, action, pending] = useActionState(saveStatusPage, {});
  return <form action={action} className="form-panel mt-8 max-w-3xl space-y-6">
    {page && <input type="hidden" name="updatedAt" value={page.updatedAt} />}
    {state.message && <p role={state.success ? "status" : "alert"} className={`rounded-lg border p-4 ${state.success ? "border-[#b9d8c7] positive" : "border-[#edccd0] negative"}`}>{state.message}</p>}
    <label className="block">Título<input name="title" required maxLength={120} defaultValue={page?.title ?? ""} className="mt-2 block w-full field rounded-md border p-3" /></label>
    <label className="block">Descrição<textarea name="description" maxLength={500} defaultValue={page?.description ?? ""} className="mt-2 block w-full field rounded-md border p-3" /></label>
    <label className="block">Slug público<input name="slug" required minLength={3} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={page?.slug ?? ""} aria-describedby="slug-help" className="mt-2 block w-full field rounded-md border p-3" /></label>
    <p id="slug-help" className="text-sm muted">Endereço: /status/seu-slug. Mudar o slug desativa o endereço anterior.</p>
    <fieldset className="space-y-4"><legend className="mb-3 font-semibold">Escolha os serviços publicados</legend><p className="text-sm muted">Somente os selecionados aparecem. URLs, identidade da conta e erros técnicos ficam privados. Confira os textos abaixo antes de publicar.</p>
      {!monitors.length && <p className="muted">Cadastre um monitor para selecionar serviços.</p>}
      {monitors.map((monitor) => { const selected = page?.monitors.find((item) => item.monitorId === monitor.id); return <div key={monitor.id} className="rounded-lg border border-soft p-4"><label className="flex items-center gap-3"><input type="checkbox" name="monitorId" value={monitor.id} defaultChecked={!!selected} />{monitor.name}</label><label className="mt-3 block text-sm muted">Nome público de {monitor.name}<input name={`publicName:${monitor.id}`} maxLength={80} defaultValue={selected?.publicName ?? monitor.name} className="mt-2 block w-full field rounded-md border p-3" /></label></div>; })}
    </fieldset>
    <label className="flex items-center gap-3"><input type="checkbox" name="published" defaultChecked={page?.published ?? false} />Publicar página de status</label>
    <button disabled={pending} className="button-primary px-5 py-3">{pending ? "Salvando…" : "Salvar página de status"}</button>
  </form>;
}
