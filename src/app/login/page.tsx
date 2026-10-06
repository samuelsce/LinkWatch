import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";
import { isGitHubConfigured } from "@/auth";
import { Brand } from "@/components/brand";
import { loginWithGitHub } from "./actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const configured = isGitHubConfigured();
  return <main className="login-shell" id="main-content">
    <aside className="login-aside"><Link href="/" aria-label="LinkWatch, início"><Brand /></Link><div><h2>Um lugar para cuidar dos seus serviços.</h2><p className="mt-5 max-w-sm leading-relaxed muted">Disponibilidade, latência e incidentes. Do seu painel privado à página de status que você compartilha.</p></div><p className="text-sm muted">LinkWatch, por Samuel</p></aside>
    <section className="login-content" aria-labelledby="login-title"><div>
      <h1 id="login-title" className="text-3xl font-semibold tracking-tight">Entre para acompanhar seus serviços</h1>
      <p className="mt-4 leading-relaxed muted">Use sua conta GitHub. Seus monitores ficam em um painel privado.</p>
      {error && <p role="alert" className="mt-6 rounded-lg border notice-error p-4">Não foi possível entrar. Tente novamente ou confira a configuração da OAuth App.</p>}
      {!configured && <div className="mt-6 rounded-lg border notice-warning p-4 text-sm leading-relaxed">O login GitHub ainda precisa ser configurado neste ambiente. <a className="underline" href="https://github.com/samuelsce/LinkWatch/blob/main/docs/OAUTH_SETUP.md">Veja o guia de configuração.</a></div>}
      <form action={loginWithGitHub} className="mt-8"><button disabled={!configured} className="button-primary w-full px-5 py-3">Entrar com GitHub</button></form>
      <p className="mt-6 text-sm muted">O LinkWatch não recebe sua senha do GitHub.</p>
    </div></section>
  </main>;
}
