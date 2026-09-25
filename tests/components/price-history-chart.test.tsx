import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { PriceHistoryChart } from "@/components/price-history-chart";
import type { PrintingPriceSeries, CardExpansionRelease } from "@/lib/pricing/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, {
              width: 800,
              height: 400,
            })
          : children}
      </div>
    ),
  };
});

describe("PriceHistoryChart - MTGGoldfish Expansion Markers", () => {
  const mockSeries: PrintingPriceSeries[] = [
    {
      printingId: "p-one",
      setCode: "one",
      collectorNumber: "123",
      setName: "Phyrexia: All Will Be One",
      releasedAt: "2023-02-10T00:00:00Z",
      points: [
        {
          provider: "cardmarket",
          currency: "EUR",
          trendPrice: 12.5,
          recordedAt: "2023-02-10T00:00:00Z",
        },
        {
          provider: "cardmarket",
          currency: "EUR",
          trendPrice: 10.0,
          recordedAt: "2023-04-21T00:00:00Z",
        },
        {
          provider: "cardmarket",
          currency: "EUR",
          trendPrice: 8.5,
          recordedAt: "2023-06-23T00:00:00Z",
        },
      ],
    },
  ];

  const mockExpansions: CardExpansionRelease[] = [
    {
      setCode: "one",
      setName: "Phyrexia: All Will Be One",
      releasedAt: "2023-02-10T00:00:00Z",
      iconSvgUri: "https://svgs.scryfall.io/sets/one.svg",
      collectorNumber: "123",
      printingId: "p-one",
      trendPrice: 12.5,
      hasPrinting: true,
    },
    {
      setCode: "mom",
      setName: "March of the Machine",
      releasedAt: "2023-04-21T00:00:00Z",
      iconSvgUri: "https://svgs.scryfall.io/sets/mom.svg",
      hasPrinting: false,
    },
    {
      setCode: "ltr",
      setName: "The Lord of the Rings: Tales of Middle-earth",
      releasedAt: "2023-06-23T00:00:00Z",
      iconSvgUri: "https://svgs.scryfall.io/sets/ltr.svg",
      hasPrinting: false,
    },
  ];

  it("renders the expansion toggle and shows the count of active markers", () => {
    render(
      <PriceHistoryChart
        series={mockSeries}
        expansions={mockExpansions}
        activePrintingId="p-one"
      />
    );

    expect(screen.getByText(/Lanzamientos de expansión \(3\)/i)).toBeDefined();
    expect(screen.getAllByText(/Nueva expansión/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Versión carta/i)).toBeDefined();
  });

  it("allows toggling expansion markers visibility", () => {
    render(
      <PriceHistoryChart
        series={mockSeries}
        expansions={mockExpansions}
        activePrintingId="p-one"
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /Lanzamientos de expansión/i });
    expect(checkbox).toBeDefined();
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it("calls onSelectPrinting when clicking an expansion marker with a printing", () => {
    const onSelect = vi.fn();
    render(
      <PriceHistoryChart
        series={mockSeries}
        expansions={mockExpansions}
        activePrintingId="p-one"
        onSelectPrinting={onSelect}
      />
    );

    const marker = screen.getByRole("button", { name: /ONE Phyrexia: All Will Be One/ });
    fireEvent.click(marker);
    expect(onSelect).toHaveBeenCalledWith("p-one");
  });
  it("renders continuous lines without daily dots and keeps releases outside the plot", () => {
    const { container } = render(<PriceHistoryChart series={mockSeries} expansions={mockExpansions} />);
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(0);
    expect(container.querySelector(".recharts-line-curve")).toBeInTheDocument();
    const marker = screen.getByRole("button", { name: /ONE Phyrexia/ });
    expect(marker.closest("svg")).toBeNull();
    expect(marker).toHaveTextContent("10 feb 2023");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByRole("region", { name: "Lanzamientos en el período" })).not.toBeInTheDocument();
  });

  it("highlights a release on its actual date even without a price sample that day", () => {
    const expansion = { ...mockExpansions[1], releasedAt: "2023-03-15T00:00:00Z" };
    const { container } = render(<PriceHistoryChart series={mockSeries} expansions={[expansion, { ...expansion, setCode: "alt" }]} />);
    const lines = container.querySelectorAll(".recharts-reference-line-line");
    expect(lines).toHaveLength(1);
    const marker = screen.getByRole("button", { name: /MOM March of the Machine/ });
    fireEvent.focus(marker);
    expect(container.querySelector(".recharts-reference-line-line")).toHaveAttribute("stroke", "#f59e0b");
    fireEvent.blur(marker);
    expect(container.querySelector(".recharts-reference-line-line")).toHaveAttribute("stroke", "#64748b");
  });

});
