"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { getDatabase } from "@/server/db";
import { StatusPageError, StatusPageService } from "@/features/status-pages/service";
import { z } from "zod";

export type StatusFormState = { message?: string; success?: boolean };
export async function saveStatusPage(_state: StatusFormState, form: FormData): Promise<StatusFormState> {
  const user = await requireUser();
  try {
    const service = new StatusPageService(getDatabase());
    const previous = await service.get(user.id);
    const ids = form.getAll("monitorId").map(String);
    const page = await service.save(user.id, {
      title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""),
      slug: String(form.get("slug") ?? ""), published: form.get("published") === "on",
      updatedAt: form.get("updatedAt") ? String(form.get("updatedAt")) : undefined,
      monitors: ids.map((id) => ({ id, publicName: String(form.get(`publicName:${id}`) ?? "") })),
    });
    revalidatePath("/status-page");
    revalidatePath(`/status/${page.slug}`);
    if (previous && previous.slug !== page.slug) revalidatePath(`/status/${previous.slug}`);
    return { message: "Página de status salva.", success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { message: "Confira título, slug e nomes públicos. Use um slug de 3 a 80 letras minúsculas, números e hífens." };
    if (error instanceof StatusPageError) return { message: {
      NOT_FOUND: "Seleção de monitores inválida.", CONFLICT: "A configuração foi alterada. Recarregue antes de salvar.", SLUG_TAKEN: "Este slug já está em uso. Escolha outro.",
    }[error.code] };
    console.error(JSON.stringify({ event: "status_page_save_failed" }));
    return { message: "Não foi possível salvar. Tente novamente." };
  }
}
