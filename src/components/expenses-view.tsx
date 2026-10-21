"use client";
import { useCallback, useEffect, useState } from "react";
import {
  annulExpense,
  editExpense,
  getExpenseDetail,
  getExpenseLedger,
} from "@/actions/acquisitions";
import {
  euro,
  kindLabels,
  originLabels,
  todayDate,
  type ExpenseDetail,
  type ExpenseLedger,
} from "@/lib/acquisitions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HistoricalPurchaseDialog } from "@/components/historical-purchase-dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function ExpensesView() {
  const [year, setYear] = useState(Number(todayDate().slice(0, 4)));
  const [ledger, setLedger] = useState<ExpenseLedger | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [historical, setHistorical] = useState(false);
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("active");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    getExpenseLedger(year).then((result) => {
      if (!current) return;
      if (result.ok) setLedger(result.data);
      else setError(result.error);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [year, refresh]);
  const reload = useCallback(async () => {
    setLoading(true);
    setLedger(null);
    setError("");
    setRefresh((n) => n + 1);
  }, []);
  async function openDetail(id: string) {
    setError("");
    const result = await getExpenseDetail(id);
    if (result.ok) setDetail(result.data);
    else setError(result.error);
  }
  const purchases =
    ledger?.purchases.filter(
      (p) =>
        (!origin || p.origin === origin) &&
        (!kind || p.kind === kind) &&
        (status === "all" ||
          (status === "annulled" ? !!p.annulledAt : !p.annulledAt)) &&
        `${p.name} ${p.seller ?? ""}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    ) ?? [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gastos e inversión</h1>
          <p className="text-sm text-muted-foreground">
            Compras de cartas y productos con cartas. La rentabilidad compara su
            valor de mercado con el coste completo.
          </p>
        </div>
        <Button onClick={() => setHistorical(true)}>
          Registrar compra antigua
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Año
        <select
          aria-label="Año"
          value={year}
          onChange={(e) => {
            setLoading(true);
            setLedger(null);
            setError("");
            setYear(Number(e.target.value));
          }}
          className="min-h-11 rounded-md border bg-background px-3"
        >
          {Array.from(new Set([year, ...(ledger?.years ?? [])]))
            .sort((a, b) => b - a)
            .map((y) => (
              <option key={y}>{y}</option>
            ))}
        </select>
      </label>
      {loading && <p role="status">Cargando gastos…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {ledger && !loading && (
        <>
          <section
            aria-label="Presupuesto anual"
            className="rounded-xl border bg-card p-4 space-y-3"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <p>
                Registrado
                <strong className="block text-xl tabular-nums">
                  {euro(ledger.budget.spent)}
                </strong>
              </p>
              <p>
                Presupuesto anual
                <strong className="block text-xl">600 €</strong>
              </p>
              <p>
                Disponible
                <strong className="block text-xl tabular-nums">
                  {euro(ledger.budget.remaining)}
                </strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Referencia de 50 €/mes. Puedes utilizar el saldo de otros meses
              del mismo año. Los avisos requieren aceptación explícita.
            </p>
            {ledger.budget.estimatedSpent > 0 && (
              <p className="text-sm">
                Incluye {euro(ledger.budget.estimatedSpent)} estimados por
                tendencia.
              </p>
            )}
            {ledger.budget.excess > 0 && (
              <p role="alert" className="text-amber-700 dark:text-amber-300">
                Presupuesto anual superado en {euro(ledger.budget.excess)}.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {ledger.budget.months.map((m) => (
                <div key={m.month} className="rounded-md border p-2 text-sm">
                  <strong>
                    {new Date(year, m.month - 1, 1).toLocaleDateString(
                      "es-ES",
                      { month: "long" },
                    )}
                  </strong>
                  <p>
                    {euro(m.spent)} / 50 €
                    {m.overMonthlyReference ? " · Aviso" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo acumulado: {euro(m.balance)}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              Buscar
              <input
                aria-label="Buscar compras"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Origen
              <select
                aria-label="Filtrar origen"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="">Todos</option>
                {Object.entries(originLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Producto
              <select
                aria-label="Filtrar producto"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="">Todos</option>
                {Object.entries(kindLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Estado
              <select
                aria-label="Filtrar estado"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="active">Activas</option>
                <option value="annulled">Anuladas</option>
                <option value="all">Todas</option>
              </select>
            </label>
          </div>
          <ul aria-label="Registro de gastos" className="space-y-3">
            {purchases.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <button
                      className="min-h-11 text-left font-semibold underline underline-offset-4"
                      onClick={() => void openDetail(p.id)}
                    >
                      {p.name}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {p.acquiredOn.slice(0, 10)} · {originLabels[p.origin]} ·{" "}
                      {kindLabels[p.kind]} · {p.copies} copias
                      {p.annulledAt ? " · Anulada" : ""}
                    </p>
                  </div>
                  <div className="text-sm tabular-nums">
                    <p>
                      Inversión:{" "}
                      {p.currency === "EUR"
                        ? euro(p.investment)
                        : `${p.investment} ${p.currency}`}{" "}
                      {p.costBasis === "trend" ? "(estimada)" : ""}
                    </p>
                    <p>
                      Mercado: {euro(p.marketValue)}
                      {!p.complete ? " (parcial)" : ""}
                    </p>
                    <p>
                      {p.profit === null
                        ? "Rentabilidad: sin datos completos"
                        : `Ganancia no realizada: ${euro(p.profit)} · ROI: ${p.roi === null ? "—" : `${p.roi}%`}`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!purchases.length && (
            <p className="text-muted-foreground">
              No hay compras que coincidan con estos filtros.
            </p>
          )}
        </>
      )}
      {historical && (
        <HistoricalPurchaseDialog
          onClose={() => setHistorical(false)}
          onSaved={reload}
        />
      )}
      {detail && (
        <ExpenseDetailDialog
          key={detail.id}
          detail={detail}
          onClose={() => setDetail(null)}
          onSaved={async (value) => {
            setDetail(value);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function ExpenseDetailDialog({
  detail,
  onClose,
  onSaved,
}: {
  detail: ExpenseDetail;
  onClose: () => void;
  onSaved: (value: ExpenseDetail) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(detail.name);
  const [date, setDate] = useState(detail.acquiredOn.slice(0, 10));
  const [total, setTotal] = useState(String(detail.subtotal));
  const [shipping, setShipping] = useState(String(detail.shipping));
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      detail.items.map((i) => [
        i.id,
        String(i.purchaseAmount ?? i.costAmount ?? 0),
      ]),
    ),
  );
  const [seller, setSeller] = useState(detail.seller ?? "");
  const [ack, setAck] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState("");
  const [annulling, setAnnulling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const realCardmarket =
    detail.origin === "cardmarket" && detail.costBasis === "paid";
  async function save() {
    setBusy(true);
    setError("");
    const result = await editExpense(detail.id, {
      name,
      acquiredOn: date,
      total,
      seller: seller || null,
      acknowledgeBudget: ack,
      ...(realCardmarket ? { shipping, purchasePrices: prices } : {}),
    });
    if (result.ok) {
      await onSaved(result.data);
      setEditing(false);
      setBudgetWarning("");
      setAck(false);
    } else {
      setError(result.error);
      if (result.budget)
        setBudgetWarning(
          `Gasto anual previsto: ${euro(result.budget.spent)} / 600 €. Referencia mensual: 50 €.`,
        );
    }
    setBusy(false);
  }
  async function annul() {
    setBusy(true);
    const result = await annulExpense(detail.id);
    if (result.ok) {
      await onSaved({ ...detail, annulledAt: new Date().toISOString() });
      setAnnulling(false);
    } else setError(result.error);
    setBusy(false);
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{detail.name}</DialogTitle>
          <DialogDescription>
            {detail.copies} copias · {detail.acquiredOn.slice(0, 10)} ·{" "}
            {originLabels[detail.origin]}
            {detail.seller ? ` · ${detail.seller}` : ""}. La valoración conserva
            las cartas originales del producto.
          </DialogDescription>
        </DialogHeader>
        {detail.sourceUrl && (
          <p className="break-all text-sm">Referencia: {detail.sourceUrl}</p>
        )}
        {detail.costBasis === "trend" && (
          <p className="text-sm text-muted-foreground">
            Inversión estimada por tendencia; no representa un importe pagado
            documentado.
          </p>
        )}
        <p className="text-sm">
          Cartas: {euro(detail.subtotal)} · Envío: {euro(detail.shipping)} ·
          Comisión: {euro(detail.fee)} · Total: {euro(detail.investment)}
        </p>
        <p className="text-sm">
          Valor inicial: {euro(detail.initialValue)}
          {detail.referenceItems !== detail.itemCount ? " (parcial)" : ""} ·
          Variación de mercado: {euro(detail.marketChange)}
        </p>
        <p>
          Ganancia no realizada: {euro(detail.profit)} · ROI:{" "}
          {detail.roi === null ? "Sin datos" : `${detail.roi}%`}
        </p>
        {detail.points.length > 1 ? (
          <div
            role="img"
            aria-label="Histórico del valor de las cartas frente a la inversión"
            className="h-52 min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.points}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => euro(Number(value))} />
                <ReferenceLine
                  y={detail.investment}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                />
                <Line dataKey="value" stroke="#3b82f6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay suficientes observaciones históricas completas para dibujar
            la evolución.
          </p>
        )}
        <div className="overflow-x-auto">
          <table aria-label="Rentabilidad por carta" className="w-full text-sm">
            <thead>
              <tr>
                {[
                  "Carta",
                  "Copias",
                  "Coste asignado",
                  "Inicial / unidad",
                  "Actual",
                  "Ganancia",
                ].map((h) => (
                  <th key={h} className="p-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-2">
                    {i.cardName}
                    <small className="block">
                      {i.setCode?.toUpperCase()} #{i.collectorNumber}
                      {i.isFoil ? " · Foil" : ""}
                    </small>
                  </td>
                  <td>{i.quantity}</td>
                  <td>{euro(i.costAmount)}</td>
                  <td>{euro(i.referenceUnitPrice)}</td>
                  <td>{euro(i.currentValue)}</td>
                  <td>{euro(i.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!detail.annulledAt && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              Editar compra
            </Button>
            <Button variant="destructive" onClick={() => setAnnulling(true)}>
              Anular compra
            </Button>
          </div>
        )}
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground">
              La edición conserva las cartas del inventario y su referencia
              inicial. Cambiar la fecha de una compra antigua vuelve a consultar
              su referencia histórica.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Nombre", name, setName, "text"],
                ["Fecha de adquisición", date, setDate, "date"],
                [
                  realCardmarket
                    ? "Subtotal de cartas (€)"
                    : "Precio total (€)",
                  total,
                  setTotal,
                  "number",
                ],
                ["Vendedor", seller, setSeller, "text"],
                ...(realCardmarket
                  ? [["Envío (€)", shipping, setShipping, "number"]]
                  : []),
              ].map(([label, value, setter, type]) => (
                <label key={String(label)} className="text-sm">
                  {String(label)}
                  <input
                    aria-label={String(label)}
                    type={String(type)}
                    value={String(value)}
                    required={label !== "Vendedor"}
                    disabled={
                      busy ||
                      (realCardmarket && label === "Subtotal de cartas (€)")
                    }
                    min={type === "number" ? 0 : undefined}
                    max={type === "date" ? todayDate() : undefined}
                    step="0.01"
                    onChange={(e) => {
                      (setter as (s: string) => void)(e.target.value);
                      setAck(false);
                      setBudgetWarning("");
                    }}
                    className="block min-h-11 w-full rounded-md border bg-background px-3"
                  />
                </label>
              ))}
            </div>
            {realCardmarket &&
              detail.items.map((i) => (
                <label key={i.id} className="block text-sm">
                  Precio pagado: {i.cardName} ({i.quantity} copias)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={busy}
                    value={prices[i.id]}
                    onChange={(e) => {
                      const next = { ...prices, [i.id]: e.target.value };
                      setPrices(next);
                      setTotal(
                        String(
                          detail.items.reduce(
                            (s, row) => s + Number(next[row.id]),
                            0,
                          ),
                        ),
                      );
                      setAck(false);
                    }}
                    className="ml-2 min-h-11 rounded-md border bg-background px-3"
                  />
                </label>
              ))}
            {budgetWarning && (
              <div role="alert" className="space-y-2">
                <p>{budgetWarning}</p>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  He revisado el presupuesto y acepto este gasto.
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={busy || (!!budgetWarning && !ack)}
              >
                Guardar cambios
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancelar edición
              </Button>
            </div>
          </form>
        )}
        {annulling && (
          <div role="alert" className="space-y-3">
            <p>
              Anular excluye la compra del presupuesto y libera sus
              asociaciones. Las cartas permanecerán en el inventario.
            </p>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void annul()}
            >
              Confirmar anulación
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAnnulling(false)}
            >
              Conservar compra
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
