import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import * as actions from "@/actions/simulated-collections";

// Mock actions
vi.mock("@/actions/simulated-collections", () => ({
  getSimulatedCollections: vi.fn(),
  getSimulatedCollection: vi.fn(),
  analyzeRawSimulatedCollection: vi.fn(),
  createSimulatedCollection: vi.fn(),
  deleteSimulatedCollection: vi.fn(),
}));

// Mock CardDetailDialog
vi.mock("@/components/card-detail-dialog", () => ({
  CardDetailDialog: vi.fn(({ isOpen, cardId, cardName }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-card-detail-dialog">
        <span data-testid="detail-name">{cardName}</span>
        <span data-testid="detail-id">{cardId}</span>
      </div>
    );
  }),
}));

describe("Simulated Collections Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state in tab when no collections are saved", async () => {
    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([]);

    render(<SimulatedCollectionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Colecciones Simuladas")).toBeInTheDocument();
      expect(screen.getByText("No tienes colecciones simuladas")).toBeInTheDocument();
    });
  });

  it("renders saved collections list with 4 metric boxes (no Huecos Cubiertos) and standardized card counts", async () => {
    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([
      {
        id: "sim-1",
        name: "Lote Wallapop 50 cartas",
        description: "Lote con tierras y artefactos",
        totalCards: 50,
        uniqueCards: 42,
        totalEconomicValue: 64.80,
        economicValueExcludingOwned: 45.20,
        sellableValue: 18.50,
        sellableCardsCount: 10,
        globalNetGain: 8.50,
        usefulCardsCount: 38,
        alreadyOwnedCardsCount: 12,
        benefitedDecksCount: 9,
        createdAt: "2026-09-18T10:00:00Z",
        updatedAt: "2026-09-18T10:00:00Z",
      },
    ]);

    render(<SimulatedCollectionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Lote Wallapop 50 cartas")).toBeInTheDocument();
      expect(screen.getByText("64.80 €")).toBeInTheDocument();
      expect(screen.getByText("45.20 €")).toBeInTheDocument();
      // Blue metric: Valor vendible
      expect(screen.getByText("18.50 €")).toBeInTheDocument();
      expect(screen.getByText("Valor vendible")).toBeInTheDocument();
      expect(screen.getByText("+8.50%")).toBeInTheDocument();

      // Standardized card counts in each box
      expect(screen.getByText("50 cartas")).toBeInTheDocument(); // Total
      expect(screen.getAllByText("38 cartas")).toHaveLength(2); // Sin ya existentes (50 - 12) & útil (38)
      expect(screen.getByText("10 cartas")).toBeInTheDocument(); // Vendibles

      // Huecos Cubiertos must NOT be present
      expect(screen.queryByText("Huecos Cubiertos")).not.toBeInTheDocument();
    });
  });

  it("clicking a saved collection renders in-page 3-column view, tags at footer, and no Huecos Cubiertos", async () => {
    const mockCollectionSummary: actions.SimulatedCollectionSummary = {
      id: "sim-123",
      name: "Colección Lote Especial",
      description: "Prueba de vista en página",
      totalCards: 2,
      uniqueCards: 2,
      totalEconomicValue: 30.00,
      economicValueExcludingOwned: 20.00,
      sellableValue: 10.00,
      sellableCardsCount: 1,
      globalNetGain: 4.5,
      usefulCardsCount: 1,
      alreadyOwnedCardsCount: 1,
      benefitedDecksCount: 1,
      createdAt: "2026-09-18T10:00:00Z",
      updatedAt: "2026-09-18T10:00:00Z",
    };

    const mockCollectionDetail: actions.SimulatedCollectionAnalysisResponse = {
      id: "sim-123",
      name: "Colección Lote Especial",
      description: "Prueba de vista en página",
      totalCards: 2,
      uniqueCards: 2,
      totalEconomicValue: 30.00,
      economicValueExcludingOwned: 20.00,
      sellableValue: 10.00,
      sellableCardsCount: 1,
      currencySymbol: "€",
      globalNetGain: 4.5,
      usefulCardsCount: 1,
      alreadyOwnedCardsCount: 1,
      benefitedDecksCount: 1,
      cards: [
        {
          cardName: "Sol Ring",
          cardScryfallId: "sol-id",
          quantity: 1,
          manaCost: "{1}",
          typeLine: "Artifact",
          imageUri: "https://example.com/sol.jpg",
          unitPrice: 20.00,
          totalPrice: 20.00,
          copiesOwnedReal: 0,
          copiesNeededTotal: 1,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.0,
          netCompletionGain: 4.5,
          candidateDeckCount: 1,
          candidateDecks: [
            {
              deckId: "deck-1",
              deckName: "Mazo Comandante",
              completionPercentage: 90,
              colors: ["U"],
              requestedQuantity: 1,
              assignedQuantity: 0,
              missingQuantity: 1,
              potentialGain: 4.5,
            },
          ],
        },
        {
          cardName: "Lightning Bolt",
          cardScryfallId: "bolt-id",
          quantity: 1,
          manaCost: "{R}",
          typeLine: "Instant",
          imageUri: "https://example.com/bolt.jpg",
          unitPrice: 10.00,
          totalPrice: 10.00,
          copiesOwnedReal: 4,
          copiesNeededTotal: 0,
          usefulCopies: 0,
          surplusCopies: 1,
          sellableCopies: 1,
          sellableValue: 10.00,
          netCompletionGain: 0.0,
          candidateDeckCount: 0,
          candidateDecks: [],
        },
      ],
    };

    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([mockCollectionSummary]);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue(mockCollectionDetail);

    render(<SimulatedCollectionsTab />);

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText("Colección Lote Especial")).toBeInTheDocument();
    });

    // Click on the collection card
    fireEvent.click(screen.getByText("Colección Lote Especial"));

    // Verify it switches to the in-page view
    await waitFor(() => {
      expect(screen.getByText("Volver a Colecciones Simuladas")).toBeInTheDocument();
      // Blue metric
      expect(screen.getAllByText("10.00 €").length).toBeGreaterThanOrEqual(1);
      // Standardized count in boxes
      expect(screen.getAllByText("1 cartas").length).toBeGreaterThanOrEqual(1);

      // Huecos Cubiertos must NOT be present
      expect(screen.queryByText("Huecos Cubiertos")).not.toBeInTheDocument();

      // Both cards are rendered
      expect(screen.getByText("Sol Ring")).toBeInTheDocument();
      expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();

      // Tags at footer
      expect(screen.getByText("Vendible: x1")).toBeInTheDocument();
      expect(screen.getByText("En col: x4")).toBeInTheDocument();
      expect(screen.getByText("Nueva")).toBeInTheDocument();
      expect(screen.getByText("1 mazo que la pide")).toBeInTheDocument();
    });

    // Clicking card opens CardDetailDialog
    fireEvent.click(screen.getByText("Sol Ring"));
    await waitFor(() => {
      expect(screen.getByTestId("mock-card-detail-dialog")).toBeInTheDocument();
      expect(screen.getByTestId("detail-name")).toHaveTextContent("Sol Ring");
    });

    // Clicking back button returns to the list view
    fireEvent.click(screen.getByText("Volver a Colecciones Simuladas"));
    await waitFor(() => {
      expect(screen.getByText("Nueva Colección Simulada")).toBeInTheDocument();
    });
  });

  it("supports the Deck Growth feature showing visual progress bar and cards added in list and grid formats", async () => {
    const mockDeckGrowthDetail: actions.SimulatedCollectionAnalysisResponse = {
      id: "sim-growth",
      name: "Colección Crecimiento",
      description: null,
      totalCards: 2,
      uniqueCards: 2,
      totalEconomicValue: 25.00,
      economicValueExcludingOwned: 25.00,
      sellableValue: 0.00,
      sellableCardsCount: 0,
      currencySymbol: "€",
      globalNetGain: 6.0,
      usefulCardsCount: 2,
      alreadyOwnedCardsCount: 0,
      benefitedDecksCount: 2,
      cards: [
        {
          cardName: "Demonic Tutor",
          cardScryfallId: "dt-id",
          quantity: 1,
          manaCost: "{1}{B}",
          typeLine: "Sorcery",
          imageUri: null,
          unitPrice: 20.00,
          totalPrice: 20.00,
          copiesOwnedReal: 0,
          copiesNeededTotal: 1,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.0,
          netCompletionGain: 3.5,
          candidateDeckCount: 1,
          candidateDecks: [
            {
              deckId: "deck-reanimator",
              deckName: "Reanimator Golgari",
              completionPercentage: 70.0,
              colors: ["B", "G"],
              requestedQuantity: 1,
              assignedQuantity: 0,
              missingQuantity: 1,
              potentialGain: 3.5,
            },
          ],
        },
        {
          cardName: "Animate Dead",
          cardScryfallId: "ad-id",
          quantity: 1,
          manaCost: "{1}{B}",
          typeLine: "Enchantment",
          imageUri: null,
          unitPrice: 5.00,
          totalPrice: 5.00,
          copiesOwnedReal: 0,
          copiesNeededTotal: 1,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.0,
          netCompletionGain: 2.5,
          candidateDeckCount: 1,
          candidateDecks: [
            {
              deckId: "deck-reanimator",
              deckName: "Reanimator Golgari",
              completionPercentage: 70.0,
              colors: ["B", "G"],
              requestedQuantity: 1,
              assignedQuantity: 0,
              missingQuantity: 1,
              potentialGain: 2.5,
            },
          ],
        },
      ],
    };

    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([
      {
        id: "sim-growth",
        name: "Colección Crecimiento",
        totalCards: 2,
        uniqueCards: 2,
        totalEconomicValue: 25.00,
        economicValueExcludingOwned: 25.00,
        sellableValue: 0.00,
        sellableCardsCount: 0,
        globalNetGain: 6.0,
        usefulCardsCount: 2,
        alreadyOwnedCardsCount: 0,
        benefitedDecksCount: 1,
        createdAt: "2026-09-18T10:00:00Z",
        updatedAt: "2026-09-18T10:00:00Z",
      },
    ]);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue(mockDeckGrowthDetail);

    render(<SimulatedCollectionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Colección Crecimiento")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Colección Crecimiento"));

    // Switch to 'Crecimiento de Mazos' tab
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Crecimiento de Mazos/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Crecimiento de Mazos/i }));

    // Verify deck growth is shown
    await waitFor(() => {
      expect(screen.getByText("Reanimator Golgari")).toBeInTheDocument();
      // Progress numbers: 70.0% -> 76.0%
      expect(screen.getByText("70.0%")).toBeInTheDocument();
      expect(screen.getByText("76.0%")).toBeInTheDocument();
      expect(screen.getByText("+6.0%")).toBeInTheDocument();
      // Number of cards that would be added
      expect(screen.getByText("+2 cartas")).toBeInTheDocument();
      // Added cards are listed
      expect(screen.getByText("Demonic Tutor")).toBeInTheDocument();
      expect(screen.getByText("Animate Dead")).toBeInTheDocument();
    });

    // Toggle format to Lista
    const listFormatButton = screen.getByRole("button", { name: /Lista/i });
    fireEvent.click(listFormatButton);

    await waitFor(() => {
      expect(screen.getByText("Reanimator Golgari")).toBeInTheDocument();
      expect(screen.getByText("+2 cartas")).toBeInTheDocument();
    });
  });

  it("filters out cards that already exist in collection when 'Aportan a mazos' is selected", async () => {
    const mockDetailWithMixedCards: actions.SimulatedCollectionAnalysisResponse = {
      id: "sim-mixed",
      name: "Colección Filtro Test",
      description: null,
      totalCards: 2,
      uniqueCards: 2,
      totalEconomicValue: 15.00,
      economicValueExcludingOwned: 10.00,
      sellableValue: 0.00,
      sellableCardsCount: 0,
      currencySymbol: "€",
      globalNetGain: 2.0,
      usefulCardsCount: 2,
      alreadyOwnedCardsCount: 1,
      benefitedDecksCount: 1,
      cards: [
        {
          cardName: "Mana Vault",
          cardScryfallId: "mv-id",
          quantity: 1,
          manaCost: "{1}",
          typeLine: "Artifact",
          imageUri: null,
          unitPrice: 10.00,
          totalPrice: 10.00,
          copiesOwnedReal: 0, // NEW! Truly contributes to deck completion
          copiesNeededTotal: 1,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.0,
          netCompletionGain: 2.0,
          candidateDeckCount: 1,
          candidateDecks: [],
        },
        {
          cardName: "Counterspell",
          cardScryfallId: "cs-id",
          quantity: 1,
          manaCost: "{U}{U}",
          typeLine: "Instant",
          imageUri: null,
          unitPrice: 5.00,
          totalPrice: 5.00,
          copiesOwnedReal: 1, // ALREADY IN COLLECTION! Contributes to economic lot value but MUST BE FILTERED OUT in 'Aportan a mazos'
          copiesNeededTotal: 2,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.0,
          netCompletionGain: 0.0,
          candidateDeckCount: 1,
          candidateDecks: [],
        },
      ],
    };

    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([
      {
        id: "sim-mixed",
        name: "Colección Filtro Test",
        totalCards: 2,
        uniqueCards: 2,
        totalEconomicValue: 15.00,
        economicValueExcludingOwned: 10.00,
        sellableValue: 0.00,
        sellableCardsCount: 0,
        globalNetGain: 2.0,
        usefulCardsCount: 2,
        alreadyOwnedCardsCount: 1,
        benefitedDecksCount: 1,
        createdAt: "2026-09-18T10:00:00Z",
        updatedAt: "2026-09-18T10:00:00Z",
      },
    ]);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue(mockDetailWithMixedCards);

    render(<SimulatedCollectionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Colección Filtro Test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Colección Filtro Test"));

    await waitFor(() => {
      expect(screen.getByText("Mana Vault")).toBeInTheDocument();
      expect(screen.getByText("Counterspell")).toBeInTheDocument();
    });

    // In 'Aportan a mazos', count should only be 1 (excluding Counterspell which has copiesOwnedReal > 0)
    const usefulFilterButton = screen.getByRole("button", { name: /Aportan a mazos \(1\)/i });
    expect(usefulFilterButton).toBeInTheDocument();

    // Click filter 'Aportan a mazos'
    fireEvent.click(usefulFilterButton);

    await waitFor(() => {
      // Mana Vault is kept
      expect(screen.getByText("Mana Vault")).toBeInTheDocument();
      // Counterspell is filtered out
      expect(screen.queryByText("Counterspell")).not.toBeInTheDocument();
    });
  });

  it("excludes basic lands (Bosques, Forest) and already owned cards (Sol Ring) from deck growth and 'Aportan a mazos'", async () => {
    const mockDetailWithBasicsAndOwned: actions.SimulatedCollectionAnalysisResponse = {
      id: "sim-basics-owned",
      name: "Colección Tierras y Sol Ring",
      description: null,
      totalCards: 4,
      uniqueCards: 3,
      totalEconomicValue: 20.00,
      economicValueExcludingOwned: 15.00,
      sellableValue: 5.00,
      sellableCardsCount: 2,
      currencySymbol: "€",
      globalNetGain: 3.0,
      usefulCardsCount: 1,
      alreadyOwnedCardsCount: 1,
      benefitedDecksCount: 1,
      cards: [
        {
          cardName: "Sol Ring",
          cardScryfallId: "sol-id",
          quantity: 1,
          manaCost: "{1}",
          typeLine: "Artifact",
          imageUri: null,
          unitPrice: 5.00,
          totalPrice: 5.00,
          copiesOwnedReal: 1, // ALREADY OWNED -> must NOT contribute to deck completion
          copiesNeededTotal: 2,
          usefulCopies: 0,
          surplusCopies: 1,
          sellableCopies: 1,
          sellableValue: 5.00,
          netCompletionGain: 0.0,
          candidateDeckCount: 0,
          candidateDecks: [],
        },
        {
          cardName: "Bosques",
          cardScryfallId: "bosque-id",
          quantity: 2,
          manaCost: null,
          typeLine: "Tierra básica — Bosque", // BASIC LAND -> must NOT contribute to deck completion
          imageUri: null,
          unitPrice: 0.00,
          totalPrice: 0.00,
          copiesOwnedReal: 0,
          copiesNeededTotal: 5,
          usefulCopies: 0,
          surplusCopies: 2,
          sellableCopies: 0,
          sellableValue: 0.00,
          netCompletionGain: 0.0,
          candidateDeckCount: 0,
          candidateDecks: [],
        },
        {
          cardName: "Demonic Tutor",
          cardScryfallId: "dt-id",
          quantity: 1,
          manaCost: "{1}{B}",
          typeLine: "Sorcery",
          imageUri: null,
          unitPrice: 15.00,
          totalPrice: 15.00,
          copiesOwnedReal: 0, // NEW NON-BASIC -> contributes
          copiesNeededTotal: 1,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.00,
          netCompletionGain: 3.0,
          candidateDeckCount: 1,
          candidateDecks: [
            {
              deckId: "deck-mono-black",
              deckName: "Mono Black Control",
              completionPercentage: 80.0,
              colors: ["B"],
              requestedQuantity: 1,
              assignedQuantity: 0,
              missingQuantity: 1,
              potentialGain: 3.0,
            },
          ],
        },
      ],
    };

    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([
      {
        id: "sim-basics-owned",
        name: "Colección Tierras y Sol Ring",
        totalCards: 4,
        uniqueCards: 3,
        totalEconomicValue: 20.00,
        economicValueExcludingOwned: 15.00,
        sellableValue: 5.00,
        sellableCardsCount: 2,
        globalNetGain: 3.0,
        usefulCardsCount: 1,
        alreadyOwnedCardsCount: 1,
        benefitedDecksCount: 1,
        createdAt: "2026-09-18T10:00:00Z",
        updatedAt: "2026-09-18T10:00:00Z",
      },
    ]);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue(mockDetailWithBasicsAndOwned);

    render(<SimulatedCollectionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Colección Tierras y Sol Ring")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Colección Tierras y Sol Ring"));

    await waitFor(() => {
      expect(screen.getByText("Sol Ring")).toBeInTheDocument();
      expect(screen.getByText("Bosques")).toBeInTheDocument();
      expect(screen.getByText("Demonic Tutor")).toBeInTheDocument();
    });

    // 1. Check 'Aportan a mazos' filter button shows count 1 (only Demonic Tutor)
    const usefulButton = screen.getByRole("button", { name: /Aportan a mazos \(1\)/i });
    expect(usefulButton).toBeInTheDocument();

    fireEvent.click(usefulButton);

    await waitFor(() => {
      expect(screen.getByText("Demonic Tutor")).toBeInTheDocument();
      expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
      expect(screen.queryByText("Bosques")).not.toBeInTheDocument();
    });

    // 2. Check 'Crecimiento de Mazos' tab
    const growthTabBtn = screen.getByRole("button", { name: /Crecimiento de Mazos/i });
    fireEvent.click(growthTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Mono Black Control")).toBeInTheDocument();
      // Only Demonic Tutor is in added cards, not Sol Ring, not Bosques
      expect(screen.getByText("Demonic Tutor")).toBeInTheDocument();
      expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
      expect(screen.queryByText("Bosques")).not.toBeInTheDocument();
    });
  });

  it("analyzes raw text input in modal, shows blue 'Valor vendible' metric with standardized card counts, and closes modal on save", async () => {
    const mockAnalysisResponse: actions.SimulatedCollectionAnalysisResponse = {
      id: null,
      name: "Simulación Test",
      description: null,
      totalEconomicValue: 24.50,
      economicValueExcludingOwned: 24.50,
      sellableValue: 5.50,
      sellableCardsCount: 1,
      currencySymbol: "€",
      globalNetGain: 5.25,
      totalCards: 2,
      uniqueCards: 2,
      usefulCardsCount: 1,
      alreadyOwnedCardsCount: 0,
      benefitedDecksCount: 1,
      cards: [
        {
          cardName: "Sol Ring",
          cardScryfallId: "sol-cheap-id",
          quantity: 1,
          setCode: "clb",
          collectorNumber: "123",
          manaCost: "{1}",
          typeLine: "Artifact",
          imageUri: "https://images.example.com/sol.jpg",
          unitPrice: 19.00,
          totalPrice: 19.00,
          copiesOwnedReal: 0,
          copiesNeededTotal: 2,
          usefulCopies: 1,
          surplusCopies: 0,
          sellableCopies: 0,
          sellableValue: 0.0,
          netCompletionGain: 5.25,
          candidateDeckCount: 1,
          candidateDecks: [
            {
              deckId: "d1",
              deckName: "Mazo Golgari",
              completionPercentage: 80.0,
              colors: ["B", "G"],
              requestedQuantity: 1,
              assignedQuantity: 0,
              missingQuantity: 1,
              potentialGain: 5.25,
            },
          ],
        },
        {
          cardName: "Forest",
          cardScryfallId: "forest-id",
          quantity: 1,
          setCode: "clb",
          collectorNumber: "124",
          manaCost: null,
          typeLine: "Basic Land — Forest",
          imageUri: null,
          unitPrice: 5.50,
          totalPrice: 5.50,
          copiesOwnedReal: 10,
          copiesNeededTotal: 0,
          usefulCopies: 0,
          surplusCopies: 1,
          sellableCopies: 1,
          sellableValue: 5.50,
          netCompletionGain: 0.0,
          candidateDeckCount: 0,
          candidateDecks: [],
        },
      ],
    };

    const mockSavedResponse: actions.SimulatedCollectionAnalysisResponse = {
      ...mockAnalysisResponse,
      id: "sim-saved-1",
    };

    vi.mocked(actions.analyzeRawSimulatedCollection).mockResolvedValue(mockAnalysisResponse);
    vi.mocked(actions.createSimulatedCollection).mockResolvedValue(mockSavedResponse);

    const onSavedMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <SimulatedCollectionDialog
        isOpen={true}
        onOpenChange={onOpenChangeMock}
        onSaved={onSavedMock}
      />
    );

    // Input name and cards in textarea
    const nameInput = screen.getByPlaceholderText(/Lote Wallapop/i);
    fireEvent.change(nameInput, { target: { value: "Simulación Test" } });

    const textarea = screen.getByPlaceholderText(/1 Sol Ring/);
    fireEvent.change(textarea, { target: { value: "1 Sol Ring\n1 Forest" } });

    // Click analyze button
    const analyzeButton = screen.getByRole("button", { name: /Simular y Analizar Lote/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getAllByText("24.50 €").length).toBeGreaterThanOrEqual(1);
      // Blue metric: Valor vendible
      expect(screen.getByText("Valor vendible")).toBeInTheDocument();
      expect(screen.getAllByText("5.50 €").length).toBeGreaterThanOrEqual(1);
      // Standardized card counts in boxes
      expect(screen.getAllByText("1 cartas").length).toBeGreaterThanOrEqual(1);
      // Metric: Completitud
      expect(screen.getByText("+5.25%")).toBeInTheDocument();
      // Huecos Cubiertos must NOT be present
      expect(screen.queryByText("Huecos Cubiertos")).not.toBeInTheDocument();
    });

    // Save collection
    const saveButton = screen.getByRole("button", { name: /Guardar Colección Simulada/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(actions.createSimulatedCollection).toHaveBeenCalled();
      // Closes modal and calls onSaved with the new id
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
      expect(onSavedMock).toHaveBeenCalledWith("sim-saved-1");
    });
  });
});
