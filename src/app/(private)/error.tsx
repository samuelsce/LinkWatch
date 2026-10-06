"use client";

export default function PrivateError({ reset }: { reset: () => void }) {
  return <section role="alert" className="rounded-xl border border-negative p-6"><h1 className="text-xl font-semibold">Não foi possível carregar o painel</h1><p className="mt-3 muted">Tente novamente em instantes.</p><button onClick={reset} className="button-secondary mt-6 px-4 py-2">Tentar novamente</button></section>;
}
