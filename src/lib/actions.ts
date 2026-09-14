"use server";

import { redirect } from "next/navigation";
import { resolvePaperId } from "./brief";

export type AroundState = { error?: string };

export async function aroundPaper(
  _prev: AroundState,
  formData: FormData,
): Promise<AroundState> {
  const q = String(formData.get("q") ?? "").trim();
  if (!q) {
    return { error: "Paste an arXiv, DOI, AlphaXiv, or tweet link." };
  }
  try {
    const id = await resolvePaperId(q);
    if (!id) {
      return {
        error: "Could not find a paper in that. Try an arXiv abs link.",
      };
    }
    redirect(`/p/${id}`);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String((error as { digest?: string }).digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;
    const message =
      error instanceof Error ? error.message : "Lookup failed.";
    return { error: message };
  }
}
