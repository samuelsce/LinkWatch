import { z } from "zod";
import ipaddr from "ipaddr.js";

export function publicHttpUrl(value: string): boolean {
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) return false;
    if (url.port && !["80", "443"].includes(url.port)) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (ipaddr.isValid(host)) return ipaddr.process(host).range() === "unicast";
    if (!host.includes(".") || host === "localhost" || /\.(localhost|local|internal|test|invalid|example)$/.test(host)) return false;
    return /^[a-z0-9.-]+$/.test(host);
  } catch { return false; }
}

export const monitorInput = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80, "Use até 80 caracteres."),
  url: z.string().trim().max(2048, "Use até 2.048 caracteres.")
    .refine(publicHttpUrl, "Use uma URL HTTP/HTTPS pública, sem credenciais, fragmento ou portas fora de 80/443.")
    .transform((value) => new URL(value).href),
  intervalSeconds: z.coerce.number().pipe(z.union([z.literal(60), z.literal(300), z.literal(900)], { error: "Escolha 1, 5 ou 15 minutos." })),
  timeoutMs: z.coerce.number().int("Informe um timeout inteiro.").min(2000, "O mínimo é 2 segundos.").max(15000, "O máximo é 15 segundos."),
  expectedStatus: z.coerce.number().int("Informe um código HTTP inteiro.").min(200, "Use um código de 200 a 599.").max(599, "Use um código de 200 a 599."),
});

export type MonitorInput = z.output<typeof monitorInput>;
export const monitorId = z.uuid();
export const expectedUpdate = z.iso.datetime({ offset: true });

export function readMonitorLimit(env: Record<string, string | undefined> = process.env) {
  const limit = Number(env.MONITOR_LIMIT ?? "10");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("MONITOR_LIMIT must be an integer between 1 and 100.");
  return limit;
}
