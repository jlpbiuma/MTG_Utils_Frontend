"use client";

import { useCallback, useEffect, useState, useRef, type ReactNode } from "react";
import { CardImage as Image } from "@/components/card-image";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Library,
  Image as ImageIcon,
} from "lucide-react";
import { PricingProviderSelector } from "@/components/pricing-provider-selector";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { getPriceMovers } from "@/actions/pricing";
import {
  PriceProvider,
  PriceMoverItem,
  PriceMoversResponse,
} from "@/lib/pricing/types";

interface PriceHistoryViewProps {
  initialMarket: PriceMoversResponse | null;
  initialCollection: PriceMoversResponse | null;
}

export function PriceHistoryView({
  initialMarket,
  initialCollection,
}: PriceHistoryViewProps) {
  const [provider, setProvider] = useState<PriceProvider>("cardmarket");
  const [market, setMarket] = useState<PriceMoversResponse | null>(initialMarket);
  const [collection, setCollection] = useState<PriceMoversResponse | null>(
    initialCollection
  );
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PriceMoverItem | null>(null);
  const skipInitialFetch = useRef(true);

  const loadMovers = useCallback(async (nextProvider: PriceProvider) => {
    setLoading(true);
    try {
      const [marketRes, collectionRes] = await Promise.all([
        getPriceMovers({ provider: nextProvider, windowDays: 30, limit: 20, scope: "global" }),
        getPriceMovers({
          provider: nextProvider,
          windowDays: 30,
          limit: 20,
          scope: "collection",
        }),
      ]);
      setMarket(marketRes);
      setCollection(collectionRes);
    } catch (err) {
      console.error("Failed to load price movers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void loadMovers(provider);
  }, [provider, loadMovers]);

  const handleProviderChange = (next: PriceProvider) => {
    setProvider(next);
  };

  const symbol =
    market?.currencySymbol ??
    collection?.currencySymbol ??
    (provider === "mtggoldfish" ? "$" : "€");

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Precios
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
            Top subidas y bajadas · últimos 30 días.
          </p>
        </div>
      </div>

      <PricingProviderSelector
        currentProvider={provider}
        onProviderChange={handleProviderChange}
        onRefreshPrices={async () => {
          await loadMovers(provider);
        }}
        isLoading={loading}
        showMissingNetValue={false}
        showValueSummary={false}
      />

      <MoversSection
        title="Mercado (30 días)"
        subtitle="Movimientos del catálogo con histórico registrado"
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        gainers={market?.gainers ?? []}
        losers={market?.losers ?? []}
        currencySymbol={symbol}
        loading={loading}
        onSelect={setSelected}
      />

      <MoversSection
        title="Mi colección"
        subtitle="Cartas de tu colección que están subiendo o bajando"
        icon={<Library className="h-4 w-4 text-muted-foreground" />}
        gainers={collection?.gainers ?? []}
        losers={collection?.losers ?? []}
        currencySymbol={symbol}
        loading={loading}
        onSelect={setSelected}
        emptyHint="Ninguna carta de tu colección tiene movimientos registrados en 30 días."
      />

      {selected && (
        <CardDetailDialog
          isOpen={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          cardId={selected.catalogId || selected.printingId}
          cardName={selected.cardName}
          imageUri={selected.imageUri}
          defaultTab="prices"
        />
      )}
    </div>
  );
}

function MoversSection({
  title,
  subtitle,
  icon,
  gainers,
  losers,
  currencySymbol,
  loading,
  onSelect,
  emptyHint = "Sin movimientos registrados en 30 días.",
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  gainers: PriceMoverItem[];
  losers: PriceMoverItem[];
  currencySymbol: string;
  loading: boolean;
  onSelect: (item: PriceMoverItem) => void;
  emptyHint?: string;
}) {
  const empty = gainers.length === 0 && losers.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {loading && empty ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando movimientos…</p>
      ) : empty ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MoverColumn
            title="Top subidas"
            tone="up"
            items={gainers}
            currencySymbol={currencySymbol}
            onSelect={onSelect}
          />
          <MoverColumn
            title="Top bajadas"
            tone="down"
            items={losers}
            currencySymbol={currencySymbol}
            onSelect={onSelect}
          />
        </div>
      )}
    </section>
  );
}

function MoverColumn({
  title,
  tone,
  items,
  currencySymbol,
  onSelect,
}: {
  title: string;
  tone: "up" | "down";
  items: PriceMoverItem[];
  currencySymbol: string;
  onSelect: (item: PriceMoverItem) => void;
}) {
  const Icon = tone === "up" ? ArrowUpRight : ArrowDownRight;
  const accent =
    tone === "up"
      ? "text-emerald-400 border-emerald-500/20"
      : "text-rose-400 border-rose-500/20";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-border ${accent}`}>
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground text-center">Sin datos</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={`${tone}-${item.printingId}`}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
              >
                <div className="relative h-12 w-9 shrink-0 rounded overflow-hidden bg-background border border-border">
                  {item.imageUri ? (
                    <Image
                      src={item.imageUri}
                      alt={item.cardName}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {item.cardName}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {(item.setCode || "??").toUpperCase()}
                    {item.collectorNumber ? ` #${item.collectorNumber}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold text-primary">
                    {item.currentPrice.toFixed(2)} {currencySymbol}
                  </p>
                  <p
                    className={`text-[11px] font-mono font-semibold ${
                      item.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.changePct >= 0 ? "+" : ""}
                    {item.changePct.toFixed(1)}% · {item.changeAbs >= 0 ? "+" : ""}
                    {item.changeAbs.toFixed(2)} {currencySymbol}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
