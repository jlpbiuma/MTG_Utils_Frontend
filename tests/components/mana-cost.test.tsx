import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ManaCost } from "@/components/mana-cost";

describe("ManaCost Component", () => {
  it("should render nothing when manaCost is null or undefined", () => {
    const { container } = render(<ManaCost manaCost={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("should parse and render mana symbols correctly", () => {
    render(<ManaCost manaCost="{2}{U}{U}" />);

    const symbol2 = screen.getByText("2");
    const symbolU = screen.getAllByText("U");

    expect(symbol2).toBeInTheDocument();
    expect(symbolU).toHaveLength(2);
  });

  it("should render symbols with appropriate title attribute for accessibility", () => {
    render(<ManaCost manaCost="{W}{B}" />);

    expect(screen.getByTitle("Mana: W")).toBeInTheDocument();
    expect(screen.getByTitle("Mana: B")).toBeInTheDocument();
  });
});

describe("ManaCost hybrid, Phyrexian and multi-face costs", () => {
  it("renders Phyrexian and hybrid symbols as drawn mana symbols, not text badges", () => {
    render(<ManaCost manaCost="{1}{B/P}{G/W}{2/W}{G/U/P}" />);
    expect(screen.getByTestId("mana-symbol-B/P").querySelector("svg")).toHaveAttribute("aria-label", "Pirexiano negro");
    expect(screen.getByTestId("mana-symbol-G/W").querySelector("svg")).toHaveAttribute("aria-label", "Híbrido verde/blanco");
    expect(screen.getByTestId("mana-symbol-2/W").querySelector("svg")).toHaveAttribute("aria-label", "Híbrido 2/blanco");
    expect(screen.getByTestId("mana-symbol-G/U/P").querySelector("svg")).toHaveAttribute("aria-label", "Híbrido pirexiano verde/azul");
    expect(screen.getByTitle("Mana: 1")).toBeInTheDocument();
  });

  it("separates the faces of split and adventure costs", () => {
    render(<ManaCost manaCost="{1}{R} // {1}{U}" />);
    expect(screen.getAllByTestId("mana-face-separator")).toHaveLength(1);
    expect(screen.getByTestId("mana-symbol-R")).toBeInTheDocument();
    expect(screen.getByTestId("mana-symbol-U")).toBeInTheDocument();
  });

  it("keeps half mana and unknown symbols as text badges", () => {
    render(<ManaCost manaCost="{1/2}{HW}{T}" />);
    expect(screen.getByTitle("Mana: 1/2")).toHaveTextContent("1/2");
    expect(screen.getByTitle("Mana: HW")).toHaveTextContent("HW");
  });
});
