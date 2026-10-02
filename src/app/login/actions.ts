"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { isGitHubConfigured, signIn, signOut } from "@/auth";

export async function loginWithGitHub() {
  if (!isGitHubConfigured()) redirect("/login?error=configuration");
  try {
    await signIn("github", { redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=signin");
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
