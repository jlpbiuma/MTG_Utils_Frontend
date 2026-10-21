"use client";

import { ViewToolbar, ToolbarChoices, ToolbarSearch, ToolbarSort } from "@/components/view-toolbar";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getBatches,
  saveBatch,
  deleteBatch,
  getBatchCandidates,
  assignBatch,
  getExpansionPerformance,
  getPerformanceCards,
  type Batch,
  type BatchInput,
  type BatchCandidate,
  type ExpansionPerformance,
  type PerformanceCard,
} from "@/actions/purchases";
const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n,
  );
const kinds = {
  prerelease: "Presentación",
  booster_box: "Caja de sobres",
  bundle: "Bundle",
  singles: "Cartas sueltas",
  trade: "Intercambio",
  other: "Otro",
};

export function AcquisitionLots({
  code,
  onChanged,
}: {
  code: string;
  onChanged?: () => void;
}) {
  const [performance, setPerformance] = useState<ExpansionPerformance | null>(
    null,
  );
  const [batches, setBatches] = useState<Batch[]>([]);
  const [cards, setCards] = useState<PerformanceCard[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Batch | "new" | null>(null);
  const [assigning, setAssigning] = useState<Batch | null>(null);
  const [candidates, setCandidates] = useState<BatchCandidate[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [cardSort, setCardSort] = useState<"name" | "price" | "change" | "decks">("name");
  const [cardDirection, setCardDirection] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("all");
  const [selectedLot, setSelectedLot] = useState("");
  const [input, setInput] = useState<BatchInput>({
    setCode: code,
    kind: "singles",
    acquiredOn: "",
    costTotal: 0,
    shipping: 0,
    currency: "EUR",
    notes: "",
  });
  const [dialogError, setDialogError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, b, c] = await Promise.all([
        getExpansionPerformance(code),
        getBatches(code),
        getPerformanceCards(code),
      ]);
      setPerformance(p);
      setBatches(b);
      setCards(c);
    } catch {
      setError(
        "No se pudo cargar el rendimiento. Comprueba que la API y la migración de compras estén disponibles.",
      );
    } finally {
      setLoading(false);
    }
  }, [code]);
  useEffect(() => {
    let active = true;
    Promise.all([
      getExpansionPerformance(code),
      getBatches(code),
      getPerformanceCards(code),
    ])
      .then(([p, b, c]) => {
        if (active) {
          setPerformance(p);
          setBatches(b);
          setCards(c);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "No se pudo cargar el rendimiento. Comprueba que la API y la migración de compras estén disponibles.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);
  function edit(batch: Batch | "new") {
    setDialogError("");
    setInput(
      batch === "new"
        ? {
            setCode: code,
            kind: "singles",
            acquiredOn: new Intl.DateTimeFormat("en-CA", {
              timeZone: "Atlantic/Canary",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date()),
            costTotal: 0,
            shipping: 0,
            currency: "EUR",
            notes: "",
          }
        : batch,
    );
    setEditing(batch);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDialogError("");
    try {
      await saveBatch(
        input,
        editing && editing !== "new" ? editing.id : undefined,
      );
      setEditing(null);
      await load();
      onChanged?.();
    } catch {
      setDialogError("No se pudo guardar el lote. Revisa fecha, costes y aceptación del presupuesto.");
    } finally {
      setBusy(false);
    }
  }
  async function propose(batch: Batch, from = "", to = "") {
    setBusy(true);
    setDialogError("");
    try {
      const result = await getBatchCandidates(batch.id, from, to);
      setCandidates(result);
      setQuantities(
        Object.fromEntries(
          result
            .filter((c) => c.assignedHere > 0)
            .map((c) => [c.id, c.assignedHere]),
        ),
      );
      setAssigning(batch);
    } catch {
      setError("No se pudieron cargar las cartas candidatas.");
    } finally {
      setBusy(false);
    }
  }
  async function confirmAssignments() {
    if (!assigning) return;
    setBusy(true);
    setDialogError("");
    try {
      const items = Object.entries(quantities)
        .filter(([, n]) => n > 0)
        .map(([collectionCardId, quantity]) => ({
          collectionCardId,
          quantity,
        }));
      await assignBatch(
        assigning.id,
        items,
        candidates
          .filter((c) => c.assignedHere && !quantities[c.id])
          .map((c) => c.id),
      );
      setAssigning(null);
      await load();
      onChanged?.();
    } catch {
      setDialogError(
        "No se pudo asignar: revisa las copias disponibles y las versiones.",
      );
    } finally {
      setBusy(false);
    }
  }
  const lots = performance?.lots ?? [];
  const lot = lots.find((l) => l.id === selectedLot) ?? lots[0];
  const chartDates = [
    ...new Set([
      ...(performance?.index.map((p) => p.date) ?? []),
      ...(lot?.points.map((p) => p.date) ?? []),
      ...(performance?.ownedSeries?.map((p) => p.date) ?? []),
    ]),
  ].sort();
  const series = chartDates.map((date) => ({
    date,
    index: performance?.index.find((p) => p.date === date)?.value,
    lot: lot?.points.find((p) => p.date === date)?.value,
    owned: performance?.ownedSeries?.find((p) => p.date === date)?.value,
  }));
  const indexChange = performance?.index.length
    ? performance.index.at(-1)!.value - 100
    : null;
  const shownCards = cards.filter((card) => card.cardName.toLowerCase().includes(cardQuery.trim().toLowerCase())).filter(
    (c) =>
      filter === "all" ||
      (filter === "unused" && c.decks.length === 0) ||
      (filter === "outperforming" &&
        c.changePercent !== null &&
        indexChange !== null &&
        c.changePercent > indexChange) ||
      (filter === "lagging" &&
        c.changePercent !== null &&
        indexChange !== null &&
        c.changePercent < indexChange),
  ).sort((a, b) => {
    if (cardSort === "name") return a.cardName.localeCompare(b.cardName) * (cardDirection === "asc" ? 1 : -1);
    const first = cardSort === "price" ? a.currentPrice : cardSort === "change" ? a.changePercent : a.decks.length;
    const second = cardSort === "price" ? b.currentPrice : cardSort === "change" ? b.changePercent : b.decks.length;
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    return (first - second) * (cardDirection === "asc" ? 1 : -1);
  });

  return (
    <section
      aria-label="Rendimiento de compras"
      className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Inversión y rendimiento</h3>
        <Button onClick={() => edit("new")}>Registrar compra o lote</Button>
      </div>
      {loading ? (
        <p role="status">Cargando rendimiento…</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <Button variant="outline" onClick={load}>
            Reintentar
          </Button>
        </p>
      ) : (
        <>
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin inversión registrada. Puedes asignar tus cartas a un lote
              después de registrar la compra.
            </p>
          ) : (
            <div className="space-y-3">
              {lots.map((l) => (
                <div key={l.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">
                    {kinds[l.kind as keyof typeof kinds] ?? l.kind} · {l.acquiredOn}{" "}
                    {l.notes && `· ${l.notes}`}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Inversión", `${l.investment.toFixed(2)} ${l.currency}`],
                      ["Mercado (EUR)", eur(l.marketValue)],
                      ["Vendible estimado", eur(l.sellableValue)],
                      [
                        "ROI de mercado",
                        l.roi === null
                          ? "Sin base comparable"
                          : `${l.roi.toFixed(1)}%`,
                      ],
                    ].map(([title, value]) => (
                      <div key={title}>
                        <dt className="text-xs text-muted-foreground">
                          {title}
                        </dt>
                        <dd className="font-mono text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {l.copies} copias asignadas{" "}
                    {l.unpricedItems > 0 &&
                      `· ${l.unpricedItems} versiones sin precio`}
                    {l.currency !== "EUR" &&
                      " · ROI no calculado: inversión en otra divisa"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {batches.find((b) => b.id === l.id) && (
                      <>
                        {batches.find(b=>b.id===l.id)?.origin==='manual' ? <Button size="sm" variant="outline" onClick={()=>edit(batches.find(b=>b.id===l.id)!)}>Editar lote</Button> : <Link href="/buy/expenses" className="min-h-11 py-3 text-sm underline">Editar o anular en Gastos e inversión</Link>}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || batches.find(b=>b.id===l.id)?.origin!=="manual"}
                          onClick={() =>
                            propose(batches.find((b) => b.id === l.id)!)
                          }
                        >
                          Asignar cartas a un lote
                        </Button>
                        {batches.find((b) => b.id === l.id)?.origin === "manual" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await deleteBatch(l.id);
                                await load();
                                onChanged?.();
                              } catch {
                                setError("No se pudo eliminar el lote.");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Eliminar lote
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <h4 className="font-medium">
              Índice de la edición frente a tu lote · base 100
            </h4>
            {lots.length > 1 && (
              <ToolbarChoices
                label="Lote"
                value={lot?.id ?? ""}
                onChange={setSelectedLot}
                options={lots.map((item) => ({
                  value: item.id,
                  label: `${item.acquiredOn} · ${item.notes || kinds[item.kind as keyof typeof kinds]}`,
                }))}
              />
            )}
            {series.length > 1 ? (
              <div
                className="h-64"
                role="img"
                aria-label="Comparación del índice de la edición y el lote normalizados a 100"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      dataKey="index"
                      name="Índice de edición"
                      stroke="var(--color-primary)"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="owned"
                      name="Tus cartas (composición actual)"
                      stroke="#a78bfa"
                      strokeDasharray="2 2"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="lot"
                      name="Tu lote"
                      stroke="#34d399"
                      strokeDasharray="5 3"
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Histórico insuficiente: el gráfico aparecerá al acumular al
                menos dos observaciones completas.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {performance?.historyNote}{" "}
              {performance?.baselineDate &&
                `Base observada: ${performance.baselineDate}.`}{" "}
              {lot &&
                !lot.points.length &&
                "No hay precios completos en la fecha de adquisición de este lote."}
            </p>
            <details>
              <summary className="cursor-pointer text-sm">
                Ver datos del gráfico
              </summary>
              <table className="text-sm">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Índice</th>
                    <th>Lote</th>
                    <th>Tus cartas</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td>{p.index?.toFixed(2) ?? "—"}</td>
                      <td>{p.lot?.toFixed(2) ?? "—"}</td>
                      <td>{p.owned?.toFixed(2) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
          <details>
            <summary className="cursor-pointer font-medium">
              Rendimiento por carta y uso en mazos
            </summary>
            <ViewToolbar
              className="my-3"
              label="Opciones del rendimiento por carta"
              search={
                <ToolbarSearch
                  value={cardQuery}
                  onChange={setCardQuery}
                  placeholder="Buscar cartas por rendimiento..."
                />
              }
              sorting={
                <ToolbarSort
                  value={cardSort}
                  direction={cardDirection}
                  onChange={(value, direction) => {
                    setCardSort(value);
                    setCardDirection(direction);
                  }}
                  options={[
                    { value: "name", label: "Nombre" },
                    { value: "price", label: "Precio", defaultDesc: true },
                    { value: "change", label: "Variación", defaultDesc: true },
                    { value: "decks", label: "Mazos", defaultDesc: true },
                  ]}
                />
              }
              filters={
                <ToolbarChoices
                  label="Filtrar"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "outperforming", label: "Por encima del índice" },
                    { value: "lagging", label: "Por debajo del índice" },
                    { value: "unused", label: "Sin uso en mazos activos" },
                  ]}
                />
              }
            />
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Carta</th>
                    <th className="p-2">Desde salida observada</th>
                    <th className="p-2">Frente al índice</th>
                    <th className="p-2">Actual / máximo</th>
                    <th className="p-2">Mazos</th>
                  </tr>
                </thead>
                <tbody>
                  {shownCards.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-2">{c.cardName}</td>
                      <td className="p-2">
                        {c.changePercent?.toFixed(1) ?? "—"}%
                        <span className="block text-xs text-muted-foreground">
                          {c.baselineDate}
                        </span>
                      </td>
                      <td className="p-2">
                        {c.changePercent !== null && indexChange !== null
                          ? `${(c.changePercent - indexChange).toFixed(1)} pp`
                          : "Sin datos"}
                      </td>
                      <td className="p-2">
                        {c.currentPrice !== null ? eur(c.currentPrice) : "—"} /{" "}
                        {c.peakPrice !== null ? eur(c.peakPrice) : "—"}
                      </td>
                      <td className="p-2">
                        {c.decks.length
                          ? c.decks.map((d) => (
                              <Link
                                key={d.id}
                                href={`/decks/${d.id}`}
                                className="mr-2 underline"
                              >
                                {d.name}
                              </Link>
                            ))
                          : "Sin uso"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shownCards.length === 0 && (
                <p className="p-3 text-sm">No hay cartas para este filtro.</p>
              )}
            </div>
          </details>
        </>
      )}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && !busy && setEditing(null)}
      >
        <DialogContent>
          <DialogTitle>
            {editing === "new" ? "Registrar compra o lote" : "Editar lote"}
          </DialogTitle>
          <DialogDescription>
            El coste incluye las cartas; registra el envío por separado. No se
            asignan cartas automáticamente.
          </DialogDescription>
          <form onSubmit={save} className="space-y-3">
            <ToolbarChoices
              label="Tipo de lote"
              value={input.kind}
              onChange={(kind) => setInput({ ...input, kind })}
              options={Object.entries(kinds).map(([value, label]) => ({
                value: value as BatchInput["kind"],
                label,
              }))}
            />
            <label className="block text-sm">
              Fecha
              <input
                required
                type="date"
                value={input.acquiredOn}
                onChange={(e) =>
                  setInput({ ...input, acquiredOn: e.target.value })
                }
                className="mt-1 min-h-11 w-full rounded border border-input bg-background px-3"
              />
            </label>
            {(
              [
                ["costTotal", "Coste"],
                ["shipping", "Envío"],
              ] as const
            ).map(([key, name]) => (
              <label key={key} className="block text-sm">
                {name}
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={input[key]}
                  onChange={(e) =>
                    setInput({ ...input, [key]: Number(e.target.value) })
                  }
                  className="mt-1 min-h-11 w-full rounded border border-input bg-background px-3"
                />
              </label>
            ))}
            <ToolbarChoices
              label="Divisa"
              value={input.currency}
              onChange={(currency) => setInput({ ...input, currency })}
              options={[
                { value: "EUR", label: "EUR" },
                { value: "USD", label: "USD" },
              ]}
            />
            <label className="block text-sm">
              Notas (opcional)
              <textarea
                value={input.notes ?? ""}
                onChange={(e) => setInput({ ...input, notes: e.target.value })}
                className="mt-1 w-full rounded border border-input bg-background p-3"
              />
            </label>
            {dialogError && <p role="alert">{dialogError}</p>}
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={input.acknowledgeBudget??false} onChange={e=>setInput({...input,acknowledgeBudget:e.target.checked})}/>Acepto registrar este gasto si supera 50 €/mes o 600 €/año.</label>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar lote"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={assigning !== null}
        onOpenChange={(open) => !open && !busy && setAssigning(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogTitle>Asignar cartas a un lote</DialogTitle>
          <DialogDescription>
            La edición y las fechas proponen candidatas. Confirma tú las cartas
            y cantidades; las copias de otros lotes no se reasignan.
          </DialogDescription>
          <div className="flex flex-wrap gap-2">
            <label className="text-sm">
              Desde
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="block min-h-11 rounded border border-input bg-background px-2"
              />
            </label>
            <label className="text-sm">
              Hasta
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="block min-h-11 rounded border border-input bg-background px-2"
              />
            </label>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => assigning && propose(assigning, start, end)}
            >
              Proponer cartas
            </Button>
          </div>
          {candidates.map((c) => (
            <label
              key={c.id}
              className="flex min-h-11 items-center justify-between gap-3 text-sm"
            >
              <span>
                {c.cardName}
                {c.isFoil && " · foil"}
                <small className="block text-muted-foreground">
                  {c.quantity - c.assignedElsewhere} disponibles ·{" "}
                  {c.acquiredAt?.slice(0, 10) ?? "sin fecha"}
                </small>
              </span>
              <input
                aria-label={`Copias de ${c.cardName}`}
                type="number"
                min="0"
                max={c.quantity - c.assignedElsewhere}
                value={quantities[c.id] ?? 0}
                onChange={(e) =>
                  setQuantities({
                    ...quantities,
                    [c.id]: Number(e.target.value),
                  })
                }
                className="min-h-11 w-20 rounded border border-input bg-background px-2"
              />
            </label>
          ))}
          {candidates.length === 0 && (
            <p>
              No hay cartas candidatas. Importa cartas al inventario o amplía el
              rango de fechas.
            </p>
          )}
          {dialogError && <p role="alert">{dialogError}</p>}
          <Button disabled={busy} onClick={confirmAssignments}>
            {busy ? "Asignando…" : "Confirmar asignación"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
