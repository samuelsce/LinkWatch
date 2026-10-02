import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkWatch — Monitor de sites e APIs",
  description: "Acompanhe disponibilidade, latência e incidentes dos seus serviços.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
