import Link from "next/link";
import { requireUser } from "@/server/session";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 py-6">
        <Link href="/dashboard" className="text-xl font-semibold text-sky-400">↗ LinkWatch</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="max-w-40 truncate text-slate-400">{user.name ?? "Sua conta"}</span>
          <form action={logout}><button className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">Sair</button></form>
        </div>
      </header>
      <main className="py-10">{children}</main>
    </div>
  );
}
