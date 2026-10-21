import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PricingSummary } from "@/components/pricing-summary";
it("shows cached Cardmarket values without any manual update or provider controls", () => {
  render(<PricingSummary summary={{provider:"cardmarket",currency:"EUR",currencySymbol:"€",totalCards:2,totalNetValue:30,totalOwnedValue:20,totalMissingValue:10,quotes:{}}} />);
  expect(screen.getByText("Cardmarket (€)")).toBeInTheDocument();
  expect(screen.getByText("30.00")).toBeInTheDocument();
  expect(screen.getByText("20.00")).toBeInTheDocument();
  expect(screen.getByText("10.00")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("group", {name:/Proveedor|Mercado/})).not.toBeInTheDocument();
});
