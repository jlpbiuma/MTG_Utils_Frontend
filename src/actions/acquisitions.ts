"use server";
import { backendFetch, BackendRequestError } from "@/lib/api-client";
import { getCurrentUserId } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import type {
  AcquisitionResult,
  AcquisitionQuote,
  ExpenseLedger,
  ExpenseDetail,
  HistoricalPurchaseInput,
  PurchaseListValidation,
  PurchaseProvenance,
} from "@/lib/acquisitions";

async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<AcquisitionResult<T>> {
  try {
    return {
      ok: true,
      data: await backendFetch<T>(`/api/acquisitions${path}`, {
        userId: await getCurrentUserId(),
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    };
  } catch (error) {
    if (error instanceof BackendRequestError) {
      const detail = error.detail;
      if (detail && typeof detail === "object" && "message" in detail) {
        const message =
          typeof detail.message === "string"
            ? detail.message
            : error.userMessage;
        return {
          ok: false,
          error: message,
          code: "code" in detail ? String(detail.code) : undefined,
          budget:
            "budget" in detail
              ? (detail.budget as import("@/lib/acquisitions").AcquisitionBudget)
              : undefined,
        };
      }
      return { ok: false, error: error.userMessage };
    }
    return {
      ok: false,
      error: "No se pudo completar la solicitud. Inténtalo de nuevo.",
    };
  }
}
export async function validatePurchaseList(rawText: string) {
  return request<PurchaseListValidation>("/validate-list", "POST", { rawText });
}
export async function prepareHistoricalPurchase(
  input: HistoricalPurchaseInput,
) {
  return request<AcquisitionQuote>("/historical/quote", "POST", input);
}
export async function prepareInventoryPurchase(input: {
  printingId: string;
  quantity: number;
  isFoil?: boolean;
  acquiredOn: string;
  name?: string;
}) {
  return request<AcquisitionQuote>("/inventory/quote", "POST", input);
}
export async function prepareOfferPurchase(
  offerId: string,
  input: {
    acquiredOn: string;
    cardNames?: string[];
    valuationRevision?: string | null;
    purchasePrices?: Record<string, string>;
  },
) {
  return request<AcquisitionQuote>(
    `/offers/${encodeURIComponent(offerId)}/quote`,
    "POST",
    input,
  );
}
export async function commitPurchase(
  quoteId: string,
  acknowledgeBudget = false,
) {
  const result = await request<{ batchId: string; alreadyConfirmed: boolean }>(
    "/confirm",
    "POST",
    { quoteId, acknowledgeBudget },
  );
  if (result.ok) refreshAcquisitionViews();
  return result;
}
function refreshAcquisitionViews() {
  for (const path of [
    "/buy/expenses",
    "/buy/offers",
    "/buy/needs",
    "/buy/list",
    "/collection/inventory",
    "/collection/expansions",
    "/decks",
  ])
    revalidatePath(path);
}
export async function getExpenseLedger(year?: number) {
  return request<ExpenseLedger>(`/expenses${year ? `?year=${year}` : ""}`);
}
export async function getExpenseDetail(id: string) {
  return request<ExpenseDetail>(`/${encodeURIComponent(id)}`);
}
export async function editExpense(
  id: string,
  input: {
    name: string;
    acquiredOn: string;
    total: string;
    seller: string | null;
    acknowledgeBudget?: boolean;
    shipping?: string;
    purchasePrices?: Record<string, string>;
  },
) {
  const result = await request<ExpenseDetail>(
    `/${encodeURIComponent(id)}`,
    "PATCH",
    input,
  );
  if (result.ok) refreshAcquisitionViews();
  return result;
}
export async function annulExpense(id: string) {
  const result = await request<{ annulled: boolean }>(
    `/${encodeURIComponent(id)}/annul`,
    "POST",
  );
  if (result.ok) refreshAcquisitionViews();
  return result;
}
export async function getPurchaseProvenance(id: string) {
  return request<PurchaseProvenance[]>(`/provenance/${encodeURIComponent(id)}`);
}
