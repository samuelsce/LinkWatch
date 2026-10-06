import type { Metadata } from "next";
import { themeInitScript } from "@/config/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkWatch | Monitor de sites e APIs",
  description: "Acompanhe disponibilidade, latência e incidentes dos seus serviços.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
