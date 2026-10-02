import "server-only";
import { auth } from "../auth";
import { redirect } from "next/navigation";
import { cache } from "react";

export const currentUser = cache(async () => {
  if (!process.env.AUTH_SECRET) return null;
  const session = await auth();
  return session?.user?.id ? { ...session.user, id: session.user.id } : null;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
