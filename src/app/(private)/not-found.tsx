import Link from "next/link";

export default function MonitorNotFound() {
  return <section className="py-10"><h1 className="text-3xl font-semibold">Monitor não encontrado</h1><p className="mt-4 muted">O monitor não está disponível nesta conta.</p><Link href="/dashboard" className="mt-6 inline-block link underline">Voltar ao painel</Link></section>;
}
