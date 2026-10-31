"use client";

import { ViewToolbar, ToolbarSearch, ToolbarChoices, ToolbarSort } from "@/components/view-toolbar";

import { useQueryState } from "@/hooks/use-query-state";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AcquisitionLots } from "@/components/acquisition-lots";
import { ExpansionValueChart } from "@/components/expansion-value-chart";
import { ArrowLeft, Layers3, LoaderCircle, PackageOpen, Sparkles } from "lucide-react";
import { addOrIncrementCard } from "@/actions/collection";
import { setExpansionMissingAcquisitionDates, type Expansion, type ExpansionCard, type ExpansionValueHistory } from "@/actions/expansions";
import { PriceBadge } from "@/components/price-badge";
import { CatalogCardGridItem } from "@/components/catalog-card-grid-item";
import { CardImage } from "@/components/card-image";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { filterExpansions, expansionCardIdentity, getExpansionProgress, organizeExpansionCards, summarizeAcquisitionBalance, type ExpansionFilter, type ExpansionGroup, type ExpansionSort, type SortDirection } from "@/lib/expansions";
import { getExpansionCards, getExpansionValueHistory, getExpansions } from "@/lib/reads";

const PAGE_SIZE = 60;
const formatAlternatives = (count: number) => `${count} ${count === 1 ? "versión alternativa" : "versiones alternativas"}`;
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
  const [selectedCode, setSelectedCode] = useQueryState<string>("set", "");
  const selected = expansions.find(e => e.code === selectedCode) ?? null;
  const [scope, setScope] = useQueryState("scope", "mine", ["mine", "all"]);
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
  const [setSearch, setSetSearch] = useQueryState<string>("q", "");
  const [cardSearch, setCardSearch] = useQueryState<string>("cardq", "");
  const [status, setStatus] = useState<ExpansionFilter>("all");
  const [sort, setSort] = useQueryState<ExpansionSort>("sort", "number", ["number", "name", "price", "trend_abs", "trend_pct"]);
  const [direction, setDirection] = useQueryState<SortDirection>("direction", "asc", ["asc", "desc"]);
  const [group, setGroup] = useQueryState<ExpansionGroup>("group", "none", ["none", "rarity", "type"]);
  const [page, setPage] = useState(1);
  const [checklist, setChecklist] = useState("base");
  const [editionSort,setEditionSort] = useQueryState<"date" | "name" | "value" | "completion">("setSort","date",["date","name","value","completion"]);
  const [editionDirection,setEditionDirection] = useQueryState<SortDirection>("setDirection","desc",["asc","desc"]);
  const [setView,setSetView] = useQueryState<"grid" | "list">("setView","grid",["grid","list"]);

  useEffect(() => {
    let active = true;
    getExpansions().then((result) => { if (active) setExpansions(result); }).finally(() => { if (active) setLoadingSets(false); });
    return () => { active = false; };
  }, []);

  const loadExpansion = useCallback((code: string) => {
    const currentRequest = ++requestId.current;
    const historyRequest = ++historyRequestId.current;
    getExpansionValueHistory(code, 7).then(history => {
      if (currentRequest === requestId.current && historyRequest === historyRequestId.current) { setValueHistory(history); setHistoryError(false); }
    }).catch(() => {
      if (currentRequest === requestId.current && historyRequest === historyRequestId.current) setHistoryError(true);
    }).finally(() => {
      if (currentRequest === requestId.current && historyRequest === historyRequestId.current) setHistoryLoading(false);
    });
    return getExpansionCards(code).then(result => {
      if (currentRequest === requestId.current) { setCards(result); setCardsError(null); }
    }).catch(() => {
      if (currentRequest === requestId.current) setCardsError("No se pudieron cargar las cartas. Comprueba la conexión e inténtalo de nuevo.");
    }).finally(() => {
      if (currentRequest === requestId.current) setLoadingCards(false);
    });
  }, []);

  function openExpansion(expansion: Expansion) {
    setCards([]); setCardsError(null); setPage(1); setLoadingCards(true);
    setHistoryDays(7); setValueHistory(null); setHistoryError(false); setHistoryLoading(true);
    if (selectedCode === expansion.code) void loadExpansion(expansion.code);
    else setSelectedCode(expansion.code);
  }
  const codeToLoad = selected?.code;
  useEffect(() => {
    if (codeToLoad) void loadExpansion(codeToLoad);
    return () => { requestId.current += 1; historyRequestId.current += 1; };
  }, [codeToLoad, loadExpansion]);

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
    setSelectedCode("");
    setLoadingCards(false);
  }

  const shownExpansions = useMemo(() => {
    const items = filterExpansions(scope === "mine" ? expansions.filter(set => set.ownedCount > 0 || (set.batchCount ?? 0) > 0) : expansions,setSearch);
    return items.sort((first,second) => {
      if (editionSort === "value" && first.valuesAvailable !== second.valuesAvailable) return first.valuesAvailable === false ? 1 : -1;
      const comparison = editionSort === "name" ? first.name.localeCompare(second.name) : editionSort === "value" ? first.ownedValueEur-second.ownedValueEur : editionSort === "completion" ? first.completionPercentage-second.completionPercentage : (Date.parse(first.releasedAt ?? "") || 0)-(Date.parse(second.releasedAt ?? "") || 0);
      return (editionDirection === "asc" ? comparison : -comparison) || first.name.localeCompare(second.name);
    });
  },[expansions,setSearch,scope,editionSort,editionDirection]);
  const ownedCardIdentities = useMemo(() => new Set(cards.filter(card => card.isOwned && card.ownedQuantity > 0).map(expansionCardIdentity)), [cards]);
  const progress = useMemo(() => getExpansionProgress(cards), [cards]);
  const acquisitionBalance = useMemo(() => summarizeAcquisitionBalance(cards), [cards]);
  const cardsWithTrend = useMemo(() => cards.map((card) => ({
    ...card,
    priceTrendAbsoluteChange: trendBasis === "acquisition" ? card.acquisitionTrendAbsoluteChange : card.priceTrendAbsoluteChange,
    priceTrendPercentageChange: trendBasis === "acquisition" ? card.acquisitionTrendPercentageChange : card.priceTrendPercentageChange,
  })), [cards, trendBasis]);
  const groups = useMemo(() => organizeExpansionCards(checklist === "all" ? cardsWithTrend : cardsWithTrend.filter(card => card.isBasePrinting !== false), { filter: status, sort, direction, group, query: cardSearch }), [cardsWithTrend, checklist, status, sort, direction, group, cardSearch]);
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
          <AcquisitionLots key={selected.code} code={selected.code} onChanged={() => { void getExpansions().then(setExpansions); }} />
          <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {selected.code && <SetIcon code={selected.code} iconUri={selected.iconSvgUri} className="h-10 w-10" />}
                <div><p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{selected.code}</p><h2 className="text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.releasedAt ? new Date(selected.releasedAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "Fecha sin datos"}</p></div>
              </div>
              <div className="min-w-56 sm:w-64"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Tu colección</span><span className="font-semibold tabular-nums">{progress.owned} / {progress.total} · {progress.percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress.percentage}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{progress.total} {progress.total === 1 ? "carta única" : "cartas únicas"} · {formatAlternatives(progress.alternatives)}</p><p className="mt-1 text-xs text-muted-foreground">Cada carta cuenta una vez; cualquier versión de esta edición cubre la carta.</p></div>
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
            <ViewToolbar
              label="Opciones de cartas de la expansión"
              className="mb-5"
              search={
                <ToolbarSearch
                  label="Buscar cartas"
                  value={cardSearch}
                  onChange={(value) => {
                    setCardSearch(value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nombre o número…"
                />
              }
              filters={
                <>
                  <ToolbarChoices
                    label="Filtrar cartas"
                    value={status}
                    onChange={(value) => {
                      setStatus(value);
                      setPage(1);
                    }}
                    options={[
                      { value: "all", label: "Todas" },
                      { value: "owned", label: "En mi colección" },
                      { value: "missing", label: "Me faltan" },
                    ]}
                  />
                  <ToolbarChoices
                    label="Periodo de tendencia"
                    value={trendBasis}
                    onChange={setTrendBasis}
                    options={[
                      { value: "acquisition", label: "Desde adquisición" },
                      { value: "7d", label: "Últimos 7 días" },
                    ]}
                  />
                </>
              }
              sorting={
                <ToolbarSort
                  label="Ordenar cartas"
                  value={sort}
                  direction={direction}
                  onChange={(value, dir) => {
                    setSort(value);
                    setDirection(dir);
                  }}
                  options={[
                    { value: "number", label: "Número de colección" },
                    { value: "name", label: "Nombre" },
                    { value: "price", label: "Precio actual", defaultDesc: true },
                    { value: "trend_abs", label: "Tendencia absoluta", defaultDesc: true },
                    { value: "trend_pct", label: "Tendencia porcentual", defaultDesc: true },
                  ]}
                />
              }
              display={
                <ToolbarChoices
                  label="Agrupar cartas"
                  value={group}
                  onChange={setGroup}
                  options={[
                    { value: "none", label: "Sin agrupar" },
                    { value: "rarity", label: "Por rareza" },
                    { value: "type", label: "Por tipo" },
                  ]}
                />
              }
            />
            {cards.some(card => card.isBasePrinting === false) && <ToolbarChoices label="Lista de cartas" value={checklist} onChange={(value) => { setChecklist(value); setPage(1); }} options={[{ value: "base", label: "Edición base" }, { value: "all", label: "Todas las versiones" }]} />}
            <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground"><span>{matchingCount} {matchingCount === 1 ? "carta" : "cartas"}</span>{loadingCards && <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando edición…</span>}</div>
            {loadingCards ? <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border"><LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" /></div> : cardsError ? <div role="alert" className="grid min-h-48 place-items-center rounded-xl border border-dashed border-destructive/50 px-5 text-center text-sm text-destructive">{cardsError}</div> : matchingCount === 0 ? <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border px-5 text-center"><div><PackageOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">No hay cartas con estos filtros</p><p className="mt-1 text-sm text-muted-foreground">Prueba a cambiar el filtro o la búsqueda.</p></div></div> : (
              <div className="space-y-6">
                {visibleGroups.map((section) => <div key={section.key}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Layers3 className="h-4 w-4 text-muted-foreground" />{section.key}<span className="font-normal text-muted-foreground">({section.cards.length})</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {section.visibleCards.map((card) => <CatalogCardGridItem key={card.id} name={card.cardName || `Carta ${card.collectorNumber}`} imageUri={card.imageUri} typeLine={card.typeLine} manaCost={card.manaCost} onOpen={() => setSelectedCard(card)} badges={<>
                      <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-primary">{card.isOwned ? `x${card.ownedQuantity}` : "Faltante"}</span>
                      {card.priceCardmarketTrend == null ? <span className="text-xs text-muted-foreground">—</span> : <PriceBadge quote={{ cardName: card.cardName || "Carta", scryfallId: card.id, provider: "cardmarket", currency: "EUR", currencySymbol: "€", unitPrice: { trend: card.priceCardmarketTrend, min: card.priceCardmarketMin ?? card.priceCardmarketTrend, max: card.priceCardmarketMax ?? card.priceCardmarketTrend }, quantity: Math.max(card.ownedQuantity, 1), subtotal: card.priceCardmarketTrend * Math.max(card.ownedQuantity, 1), lastUpdated: "" }} showSubtotal={card.ownedQuantity > 1} />}
                    </>} footer={<div className="pt-3 mt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between gap-2"><span>#{card.collectorNumber} · {card.rarity}</span><span>{card.isOwned ? "En colección" : "Faltante"}</span></div>
                      <p aria-label={`Variación de precio ${trendBasis === "acquisition" ? "desde adquisición" : "en 7 días"}`}>{card.priceTrendAbsoluteChange == null ? (trendBasis === "acquisition" && card.isOwned && !card.acquiredAt ? "Añade la fecha de adquisición" : "Sin histórico de precios") : `${formatDelta(card.priceTrendAbsoluteChange)} € · ${formatDelta(card.priceTrendPercentageChange, 1)}%`}</p>
                      {!card.isOwned && ownedCardIdentities.has(expansionCardIdentity(card)) && <p className="text-primary">Carta cubierta por otra versión de esta edición</p>}
                      {card.isOwned && <p>{formatAcquiredDate(card.acquiredAt) ? `Adquirida: ${formatAcquiredDate(card.acquiredAt)}` : "Fecha de adquisición pendiente"}</p>}
                      {card.ownedElsewhere && <span title={`Tienes otras versiones en: ${(card.otherPrintings ?? []).map(version => `${version.setCode ? version.setCode.toUpperCase() : "Edición desconocida"} #${version.collectorNumber} ×${version.quantity}`).join(", ")}`} aria-label="Otra versión en tu colección" tabIndex={0} className="block text-amber-500">Otra versión en tu colección</span>}
                    </div>} />)}
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
          <ViewToolbar
            label="Opciones del listado de expansiones"
            className="mb-5"
            search={
              <ToolbarSearch
                label="Buscar expansión"
                value={setSearch}
                onChange={setSetSearch}
                placeholder="Buscar edición por nombre o código…"
              />
            }
            filters={
              <ToolbarChoices
                label="Colección"
                value={scope}
                onChange={setScope}
                options={[
                  { value: "mine", label: "Mis expansiones" },
                  { value: "all", label: "Todas" },
                ]}
              />
            }
            sorting={
              <ToolbarSort
                value={editionSort}
                direction={editionDirection}
                onChange={(value, dir) => {
                  setEditionSort(value);
                  setEditionDirection(dir);
                }}
                options={[
                  { value: "date", label: "Fecha", defaultDesc: true },
                  { value: "name", label: "Nombre" },
                  { value: "value", label: "Valor en propiedad", defaultDesc: true },
                  { value: "completion", label: "Completitud", defaultDesc: true },
                ]}
              />
            }
            display={
              <ToolbarChoices
                label="Vista"
                value={setView}
                onChange={setSetView}
                options={[
                  { value: "grid", label: "Cuadrícula" },
                  { value: "list", label: "Listado" },
                ]}
              />
            }
          />
          {loadingSets ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" /></div> : shownExpansions.length ? <div className={`grid gap-3 ${setView === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>{shownExpansions.map((expansion) => <button key={expansion.code} type="button" onClick={() => openExpansion(expansion)} className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{expansion.code && <SetIcon code={expansion.code} iconUri={expansion.iconSvgUri} className="h-8 w-8" />}<div className="min-w-0"><h2 className="truncate font-semibold">{expansion.name}</h2><p className="mt-0.5 font-mono text-xs uppercase text-muted-foreground">{expansion.code} · {expansion.releasedAt ? new Date(expansion.releasedAt).getUTCFullYear() : "—"}</p></div></div><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs tabular-nums">{expansion.completionPercentage}%</span></div><div className="mt-4">{(expansion.batchCount ?? 0) > 0 && <p className="mb-2 text-xs text-primary">{expansion.batchCount} lotes · ROI {expansion.roi == null ? "sin base comparable" : `${expansion.roi.toFixed(1)}%`}</p>}<div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span title="Cada carta cuenta una vez; cualquier versión de esta edición cubre la carta.">{expansion.ownedCount} / {expansion.cardCount} cartas únicas</span><span>{expansion.setType.replaceAll("_", " ")}</span></div><p className="mb-2 text-xs text-muted-foreground">{formatAlternatives(expansion.alternativeVersionCount ?? 0)}</p><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${expansion.completionPercentage}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><span className="text-muted-foreground">Total<strong className="block text-foreground">{formatPrice(expansion.valuesAvailable === false ? null : expansion.totalValueEur)}</strong></span><span className="text-muted-foreground">Faltante<strong className="block text-rose-400">{formatPrice(expansion.valuesAvailable === false ? null : expansion.missingValueEur)}</strong></span><span className="text-muted-foreground">En propiedad<strong className="block text-emerald-500">{formatPrice(expansion.valuesAvailable === false ? null : expansion.ownedValueEur)}</strong></span></div></div></button>)}</div> : <div className="rounded-xl border border-dashed border-border px-5 py-14 text-center text-sm text-muted-foreground">No se encontraron expansiones. <button type="button" onClick={() => setScope("all")} className="min-h-11 underline">Explorar todas las ediciones</button></div>}
        </>
      )}
    </main>
  );
}
