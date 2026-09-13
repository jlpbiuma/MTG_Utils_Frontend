"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { DeckSummary } from "@/lib/schemas";

type ImportDeckInput =
  | { name: string; rawText: string; format?: string; commander?: string }
  | string;

export async function importDeckFromText(
  inputOrName: ImportDeckInput,
  rawTextArg?: string,
  formatArg: string = "Commander",
  commanderArg?: string
): Promise<DeckSummary & { deckId: string; error?: string; message?: string }> {
  const userId = await getCurrentUserId();
  let name = "";
  let rawText = "";
  let format = "Commander";
  let commander: string | undefined = undefined;

  if (typeof inputOrName === "object") {
    name = inputOrName.name;
    rawText = inputOrName.rawText;
    format = inputOrName.format || "Commander";
    commander = inputOrName.commander;
  } else {
    name = inputOrName;
    rawText = rawTextArg || "";
    format = formatArg;
    commander = commanderArg;
  }

  const deck = await backendFetch<DeckSummary>("/api/import/deck", {
    method: "POST",
    body: JSON.stringify({
      name,
      text: rawText,
      format,
      commander,
    }),
    userId,
  });

  revalidatePath("/decks");
  return {
    ...deck,
    deckId: deck.id,
  };
}

export async function importDeckFromMoxfieldUrl(
  url: string,
  format?: string
): Promise<(DeckSummary & { deckId: string; error?: string; message?: string }) | { error: string; message?: string; deckId?: string }> {
  try {
    const userId = await getCurrentUserId();
    const deck = await backendFetch<DeckSummary>("/api/import/moxfield", {
      method: "POST",
      body: JSON.stringify({
        url,
        format,
      }),
      userId,
    });

    revalidatePath("/decks");
    return {
      ...deck,
      deckId: deck.id,
    };
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("403") || msg.includes("Cloudflare")) {
      return { error: "CLOUDFLARE_BLOCKED", message: "Bloqueado por Cloudflare" };
    }
    return { error: "FAILED", message: msg || "Error importando de Moxfield" };
  }
}

export async function importCollectionFromText(
  rawText: string,
  requestKey: string
): Promise<{ success: boolean; totalImported: number; uniqueImported: number; importId: string }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ status: string; importedCount: number; uniqueCards: number; importId: string }>("/api/import/collection", {
    method: "POST",
    body: JSON.stringify({ text: rawText, requestKey }),
    userId,
  });

  revalidatePath("/collection");
  revalidatePath("/decks");
  return {
    success: true,
    importId: res.importId,
    totalImported: res.importedCount,
    uniqueImported: res.uniqueCards,
  };
}

export async function getCollectionImportProgress(importId: string) {
  const userId = await getCurrentUserId();
  return backendFetch<{ importId: string; completed: number; pending: number; notFound: number; failed: number; ambiguous: number; enriching: number }>(
    `/api/import/collection/${encodeURIComponent(importId)}`, { userId }
  );
}

export async function retryCollectionImport(importId: string) {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/import/collection/${encodeURIComponent(importId)}/retry`, { userId, method: "POST" });
  return getCollectionImportProgress(importId);
}
