"use server";
import { backendFetch } from "@/lib/api-client";
import { getCurrentUserId } from "@/actions/auth";
import { revalidatePath } from "next/cache";
export interface BatchInput {
  setCode?: string | null;
  kind: "prerelease" | "booster_box" | "bundle" | "singles" | "trade" | "other";
  acquiredOn: string;
  costTotal: number;
  shipping: number;
  currency: "EUR" | "USD";
  acknowledgeBudget?: boolean;
  notes?: string | null;
}
export interface Batch extends BatchInput {
  id: string;
  origin: string;
  offerId?: string | null;
}
export interface LotPerformance {
  id: string;
  kind: string;
  currency: string;
  acquiredOn: string;
  notes?: string | null;
  investment: number;
  marketValue: number;
  sellableValue: number;
  copies: number;
  unpricedItems: number;
  roi: number | null;
  points: { date: string; value: number }[];
}
export interface ExpansionPerformance {
  setCode: string;
  releasedAt: string | null;
  baselineDate: string | null;
  definitionVersion: number;
  provider: string;
  ownedSeries: { date: string; value: number; marketValue: number }[];
  index: { date: string; value: number; nCards: number }[];
  lots: LotPerformance[];
  historyNote: string;
}
export interface PerformanceCard {
  id: string;
  cardName: string;
  currentPrice: number | null;
  baselinePrice: number | null;
  baselineDate: string | null;
  peakPrice: number | null;
  changePercent: number | null;
  decks: { id: string; name: string }[];
}
export interface BatchCandidate {
  id: string;
  cardName: string;
  quantity: number;
  isFoil: boolean;
  acquiredAt: string | null;
  assignedHere: number;
  assignedElsewhere: number;
}
export async function getBatches(setCode?: string): Promise<Batch[]> {
  return backendFetch(
    `/api/acquisition-batches${setCode ? `?setCode=${encodeURIComponent(setCode)}` : ""}`,
    { userId: await getCurrentUserId() },
  );
}
export async function saveBatch(
  input: BatchInput,
  id?: string,
): Promise<Batch> {
  const result = await backendFetch<Batch>(
    `/api/acquisition-batches${id ? `/${encodeURIComponent(id)}` : ""}`,
    {
      userId: await getCurrentUserId(),
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    },
  );
  revalidatePath("/collection/expansions");
  return result;
}
export async function deleteBatch(id: string) {
  await backendFetch(`/api/acquisition-batches/${encodeURIComponent(id)}`, {
    userId: await getCurrentUserId(),
    method: "DELETE",
  });
  revalidatePath("/collection/expansions");
}
export async function getBatchCandidates(
  id: string,
  start = "",
  end = "",
): Promise<BatchCandidate[]> {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return backendFetch(
    `/api/acquisition-batches/${encodeURIComponent(id)}/candidates?${params}`,
    { userId: await getCurrentUserId() },
  );
}
export async function assignBatch(
  id: string,
  items: { collectionCardId: string; quantity: number }[],
  remove: string[] = [],
) {
  await backendFetch(
    `/api/acquisition-batches/${encodeURIComponent(id)}/assign`,
    {
      userId: await getCurrentUserId(),
      method: "POST",
      body: JSON.stringify({ items, remove }),
    },
  );
  revalidatePath("/collection/expansions");
}
export async function unassignBatch(id: string, cardId: string) {
  await backendFetch(
    `/api/acquisition-batches/${encodeURIComponent(id)}/assign/${encodeURIComponent(cardId)}`,
    { userId: await getCurrentUserId(), method: "DELETE" },
  );
}
export async function getExpansionPerformance(
  code: string,
): Promise<ExpansionPerformance> {
  return backendFetch(
    `/api/expansions/${encodeURIComponent(code)}/performance`,
    { userId: await getCurrentUserId() },
  );
}
export async function getPerformanceCards(
  code: string,
): Promise<PerformanceCard[]> {
  return backendFetch(`/api/expansions/${encodeURIComponent(code)}/cards`, {
    userId: await getCurrentUserId(),
  });
}
export interface OfferInput {
  origin?: "whatsapp" | "cardmarket" | "in_person" | "other";
  status: "evaluating" | "discarded";
  seller: string | null;
  shipping: number;
  sourceUrl: string | null;
  paidTotal: number | null;
}
export async function updateOffer(id: string, input: OfferInput) {
  await backendFetch(`/api/offers/${encodeURIComponent(id)}`, {
    userId: await getCurrentUserId(),
    method: "PATCH",
    body: JSON.stringify(input),
  });
  revalidatePath("/buy/offers");
}
export async function confirmOffer(
  id: string,
  acquiredOn: string,
  paidTotal: number,
  cardNames?: string[],
): Promise<{ batchId: string; alreadyConfirmed: boolean }> {
  const result = await backendFetch<{
    batchId: string;
    alreadyConfirmed: boolean;
  }>(`/api/offers/${encodeURIComponent(id)}/confirm`, {
    userId: await getCurrentUserId(),
    method: "POST",
    body: JSON.stringify({ acquiredOn, paidTotal, ...(cardNames ? { cardNames } : {}) }),
  });
  for (const path of [
    "/buy/offers",
    "/buy/list",
    "/buy/needs",
    "/collection/inventory",
    "/collection/expansions",
    "/decks",
  ])
    revalidatePath(path);
  return result;
}
export async function getDeckValueHistory(
  id: string,
): Promise<{ points: { date: string; value: number }[]; note: string }> {
  return backendFetch(`/api/decks/${encodeURIComponent(id)}/value-history`, {
    userId: await getCurrentUserId(),
  });
}

export async function getFunctionTargets(
  id: string,
): Promise<{
  targets: Partial<Record<import("@/lib/deck-functions").DeckFunction, number>>;
}> {
  return backendFetch(`/api/decks/${encodeURIComponent(id)}/function-targets`, {
    userId: await getCurrentUserId(),
  });
}
export async function saveFunctionTargets(
  id: string,
  targets: Partial<Record<import("@/lib/deck-functions").DeckFunction, number>>,
) {
  await backendFetch(`/api/decks/${encodeURIComponent(id)}/function-targets`, {
    userId: await getCurrentUserId(),
    method: "PUT",
    body: JSON.stringify({ targets }),
  });
}
