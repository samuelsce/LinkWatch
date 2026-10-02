import Link from "next/link";

const stages = [
  { number: "01", title: "Cadastre seus serviços", description: "Sites e endpoints HTTP em um único lugar." },
  { number: "02", title: "Acompanhe cada verificação", description: "Histórico de disponibilidade, latência e incidentes." },
  { number: "03", title: "Compartilhe o status", description: "Uma página pública com os serviços que você escolher." },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 py-7">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight" aria-label="LinkWatch, início">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400 font-bold text-slate-950">↗</span>
          LinkWatch
        </Link>
        <Link className="text-sm text-slate-300 hover:text-white" href="/login">Entrar com GitHub →</Link>
      </header>
      <main className="flex-1 py-16 sm:py-24">
        <p className="mb-6 inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-sm text-sky-300">Em desenvolvimento · Cadastro de monitores</p>
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">Seus serviços online.<br /><span className="text-sky-400">Você por dentro.</span></h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">Um lugar para acompanhar a disponibilidade de sites e APIs, investigar incidentes e comunicar o estado dos seus serviços.</p>
        <Link href="/dashboard" className="mt-9 inline-block rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-300">Abrir meu painel →</Link>
        <section aria-labelledby="planned-features" className="mt-20">
          <h2 id="planned-features" className="mb-6 text-sm font-medium tracking-widest text-slate-400 uppercase">O que estamos construindo</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {stages.map((stage) => (
              <article key={stage.number} className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
                <span className="font-mono text-sm text-sky-400">{stage.number}</span>
                <h3 className="mt-6 text-lg font-semibold">{stage.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{stage.description}</p>
              </article>
            ))}
          </div>
        </section>
        <p className="mt-8 text-sm leading-relaxed text-slate-400">Login e cadastro disponíveis em ambientes configurados. Monitoramento automático e página pública de status estão em desenvolvimento.</p>
      </main>
      <footer className="border-t border-slate-800 py-6 text-sm text-slate-400">LinkWatch · Construído por Samuel · Next.js + TypeScript</footer>
    </div>
  );
}
