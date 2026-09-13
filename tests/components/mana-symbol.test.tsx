import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  ManaSymbol,
  isStandardManaColor,
  ManaSymbolKey,
} from "@/components/mana-symbol";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { ManaCost } from "@/components/mana-cost";

describe("ManaSymbol Component", () => {
  const MTG_COLORS: Array<{
    symbol: ManaSymbolKey;
    expectedEs: string;
    expectedEn: string;
  }> = [
    { symbol: "W", expectedEs: "Blanco (Sol)", expectedEn: "White (Sun)" },
    { symbol: "U", expectedEs: "Azul (Gota de Agua)", expectedEn: "Blue (Water Drop)" },
    { symbol: "B", expectedEs: "Negro (Calavera)", expectedEn: "Black (Skull)" },
    { symbol: "R", expectedEs: "Rojo (Fueguito)", expectedEn: "Red (Fire)" },
    { symbol: "G", expectedEs: "Verde (Árbol)", expectedEn: "Green (Tree)" },
    { symbol: "C", expectedEs: "Incoloro (Diamante)", expectedEn: "Colorless (Diamond)" },
  ];

  it.each(MTG_COLORS)(
    "should render authentic SVG symbol for color $symbol with label $expectedEs",
    ({ symbol, expectedEs }) => {
      const { container } = render(<ManaSymbol symbol={symbol} />);
      const svg = container.querySelector("svg");

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("viewBox", "0 0 100 100");
      expect(svg).toHaveAttribute("aria-label", expectedEs);

      const circle = svg?.querySelector("circle");
      const path = svg?.querySelector("path");

      expect(circle).toBeInTheDocument();
      expect(path).toBeInTheDocument();
      expect(path?.getAttribute("d")).toBeTruthy();
    }
  );

  it("should handle lowercase or bracketed symbols like '{r}' or 'g'", () => {
    const { container: containerR } = render(<ManaSymbol symbol="{r}" />);
    expect(containerR.querySelector("svg")).toHaveAttribute("aria-label", "Rojo (Fueguito)");

    const { container: containerG } = render(<ManaSymbol symbol="g" />);
    expect(containerG.querySelector("svg")).toHaveAttribute("aria-label", "Verde (Árbol)");
  });

  it("should return null for invalid or non-color symbols", () => {
    const { container } = render(<ManaSymbol symbol="XYZ" />);
    expect(container.firstChild).toBeNull();
  });

  it("should correctly identify standard MTG colors with isStandardManaColor", () => {
    expect(isStandardManaColor("W")).toBe(true);
    expect(isStandardManaColor("U")).toBe(true);
    expect(isStandardManaColor("B")).toBe(true);
    expect(isStandardManaColor("R")).toBe(true);
    expect(isStandardManaColor("G")).toBe(true);
    expect(isStandardManaColor("C")).toBe(true);
    expect(isStandardManaColor("{R}")).toBe(true);

    expect(isStandardManaColor("1")).toBe(false);
    expect(isStandardManaColor("X")).toBe(false);
    expect(isStandardManaColor("Z")).toBe(false);
  });
});

describe("ColorIdentityPips with MTG Symbols", () => {
  it("should render authentic MTG icons for all 5 colors", () => {
    render(<ColorIdentityPips colors={["W", "U", "B", "R", "G"]} size="md" />);

    expect(screen.getByTestId("color-pip-W")).toBeInTheDocument();
    expect(screen.getByTestId("color-pip-U")).toBeInTheDocument();
    expect(screen.getByTestId("color-pip-B")).toBeInTheDocument();
    expect(screen.getByTestId("color-pip-R")).toBeInTheDocument();
    expect(screen.getByTestId("color-pip-G")).toBeInTheDocument();

    expect(screen.getByTitle("Rojo")).toBeInTheDocument();
    expect(screen.getByTitle("Verde")).toBeInTheDocument();
    expect(screen.getByTitle("Blanco")).toBeInTheDocument();
    expect(screen.getByTitle("Azul")).toBeInTheDocument();
    expect(screen.getByTitle("Negro")).toBeInTheDocument();
  });
});

describe("ManaCost with MTG Symbols", () => {
  it("should render MTG symbols for colored mana and text badge for generic mana", () => {
    render(<ManaCost manaCost="{2}{R}{G}" />);

    // 2 is generic mana
    expect(screen.getByText("2")).toBeInTheDocument();

    // R and G have authentic mana symbols
    expect(screen.getByTestId("mana-symbol-R")).toBeInTheDocument();
    expect(screen.getByTestId("mana-symbol-G")).toBeInTheDocument();

    // R and G also have accessible text
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
  });
});
