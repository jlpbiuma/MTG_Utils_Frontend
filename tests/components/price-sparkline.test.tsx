import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PriceSparkline } from "@/components/price-sparkline";

const points = [
  { date: "2026-09-01", price: 4 },
  { date: "2026-09-10", price: 3 },
  { date: "2026-09-24", price: 2 },
];

describe("PriceSparkline", () => {
  it("shows the recorded decline and allows keyboard inspection and opening details", () => {
    const open = vi.fn();
    render(<PriceSparkline points={points} cardName="Sol Ring" currencySymbol="€" onOpen={open} />);
    const chart = screen.getByRole("button", { name: /Histórico de precio de Sol Ring/ });
    expect(chart).toHaveTextContent("-50.00%");
    fireEvent.focus(chart);
    expect(chart).toHaveTextContent("2.00 €");
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(chart).toHaveTextContent("3.00 €");
    fireEvent.click(chart);
    expect(open).toHaveBeenCalledOnce();
  });

  it.each([{ series: [] }, { series: [points[0]] }, { series: [{ date: "invalid", price: 2 }] }])("does not fabricate a trend for insufficient history", ({ series }) => {
    render(<PriceSparkline points={series} cardName="Sol Ring" currencySymbol="€" onOpen={vi.fn()} />);
    expect(screen.getByText("Sin historial suficiente")).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeNull();
  });

  it("renders a flat history without invalid coordinates", () => {
    const { container } = render(<PriceSparkline points={points.map((p) => ({ ...p, price: 2 }))} cardName="Sol Ring" currencySymbol="$" onOpen={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("0.00%");
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("orders dates chronologically and shows a positive trend", () => {
    render(<PriceSparkline points={[{ date: "2026-09-24", price: 4 }, { date: "2026-09-01", price: 2 }]} cardName="Sol Ring" currencySymbol="€" onOpen={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("+100.00%");
  });
});
