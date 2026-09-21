import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportListDialog } from "@/components/export-list-dialog";

describe("ExportListDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders trigger button and opens dialog", () => {
    render(
      <ExportListDialog
        cards={[
          { cardName: "Dark Ritual", quantity: 1 },
          { cardName: "Stock Up", quantity: 3 },
        ]}
      />
    );

    const trigger = screen.getByRole("button", { name: /Exportar lista/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("heading", { name: "Exportar Lista" })).toBeInTheDocument();
  });

  it("formats cards correctly in <quantity> <cardName> format", () => {
    render(
      <ExportListDialog
        cards={[
          { cardName: "Dark Ritual", quantity: 1 },
          { cardName: "Stock Up", quantity: 3 },
          { cardName: "Dark Ritual", quantity: 2 }, // Duplicate should be consolidated
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Exportar lista/i }));

    const textarea = screen.getByPlaceholderText(/No hay cartas para exportar/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("3 Dark Ritual\n3 Stock Up");
  });

  it("copies list to clipboard", async () => {
    render(
      <ExportListDialog
        cards={[
          { cardName: "Dark Ritual", quantity: 1 },
          { cardName: "Stock Up", quantity: 3 },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Exportar lista/i }));

    const copyButton = screen.getByRole("button", { name: /Copiar lista/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("1 Dark Ritual\n3 Stock Up");
    await waitFor(() => {
      expect(screen.getByText("¡Copiado!")).toBeInTheDocument();
    });
  });

  it("allows switching scope between filtered and all cards", () => {
    render(
      <ExportListDialog
        cards={[{ cardName: "Stock Up", quantity: 3 }]}
        allCards={[
          { cardName: "Dark Ritual", quantity: 1 },
          { cardName: "Stock Up", quantity: 3 },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Exportar lista/i }));

    const filterScopeBtn = screen.getByRole("button", { name: /Filtro actual/i });
    const allScopeBtn = screen.getByRole("button", { name: /Total completo/i });
    expect(filterScopeBtn).toBeInTheDocument();
    expect(allScopeBtn).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/No hay cartas para exportar/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("3 Stock Up");

    fireEvent.click(allScopeBtn);
    expect(textarea.value).toBe("1 Dark Ritual\n3 Stock Up");
  });
});
