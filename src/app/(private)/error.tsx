"use client";

export default function PrivateError({ reset }: { reset: () => void }) {
  return <section role="alert" className="rounded-xl border border-rose-400/30 p-6"><h1 className="text-xl font-semibold">Não foi possível carregar o painel</h1><p className="mt-3 text-slate-400">Tente novamente em instantes.</p><button onClick={reset} className="mt-6 rounded-lg border border-slate-600 px-4 py-2">Tentar novamente</button></section>;
}
