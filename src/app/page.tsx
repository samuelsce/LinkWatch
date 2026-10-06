import Link from "next/link";
import { Brand } from "@/components/brand";

const features = [
  ["Saiba quando algo muda", "Verificações automáticas e incidentes com início e recuperação registrados."],
  ["Investigue com dados", "Consulte a disponibilidade observada e a latência de cada serviço em diferentes períodos."],
  ["Mantenha as pessoas informadas", "Publique uma página de status com os serviços que escolher compartilhar."],
];

export default function Home() {
  return <div className="site-width">
    <header className="site-header"><Link href="/" aria-label="LinkWatch, início"><Brand /></Link><Link className="link text-sm font-medium" href="/login">Entrar com GitHub</Link></header>
    <main id="main-content">
      <section className="hero" aria-labelledby="home-title">
        <div><h1 id="home-title">Seus serviços online.<br />Sem perder de vista.</h1><p className="hero-copy">Acompanhe seus sites e APIs, entenda as interrupções e compartilhe o status em um só lugar.</p><Link href="/dashboard" className="button-primary px-6 py-3">Abrir meu painel</Link><p className="mt-4 text-sm muted">Acesso com sua conta GitHub.</p></div>
        <figure className="demo" aria-labelledby="demo-caption">
          <figcaption id="demo-caption" className="demo-heading"><span className="font-semibold">Visão dos serviços</span><span className="muted">Exemplo ilustrativo</span></figcaption>
          <div className="demo-row"><span className="font-semibold">API principal</span><span className="positive"><span className="status-dot" aria-hidden="true" />Online</span><small>Disponibilidade observada</small><small>99,96%</small></div>
          <div className="demo-row"><span className="font-semibold">Site institucional</span><span className="positive"><span className="status-dot" aria-hidden="true" />Online</span><small>Disponibilidade observada</small><small>100,00%</small></div>
          <div className="demo-chart"><div className="flex items-center justify-between text-sm"><span className="muted">Latência da API</span><span className="font-semibold">82 ms</span></div><svg viewBox="0 0 400 110" className="mt-4 w-full" fill="none" role="img" aria-label="Curva ilustrativa de latência; não representa dados reais"><path d="M0 30H400M0 65H400M0 100H400" stroke="var(--border)" /><path className="signal-trace" d="M0 78L18 74L36 79L54 64L72 68L90 75L108 71L126 77L144 67L162 70L180 42L198 50L216 72L234 70L252 78L270 66L288 69L306 61L324 72L342 75L360 64L378 70L400 67" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex justify-between pb-2 text-xs muted"><span>Há 24 horas</span><span>Agora</span></div></div>
        </figure>
      </section>
      <section className="feature-section" aria-labelledby="features-title"><h2 id="features-title">Da primeira verificação à recuperação.</h2><div>{features.map(([title, description]) => <article className="feature-item" key={title}><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    </main>
    <footer className="site-footer"><span>LinkWatch, por Samuel</span><a className="link" href="https://github.com/samuelsce/LinkWatch">Conhecer o projeto no GitHub</a></footer>
  </div>;
}
