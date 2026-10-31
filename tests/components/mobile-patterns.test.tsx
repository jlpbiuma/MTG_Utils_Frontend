import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewToolbar, ToolbarChoices } from "@/components/view-toolbar";
import { MobileScroller } from "@/components/ui/mobile-scroller";
import { PageActions } from "@/components/ui/page-actions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

describe("mobile design patterns", () => {
  it("folds filters, sorting and display behind one toggle with the active count", () => {
    render(
      <ViewToolbar
        search={<input aria-label="Buscar" />}
        filters={<span>Filtro de precio</span>}
        sorting={<span>Orden</span>}
        activeFilters={2}
      />
    );
    const toggle = screen.getByRole("button", { name: /Filtros y orden/ });
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("2");
    expect(panel).toHaveAttribute("data-open", "false");
    expect(panel).toHaveClass("hidden", "md:contents");
    expect(panel).toContainElement(screen.getByText("Filtro de precio"));
    // The search stays outside the folded panel.
    expect(panel).not.toContainElement(screen.getByLabelText("Buscar"));

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveClass("flex");
  });

  it("omits the toggle when there is nothing to fold", () => {
    render(<ViewToolbar search={<input aria-label="Buscar" />} />);
    expect(screen.queryByRole("button", { name: /Filtros y orden/ })).not.toBeInTheDocument();
  });

  it("renders toolbar choices as a swipeable row on phones", () => {
    render(<ToolbarChoices label="Tipo" value="all" onChange={() => {}} options={[{ value: "all", label: "Todos" }]} />);
    expect(screen.getByRole("group", { name: "Tipo" })).toHaveClass("snap-row", "overflow-x-auto", "md:flex-wrap");
  });

  it("lays out summary cards and header actions with the shared mobile classes", () => {
    render(
      <>
        <MobileScroller label="Resumen" className="sm:grid-cols-3"><div>A</div><div>B</div></MobileScroller>
        <PageActions><button>Importar</button><button>Exportar</button><button>Añadir</button></PageActions>
      </>
    );
    expect(screen.getByRole("group", { name: "Resumen" })).toHaveClass("snap-row", "sm:grid", "sm:grid-cols-3");
    expect(screen.getByText("Añadir").parentElement).toHaveAttribute("data-page-actions");
  });

  it("opens dialogs as bottom sheets on phones without losing per-dialog desktop sizes", () => {
    render(
      <Dialog open>
        <DialogContent className="max-w-6xl">
          <DialogTitle>Detalle</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveAttribute("data-mobile-sheet");
    expect(sheet).toHaveClass("max-w-6xl", "max-sm:bottom-0", "max-sm:max-w-none", "max-sm:overflow-y-auto");
  });
});
