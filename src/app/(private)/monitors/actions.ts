"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/session";
import { getDatabase } from "@/server/db";
import { MonitorError, MonitorService } from "@/features/monitors/service";
import type { MonitorFormState } from "@/features/monitors/form-state";

function values(form: FormData) {
  return Object.fromEntries(["name", "url", "intervalSeconds", "timeoutMs", "expectedStatus"].map((key) => [key, String(form.get(key) ?? "")]));
}

function failure(error: unknown, input?: Record<string, string>): MonitorFormState {
  if (error instanceof z.ZodError) return { errors: z.flattenError(error).fieldErrors, message: "Confira os campos destacados.", values: input };
  if (error instanceof MonitorError) {
    const messages = { NOT_FOUND: "Monitor não encontrado.", LIMIT: "Você atingiu o limite de monitores desta conta.", CONFLICT: "Este monitor foi alterado. Recarregue a página antes de tentar novamente." };
    return { message: messages[error.code], values: input };
  }
  console.error(JSON.stringify({ event: "monitor_mutation_failed" }));
  return { message: "Não foi possível salvar. Tente novamente em instantes.", values: input };
}

export async function saveMonitor(_state: MonitorFormState, form: FormData): Promise<MonitorFormState> {
  const user = await requireUser();
  const input = values(form);
  let id: string;
  try {
    const service = new MonitorService(getDatabase());
    const submittedId = String(form.get("id") ?? "");
    const monitor = submittedId ? await service.update(user.id, submittedId, String(form.get("updatedAt") ?? ""), input) : await service.create(user.id, input);
    id = monitor.id;
  } catch (error) { return failure(error, input); }
  revalidatePath("/dashboard");
  revalidatePath(`/monitors/${id}`);
  redirect(`/monitors/${id}`);
}

export async function changeMonitorState(_state: MonitorFormState, form: FormData): Promise<MonitorFormState> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const enabled = form.get("enabled");
  if (enabled !== "true" && enabled !== "false") return { message: "Ação inválida." };
  try { await new MonitorService(getDatabase()).setEnabled(user.id, id, String(form.get("updatedAt") ?? ""), enabled === "true"); }
  catch (error) { return failure(error); }
  revalidatePath("/dashboard");
  revalidatePath(`/monitors/${id}`);
  return {};
}

export async function deleteMonitor(_state: MonitorFormState, form: FormData): Promise<MonitorFormState> {
  const user = await requireUser();
  if (form.get("confirm") !== "on") return { message: "Confirme a exclusão para continuar." };
  try { await new MonitorService(getDatabase()).remove(user.id, String(form.get("id") ?? ""), String(form.get("updatedAt") ?? "")); }
  catch (error) { return failure(error); }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
