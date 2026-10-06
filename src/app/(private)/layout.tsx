import Link from "next/link";
import { requireUser } from "@/server/session";
import { Brand } from "@/components/brand";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="min-h-screen">
    <header className="app-header"><div className="site-width app-header-inner">
      <Link href="/dashboard" aria-label="LinkWatch, painel"><Brand /></Link>
      <nav className="app-navigation" aria-label="Navegação principal">
        <Link href="/dashboard" className="link">Monitores</Link>
        <Link href="/status-page" className="link">Página de status</Link>
        <span className="hidden max-w-40 truncate muted sm:block">{user.name ?? "Sua conta"}</span>
        <form action={logout}><button className="button-secondary px-4 py-2">Sair</button></form>
      </nav>
    </div></header>
    <main className="site-width app-main" id="main-content">{children}</main>
  </div>;
}
