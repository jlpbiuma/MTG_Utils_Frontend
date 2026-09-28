"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExpansionValueChart } from "@/components/expansion-value-chart";
import { ArrowLeft, Search, Layers3, LoaderCircle, PackageOpen, Sparkles } from "lucide-react";
import { addOrIncrementCard } from "@/actions/collection";
import { getExpansionCards, getExpansions, getExpansionValueHistory, setExpansionMissingAcquisitionDates, type Expansion, type ExpansionCard, type ExpansionValueHistory } from "@/actions/expansions";
import { CardImage } from "@/components/card-image";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { filterExpansions, getExpansionProgress, organizeExpansionCards, summarizeAcquisitionBalance, type ExpansionFilter, type ExpansionGroup, type ExpansionSort, type SortDirection } from "@/lib/expansions";

const PAGE_SIZE = 60;
const formatPrice = (price?: number | null) => price == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(price);
const formatDelta = (value?: number | null, digits = 2) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const formatAcquiredDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;

function SetIcon({ code, iconUri, className }: { code: string; iconUri?: string | null; className: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = iconUri && !iconUri.startsWith("s3://") && failedSource !== iconUri
    ? iconUri
    : `https://svgs.scryfall.io/sets/${code}.svg`;
  const handleError = () => setFailedSource(source);
  if (failedSource === source && source.startsWith("https://svgs.scryfall.io/")) {
    return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-semibold uppercase text-muted-foreground ${className}`}>{code.slice(0, 3)}</span>;
  }
  return <CardImage src={source} alt="" width={40} height={40} onError={handleError} className={`shrink-0 opacity-80 brightness-0 invert ${className}`} />;
}

export function ExpansionsView() {
  const [expansions, setExpansions] = useState<Expansion[]>([]);
  const [selected, setSelected] = useState<Expansion | null>(null);
  const [cards, setCards] = useState<ExpansionCard[]>([]);
  const [valueHistory, setValueHistory] = useState<ExpansionValueHistory | null>(null);
  const [historyDays, setHistoryDays] = useState(7);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [trendBasis, setTrendBasis] = useState<"acquisition" | "7d">("acquisition");
  const [bulkAcquisitionDate, setBulkAcquisitionDate] = useState("");
  const [savingBulkAcquisitionDate, setSavingBulkAcquisitionDate] = useState(false);
  const [bulkAcquisitionError, setBulkAcquisitionError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ExpansionCard | null>(null);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const requestId = useRef(0);
  const historyRequestId = useRef(0);
  const [setSearch, setSetSearch] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [status, setStatus] = useState<ExpansionFilter>("all");
  const [sort, setSort] = useState<ExpansionSort>("number");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [group, setGroup] = useState<ExpansionGroup>("none");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    getExpansions().then((result) => { if (active) setExpansions(result); }).finally(() => { if (active) setLoadingSets(false); });
    return () => { active = false; };
  }, []);

  async function openExpansion(expansion: Expansion) {
    const currentRequest = ++requestId.current;
    setSelected(expansion);
    setCards([]);
    setCardsError(null);
    setCardSearch("");
    setStatus("all");
    setPage(1);
    setLoadingCards(true);
    setHistoryDays(7);
    setValueHistory(null);
    setHistoryError(false);
    setHistoryLoading(true);
    const historyRequest = ++historyRequestId.current;
    getExpansionValueHistory(expansion.code, 7).then((history) => {
      if (currentRequest === requestId.current && historyRequest === historyRequestId.current) setValueHistory(history);
    }).catch(() => {
      if (currentRequest === requestId.current && historyRequest === historyRequestId.current) setHistoryError(true);
    }).finally(() => {
      if (currentRequest === requestId.current && historyRequest === historyRequestId.current) setHistoryLoading(false);
    });
    try {
      const result = await getExpansionCards(expansion.code);
      if (currentRequest !== requestId.current) return;
      setCards(result);
    } catch {
      if (currentRequest !== requestId.current) return;
      setCardsError("No se pudieron cargar las cartas. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      if (currentRequest === requestId.current) setLoadingCards(false);
    }
  }

  async function changeHistoryDays(days: number) {
    if (!selected) return;
    setHistoryDays(days);
    setHistoryLoading(true);
    setHistoryError(false);
    const historyRequest = ++historyRequestId.current;
    try {
      const history = await getExpansionValueHistory(selected.code, days);
      if (historyRequest === historyRequestId.current) setValueHistory(history);
    } catch {
      if (historyRequest === historyRequestId.current) setHistoryError(true);
    } finally {
      if (historyRequest === historyRequestId.current) setHistoryLoading(false);
    }
  }

  async function saveMissingAcquisitionDates() {
    if (!selected || !bulkAcquisitionDate) return;
    setSavingBulkAcquisitionDate(true);
    setBulkAcquisitionError(null);
    try {
      await setExpansionMissingAcquisitionDates(selected.code, bulkAcquisitionDate);
      setCards(await getExpansionCards(selected.code));
      setBulkAcquisitionDate("");
    } catch {
      setBulkAcquisitionError("No se pudieron guardar las fechas de adquisición.");
    } finally {
      setSavingBulkAcquisitionDate(false);
    }
  }

  function closeExpansion() {
    requestId.current += 1;
    historyRequestId.current += 1;
    setSelected(null);
    setLoadingCards(false);
  }

  const shownExpansions = useMemo(() => filterExpansions(expansions, setSearch), [expansions, setSearch]);
  const progress = useMemo(() => getExpansionProgress(cards), [cards]);
  const acquisitionBalance = useMemo(() => summarizeAcquisitionBalance(cards), [cards]);
  const cardsWithTrend = useMemo(() => cards.map((card) => ({
    ...card,
    priceTrendAbsoluteChange: trendBasis === "acquisition" ? card.acquisitionTrendAbsoluteChange : card.priceTrendAbsoluteChange,
    priceTrendPercentageChange: trendBasis === "acquisition" ? card.acquisitionTrendPercentageChange : card.priceTrendPercentageChange,
  })), [cards, trendBasis]);
  const groups = useMemo(() => organizeExpansionCards(cardsWithTrend, { filter: status, sort, direction, group, query: cardSearch }), [cardsWithTrend, status, sort, direction, group, cardSearch]);
  const missingAcquisitionDates = cards.filter((card) => card.isOwned && !card.acquiredAt).length;
  const matchingCount = groups.reduce((sum, item) => sum + item.cards.length, 0);
  const visibleThrough = page * PAGE_SIZE;
  const visibleGroups = useMemo(() => {
    return groups.reduce<{ remaining: number; sections: Array<(typeof groups)[number] & { visibleCards: ExpansionCard[] }> }>((result, section) => {
      const count = Math.min(section.cards.length, result.remaining);
      return {
        remaining: result.remaining - count,
        sections: count > 0 ? [...result.sections, { ...section, visibleCards: section.cards.slice(0, count) }] : result.sections,
      };
    }, { remaining: visibleThrough, sections: [] }).sections;
  }, [groups, visibleThrough]);

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Catálogo</p>
          <h1 className="text-3xl font-semibold tracking-tight">Expansiones</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Explora cada edición, revisa cuánto has completado y encuentra las cartas que aún te faltan.</p>
        </div>
        {!selected && <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">{shownExpansions.length}</span> ediciones disponibles</div>}
      </div>

      {selected ? (
        <>
          <button type="button" onClick={closeExpansion} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" /> Todas las expansiones</button>
          <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {selected.code && <SetIcon code={selected.code} iconUri={selected.iconSvgUri} className="h-10 w-10" />}
                <div><p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{selected.code}</p><h2 className="text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.releasedAt ? new Date(selected.releasedAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "Fecha sin datos"}</p></div>
              </div>
              <div className="min-w-56 sm:w-64"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Tu colección</span><span className="font-semibold tabular-nums">{progress.owned} / {progress.total} · {progress.percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress.percentage}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{progress.total} cartas del catálogo disponibles</p></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4" aria-label="Balance desde la adquisición">
              <div><p className="text-sm font-medium">Balance neto desde adquisición</p><p className="mt-0.5 text-xs text-muted-foreground">{acquisitionBalance.measuredCards} cartas con fecha e histórico disponible</p></div>
              {acquisitionBalance.measuredCards ? <p className={`text-lg font-semibold tabular-nums ${acquisitionBalance.absoluteChange > 0 ? "text-emerald-500" : acquisitionBalance.absoluteChange < 0 ? "text-rose-500" : "text-muted-foreground"}`}>{formatDelta(acquisitionBalance.absoluteChange)} €{acquisitionBalance.percentageChange == null ? "" : ` · ${formatDelta(acquisitionBalance.percentageChange, 1)}%`}</p> : <p className="text-sm text-muted-foreground">Completa fechas para calcularlo</p>}
            </div>
          </section>

          {historyLoading ? <div className="mb-6 grid h-64 place-items-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">Cargando tendencia de precios…</div> : historyError ? <div role="alert" className="mb-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">No se pudo cargar la tendencia de precios.</div> : <ExpansionValueChart history={valueHistory} days={historyDays} onDaysChange={(days) => void changeHistoryDays(days)} />}

          {missingAcquisitionDates > 0 && <section aria-label="Fechas de adquisición pendientes" className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card/60 p-4">
            <div><h3 className="text-sm font-medium">Completar fechas de adquisición</h3><p className="mt-1 text-xs text-muted-foreground">{missingAcquisitionDates} {missingAcquisitionDates === 1 ? "carta de tu colección no tiene fecha" : "cartas de tu colección no tienen fecha"}. Se aplicará solo a esas cartas.</p></div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">Fecha de adquisición<input aria-label="Fecha de adquisición masiva" type="date" value={bulkAcquisitionDate} onChange={(event) => setBulkAcquisitionDate(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-foreground" /></label>
              <button type="button" disabled={!bulkAcquisitionDate || savingBulkAcquisitionDate} onClick={() => void saveMissingAcquisitionDates()} className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">{savingBulkAcquisitionDate ? "Guardando…" : "Aplicar a las cartas sin fecha"}</button>
            </div>
            {bulkAcquisitionError && <p role="alert" className="w-full text-xs text-destructive">{bulkAcquisitionError}</p>}
          </section>}

          <section aria-label="Cartas de la expansión">
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto_auto_auto]">
              <label className="relative"><span className="sr-only">Buscar cartas</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={cardSearch} onChange={(event) => { setCardSearch(event.target.value); setPage(1); }} placeholder="Buscar por nombre o número…" className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <select aria-label="Filtrar cartas" value={status} onChange={(event) => { setStatus(event.target.value as ExpansionFilter); setPage(1); }} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">Todas</option><option value="owned">En mi colección</option><option value="missing">Me faltan</option></select>
              <select aria-label="Ordenar cartas" value={sort} onChange={(event) => setSort(event.target.value as ExpansionSort)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="number">Número de colección</option><option value="name">Nombre</option><option value="price">Precio actual</option><option value="trend_abs">Tendencia absoluta</option><option value="trend_pct">Tendencia porcentual</option></select>
              <select aria-label="Periodo de tendencia" value={trendBasis} onChange={(event) => setTrendBasis(event.target.value as "acquisition" | "7d")} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="acquisition">Desde adquisición</option><option value="7d">Últimos 7 días</option></select>
              <select aria-label="Dirección" value={direction} onChange={(event) => setDirection(event.target.value as SortDirection)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="asc">Ascendente</option><option value="desc">Descendente</option></select>
              <select aria-label="Agrupar cartas" value={group} onChange={(event) => setGroup(event.target.value as ExpansionGroup)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="none">Sin agrupar</option><option value="rarity">Agrupar por rareza</option><option value="type">Agrupar por tipo</option></select>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground"><span>{matchingCount} {matchingCount === 1 ? "carta" : "cartas"}</span>{loadingCards && <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando edición…</span>}</div>
            {loadingCards ? <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border"><LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" /></div> : cardsError ? <div role="alert" className="grid min-h-48 place-items-center rounded-xl border border-dashed border-destructive/50 px-5 text-center text-sm text-destructive">{cardsError}</div> : matchingCount === 0 ? <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border px-5 text-center"><div><PackageOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">No hay cartas con estos filtros</p><p className="mt-1 text-sm text-muted-foreground">Prueba a cambiar el filtro o la búsqueda.</p></div></div> : (
              <div className="space-y-6">
                {visibleGroups.map((section) => <div key={section.key}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Layers3 className="h-4 w-4 text-muted-foreground" />{section.key}<span className="font-normal text-muted-foreground">({section.cards.length})</span></h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {section.visibleCards.map((card) => <button key={card.id} type="button" onClick={() => setSelectedCard(card)} aria-label={`Ver detalle de ${card.cardName || `carta ${card.collectorNumber}`}`} className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ contentVisibility: "auto", containIntrinsicSize: "250px" }}>
                      <div className="relative aspect-[5/3] bg-muted">{card.imageUri ? <CardImage src={card.imageUri} alt={card.cardName || "Carta de Magic"} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition-transform duration-200 group-hover:scale-[1.02]" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">Imagen no disponible</div>}<span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[11px] font-medium shadow-sm ${card.isOwned ? "bg-emerald-600 text-white" : "bg-background/90 text-muted-foreground"}`}>{card.isOwned ? `En colección${card.ownedQuantity > 1 ? ` ×${card.ownedQuantity}` : ""}` : "Faltante"}</span></div>
                      <div className="p-3"><p className="truncate text-sm font-medium" title={card.cardName || undefined}>{card.cardName || `Carta ${card.collectorNumber}`}</p><div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">#{card.collectorNumber}{card.rarity ? ` · ${card.rarity}` : ""}</span><span className="shrink-0 tabular-nums">{formatPrice(card.priceCardmarketTrend)}</span></div><p className={`mt-1 truncate text-xs tabular-nums ${card.priceTrendAbsoluteChange == null ? "text-muted-foreground" : card.priceTrendAbsoluteChange > 0 ? "text-emerald-500" : card.priceTrendAbsoluteChange < 0 ? "text-rose-500" : "text-muted-foreground"}`} aria-label={`Variación de precio ${trendBasis === "acquisition" ? "desde adquisición" : "en 7 días"}`}>{card.priceTrendAbsoluteChange == null ? (trendBasis === "acquisition" && card.isOwned && !card.acquiredAt ? "Añade la fecha de adquisición" : "Sin histórico de precios") : `${formatDelta(card.priceTrendAbsoluteChange)} € · ${formatDelta(card.priceTrendPercentageChange, 1)}%`}</p>{card.isOwned && <p className="mt-1 truncate text-[10px] text-muted-foreground">{formatAcquiredDate(card.acquiredAt) ? `Adquirida: ${formatAcquiredDate(card.acquiredAt)}` : "Fecha de adquisición pendiente"}</p>}</div>
                    </button>)}
                  </div>
                </div>)}
              </div>
            )}
            {visibleThrough < matchingCount && <div className="mt-6 text-center"><button type="button" onClick={() => setPage((value) => value + 1)} className="min-h-11 rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Mostrar más cartas</button></div>}
          </section>
          {selectedCard && <CardDetailDialog key={selectedCard.collectionCardId ?? selectedCard.id} isOpen onOpenChange={(open) => !open && setSelectedCard(null)} cardId={selectedCard.id} cardName={selectedCard.cardName || `Carta ${selectedCard.collectorNumber}`} imageUri={selectedCard.imageUri} manaCost={selectedCard.manaCost} typeLine={selectedCard.typeLine} collectionCardId={selectedCard.isOwned ? selectedCard.collectionCardId ?? undefined : undefined} acquiredAt={selectedCard.acquiredAt} onAddToCollection={!selectedCard.isOwned ? async () => {
            await addOrIncrementCard({
              cardScryfallId: selectedCard.id,
              cardName: selectedCard.cardName || `Carta ${selectedCard.collectorNumber}`,
              quantity: 1,
              setCode: selected.code,
              collectorNumber: selectedCard.collectorNumber,
              manaCost: selectedCard.manaCost,
              typeLine: selectedCard.typeLine,
              imageUri: selectedCard.imageUri,
            });
            const fresh = await getExpansionCards(selected.code);
            setCards(fresh);
            setSelectedCard(fresh.find((card) => card.id === selectedCard.id) ?? null);
          } : undefined} onAcquiredAtChange={(acquiredAt) => { void getExpansionCards(selected.code).then((fresh) => { setCards(fresh); setSelectedCard(fresh.find((card) => card.id === selectedCard.id) ?? { ...selectedCard, acquiredAt }); }); }} defaultTab="collection" />}
        </>
      ) : (
        <>
          <label className="relative mb-5 block max-w-md"><span className="sr-only">Buscar expansión</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={setSearch} onChange={(event) => setSetSearch(event.target.value)} placeholder="Buscar edición por nombre o código…" className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          {loadingSets ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" /></div> : shownExpansions.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shownExpansions.map((expansion) => <button key={expansion.code} type="button" onClick={() => void openExpansion(expansion)} className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{expansion.code && <SetIcon code={expansion.code} iconUri={expansion.iconSvgUri} className="h-8 w-8" />}<div className="min-w-0"><h2 className="truncate font-semibold">{expansion.name}</h2><p className="mt-0.5 font-mono text-xs uppercase text-muted-foreground">{expansion.code} · {expansion.releasedAt ? new Date(expansion.releasedAt).getUTCFullYear() : "—"}</p></div></div><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs tabular-nums">{expansion.completionPercentage}%</span></div><div className="mt-4"><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>{expansion.ownedCount} / {expansion.cardCount} cartas</span><span>{expansion.setType.replaceAll("_", " ")}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${expansion.completionPercentage}%` }} /></div><div className="mt-3 flex justify-between gap-2 text-xs"><span className="text-muted-foreground">Expansión <strong className="font-medium text-foreground">{formatPrice(expansion.totalValueEur)}</strong></span><span className="text-muted-foreground">En colección <strong className="font-medium text-emerald-500">{formatPrice(expansion.ownedValueEur)}</strong></span></div></div></button>)}</div> : <div className="rounded-xl border border-dashed border-border px-5 py-14 text-center text-sm text-muted-foreground">No se encontraron expansiones.</div>}
        </>
      )}
    </main>
  );
}
