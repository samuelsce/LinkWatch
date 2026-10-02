import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";
import { isGitHubConfigured } from "@/auth";
import { loginWithGitHub } from "./actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const configured = isGitHubConfigured();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10 text-xl font-semibold text-sky-400">↗ LinkWatch</Link>
      <h1 className="text-3xl font-semibold tracking-tight">Entre para acompanhar seus serviços</h1>
      <p className="mt-4 leading-relaxed text-slate-400">Use sua conta GitHub. Seus monitores ficam em um painel privado.</p>
      {error && <p role="alert" className="mt-6 rounded-lg border border-rose-400/40 bg-rose-400/10 p-4 text-rose-200">Não foi possível entrar. Tente novamente ou confira a configuração da OAuth App.</p>}
      {!configured && <div className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-relaxed text-amber-100">O login GitHub ainda precisa ser configurado neste ambiente. <a className="underline" href="https://github.com/samuelsce/LinkWatch/blob/main/docs/OAUTH_SETUP.md">Veja o guia de configuração.</a></div>}
      <form action={loginWithGitHub} className="mt-8">
        <button disabled={!configured} className="w-full rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40">Entrar com GitHub</button>
      </form>
      <p className="mt-6 text-sm text-slate-400">O LinkWatch não recebe sua senha do GitHub.</p>
    </main>
  );
}
