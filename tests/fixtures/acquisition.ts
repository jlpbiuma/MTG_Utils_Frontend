import type { AcquisitionQuote } from "@/lib/acquisitions";
export const purchaseQuote: AcquisitionQuote = {
  quoteId: "q",
  name: "Compra",
  origin: "other",
  acquiredOn: "2026-01-01",
  subtotal: "40.00",
  shipping: "0.00",
  fee: "0.00",
  total: "40.00",
  costBasis: "trend",
  items: [],
  budget: {
    year: 2026,
    annualLimit: 600,
    monthlyReference: 50,
    spent: 40,
    estimatedSpent: 40,
    remaining: 560,
    excess: 0,
    months: [],
    requiresAcknowledgement: false,
  },
};
