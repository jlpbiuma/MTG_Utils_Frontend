export type PurchaseOrigin = "cardmarket" | "whatsapp" | "in_person" | "other";
export type PurchaseKind =
  | "precon"
  | "mini_collection"
  | "collection"
  | "singles"
  | "other"
  | "prerelease"
  | "booster_box"
  | "bundle"
  | "trade";
export interface BudgetMonth {
  month: number;
  allowance: number;
  spent: number;
  estimatedSpent: number;
  balance: number;
  overMonthlyReference: boolean;
}
export interface AcquisitionBudget {
  year: number;
  annualLimit: number;
  monthlyReference: number;
  spent: number;
  estimatedSpent: number;
  remaining: number;
  excess: number;
  months: BudgetMonth[];
  requiresAcknowledgement?: boolean;
  monthSpent?: number;
}
export interface PurchaseCandidate {
  collectionCardId: string;
  cardName: string;
  printingId: string | null;
  setCode: string | null;
  collectorNumber: string | null;
  setName: string | null;
  isFoil: boolean;
  availableQuantity: number;
  currentPrice: number | null;
}
export interface PurchaseListLine {
  line: number;
  raw: string;
  name: string;
  quantity: number;
  error: string | null;
  errorCode?: string | null;
  ownedQuantity?: number;
  availableQuantity?: number;
  candidates: PurchaseCandidate[];
  suggestions: string[];
}
export interface PurchaseListValidation {
  lines: PurchaseListLine[];
  valid: boolean;
}
export interface HistoricalSelection {
  line: number;
  collectionCardId: string;
  quantity: number;
}
export interface HistoricalPurchaseInput {
  rawText: string;
  name: string;
  kind: PurchaseKind;
  origin: PurchaseOrigin;
  seller: string | null;
  sourceUrl: string | null;
  total: string;
  acquiredOn: string;
  selections: HistoricalSelection[];
}
export interface AcquisitionItem {
  cardName: string;
  printingId: string;
  quantity: number;
  isFoil: boolean;
  setCode?: string | null;
  referenceUnitPrice: string | null;
  referenceObservedOn?: string | null;
  costAmount: string | null;
  purchaseUnitPrice?: string;
}
export interface AcquisitionQuote {
  quoteId: string;
  name: string;
  origin: PurchaseOrigin;
  acquiredOn: string;
  subtotal: string;
  shipping: string;
  fee: string;
  total: string;
  costBasis: "paid" | "trend" | "allocated";
  items: AcquisitionItem[];
  budget: AcquisitionBudget;
}
export interface ExpensePurchase {
  id: string;
  name: string;
  kind: PurchaseKind;
  origin: PurchaseOrigin;
  seller: string | null;
  sourceUrl: string | null;
  acquiredOn: string;
  currency: string;
  costBasis: "paid" | "trend" | "allocated";
  subtotal: number;
  shipping: number;
  fee: number;
  investment: number;
  annulledAt: string | null;
  itemCount: number;
  copies: number;
  pricedItems: number;
  marketValue: number | null;
  initialValue: number | null;
  referenceItems: number;
  complete: boolean;
  profit: number | null;
  roi: number | null;
  marketChange: number | null;
}
export interface ExpenseLedger {
  year: number;
  years: number[];
  budget: AcquisitionBudget;
  purchases: ExpensePurchase[];
}
export interface ExpenseItem {
  id: string;
  cardName: string;
  printingId: string;
  quantity: number;
  isFoil: boolean;
  setCode: string | null;
  collectorNumber: string | null;
  costAmount: number | null;
  referenceUnitPrice: number | null;
  referenceObservedOn: string | null;
  referenceCapturedAt: string | null;
  currentPrice: number | null;
  currentValue: number | null;
  profit: number | null;
  roi: number | null;
  purchaseAmount?: number | null;
}
export interface ExpenseDetail extends ExpensePurchase {
  items: ExpenseItem[];
  points: { date: string; value: number }[];
}
export interface PurchaseProvenance {
  id: string;
  name: string;
  origin: string;
  seller: string | null;
  acquiredOn: string;
  quantity: number;
  costAmount: number | null;
  costBasis: string;
}
export type AcquisitionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; budget?: AcquisitionBudget };
export const originLabels: Record<PurchaseOrigin, string> = {
  cardmarket: "Cardmarket",
  whatsapp: "WhatsApp",
  in_person: "Presencial",
  other: "Otros",
};
export const kindLabels: Record<PurchaseKind, string> = {
  precon: "Preconstruido",
  mini_collection: "Minicolección",
  collection: "Colección",
  singles: "Cartas sueltas",
  other: "Otros",
  prerelease: "Presentación",
  booster_box: "Caja de sobres",
  bundle: "Bundle",
  trade: "Intercambio",
};
export function euro(value: number | string | null | undefined) {
  return value == null
    ? "Sin datos"
    : new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(Number(value));
}
export function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Canary",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
