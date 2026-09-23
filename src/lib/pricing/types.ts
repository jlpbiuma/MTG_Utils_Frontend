export type PriceProvider = "cardmarket" | "cardtrader" | "mtggoldfish";

export type Currency = "EUR" | "USD";

// JSON response contracts from backend/src/schemas/pricing.py.
export type MoversScope = "global" | "collection" | "wants";

export interface PriceHistoryPoint {
  provider: PriceProvider;
  currency: string;
  trendPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  recordedAt: string;
}

export interface PriceMoverItem {
  printingId: string;
  catalogId?: string | null;
  cardName: string;
  setCode?: string | null;
  collectorNumber?: string | null;
  imageUri?: string | null;
  provider: PriceProvider;
  currency: string;
  currencySymbol: string;
  currentPrice: number;
  baselinePrice: number;
  changeAbs: number;
  changePct: number;
  baselineAt: string;
  currentAt: string;
}

export interface PriceMoversResponse {
  provider: PriceProvider;
  currency: string;
  currencySymbol: string;
  windowDays: number;
  scope: MoversScope;
  gainers: PriceMoverItem[];
  losers: PriceMoverItem[];
  generatedAt: string;
}

export interface CardExpansionRelease {
  setCode: string;
  setName: string;
  releasedAt?: string | null;
  iconSvgUri?: string | null;
  collectorNumber?: string | null;
  printingId?: string | null;
  trendPrice?: number | null;
}

export interface PrintingPriceSeries {
  printingId: string;
  setCode: string;
  collectorNumber: string;
  setName?: string | null;
  releasedAt?: string | null;
  rarity?: string | null;
  iconSvgUri?: string | null;
  imageUri?: string | null;
  points: PriceHistoryPoint[];
}

export interface CardPriceHistoryResponse {
  catalogId: string;
  cardName?: string | null;
  provider: PriceProvider;
  currency: string;
  days?: number | null;
  series: PrintingPriceSeries[];
  expansions: CardExpansionRelease[];
}

export interface CollectionValueHistoryPoint {
  date: string;
  totalValue: number;
  ownedCards: number;
}

export interface CollectionValueHistoryResponse {
  provider: PriceProvider;
  currency: string;
  currencySymbol: string;
  currentValue: number;
  points: CollectionValueHistoryPoint[];
}

export interface UnitPriceBreakdown {
  trend: number;
  min: number;
  max: number;
}

export interface CardPriceQuote {
  cardName: string;
  scryfallId?: string;
  provider: PriceProvider;
  currency: Currency;
  currencySymbol: string;
  unitPrice: UnitPriceBreakdown;
  quantity: number;
  subtotal: number; // quantity * unitPrice.trend
  purchaseUrl?: string;
  lastUpdated: string;
}

export interface PriceSummary {
  provider: PriceProvider;
  currency: Currency;
  currencySymbol: string;
  totalCards: number;
  totalNetValue: number;      // Net total of all cards (trend price)
  totalOwnedValue?: number;   // Net total of owned cards
  totalMissingValue?: number; // Cost to complete the deck (missing cards only)
  quotes: Record<string, CardPriceQuote>; // Keyed by normalized name or scryfall ID
  lastUpdated?: string;
}

export interface PriceProviderConfig {
  name: string;
  id: PriceProvider;
  currency: Currency;
  currencySymbol: string;
  description: string;
  logoText: string;
}

export const PRICE_PROVIDERS: Record<PriceProvider, PriceProviderConfig> = {
  cardmarket: {
    id: "cardmarket",
    name: "Cardmarket (MKM)",
    currency: "EUR",
    currencySymbol: "€",
    description: "Referencia europea líder con precios promedio, mínimo y máximo en Euros.",
    logoText: "MKM",
  },
  cardtrader: {
    id: "cardtrader",
    name: "Card Trader",
    currency: "EUR",
    currencySymbol: "€",
    description: "Mercado global directo con cotizaciones de vendedores en tiempo real.",
    logoText: "CT",
  },
  mtggoldfish: {
    id: "mtggoldfish",
    name: "MTGGoldfish",
    currency: "USD",
    currencySymbol: "$",
    description: "Referencia de metajuego y mercado de papel estadounidense en Dólares.",
    logoText: "GF",
  },
};
