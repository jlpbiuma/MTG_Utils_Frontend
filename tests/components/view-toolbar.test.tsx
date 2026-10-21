import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  ViewToolbar,
  ToolbarChoices,
  ToolbarSearch,
  ToolbarSort,
} from "@/components/view-toolbar";

function Example() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  return (
    <ViewToolbar
      search={
        <ToolbarSearch value={query} onChange={setQuery} placeholder="Buscar" />
      }
      filters={
        <ToolbarChoices
          label="Colección"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todas" },
            { value: "owned", label: "En colección" },
          ]}
        />
      }
      sorting={
        <ToolbarSort
          value={sort}
          direction={direction}
          onChange={(value, dir) => {
            setSort(value);
            setDirection(dir);
          }}
          options={[
            { value: "name", label: "Nombre" },
            { value: "price", label: "Precio", defaultDesc: true },
          ]}
        />
      }
      display={
        <ToolbarChoices
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "Cuadrícula" },
            { value: "list", label: "Listado" },
          ]}
        />
      }
      actions={<button type="button">Exportar</button>}
    />
  );
}

describe("shared view toolbar", () => {
  it("keeps search, filters, sorting, display and actions in the same order without selects", () => {
    const { container } = render(<Example />);
    expect(
      [...container.querySelectorAll("[data-toolbar-slot]")].map((element) =>
        element.getAttribute("data-toolbar-slot"),
      ),
    ).toEqual(["search", "filters", "sorting", "display", "actions"]);
    expect(container.querySelector("select")).toBeNull();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Buscar" }),
    ).toBeInTheDocument();
  });
  it("keeps filters and search when changing display and toggles sort direction independently", () => {
    render(<Example />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Sol Ring" },
    });
    fireEvent.click(screen.getByRole("button", { name: "En colección" }));
    fireEvent.click(screen.getByRole("button", { name: "Listado" }));
    expect(screen.getByRole("searchbox")).toHaveValue("Sol Ring");
    expect(
      screen.getByRole("button", { name: "En colección" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Listado" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Precio" }));
    expect(
      screen.getByRole("button", { name: /Orden descendente:/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Orden descendente:/ }));
    expect(screen.getByRole("button", { name: "Precio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /Orden ascendente:/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Precio" }));
    expect(
      screen.getByRole("button", { name: /Orden descendente:/ }),
    ).toBeInTheDocument();
  });
});
