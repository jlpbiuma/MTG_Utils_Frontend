import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EdhrecRecommendationsView } from "@/components/edhrec-recommendations-view";
import * as deckActions from "@/actions/decks";
import { CommanderRecommendationsListResponse } from "@/lib/schemas";

vi.mock("@/actions/decks", () => ({
  getEdhrecCommanderRecommendations: vi.fn(),
  createDeck: vi.fn().mockResolvedValue({ id: "new-deck-1" }),
}));

vi.mock("@/components/card-image", () => ({
  CardImage: ({ src, alt, className }: { src?: string; alt?: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("@/components/create-deck-dialog", () => ({
  CreateDeckDialog: ({
    initialCommander,
    trigger,
  }: {
    initialCommander?: string;
    trigger?: React.ReactNode;
  }) => (
    <div data-testid="create-deck-dialog-wrapper">
      <span data-testid="initial-commander" data-commander={initialCommander} />
      {trigger}
    </div>
  ),
}));

describe("EdhrecRecommendationsView", () => {
  const mockResponse: CommanderRecommendationsListResponse = {
    total: 2,
    page: 1,
    pageSize: 24,
    totalPages: 1,
    commanders: [
      {
        id: "cmd-1",
        name: "Atraxa, Praetors' Voice",
        normalizedName: "atraxa, praetors' voice",
        slug: "atraxa-praetors-voice",
        colorIdentity: ["W", "U", "B", "G"],
        imageUri: "https://example.com/atraxa.jpg",
        isTop100: true,
        edhrecRank: 1,
        numDecks: 24000,
        userOwnsCommander: true,
        ownedValue: 123.45,
        missingValue: 67.89,
        highSynergyCoverage: { owned: 3, total: 10, percentage: 30 },
        topCardsCoverage: { owned: 4, total: 8, percentage: 50 },
        totalRequiredCards: 99,
        ownedCardsCount: 72,
        completionPercentage: 73,
        typeBreakdown: {
          creatures: 28,
          instants: 8,
          sorceries: 7,
          artifacts: 10,
          enchantments: 12,
          battle: 0,
          planeswalkers: 5,
          lands: 29,
          nonbasicLands: 25,
          basicLands: 4,
        },
        typeOwnership: {
          creaturesOwned: 22,
          creaturesTotal: 28,
          instantsOwned: 6,
          instantsTotal: 8,
          sorceriesOwned: 5,
          sorceriesTotal: 7,
          artifactsOwned: 8,
          artifactsTotal: 10,
          enchantmentsOwned: 9,
          enchantmentsTotal: 12,
          planeswalkersOwned: 2,
          planeswalkersTotal: 5,
          nonbasicLandsOwned: 20,
          nonbasicLandsTotal: 25,
        },
      },
      {
        id: "cmd-2",
        name: "The Ur-Dragon",
        normalizedName: "the ur-dragon",
        slug: "the-ur-dragon",
        colorIdentity: ["W", "U", "B", "R", "G"],
        imageUri: null,
        isTop100: true,
        edhrecRank: 3,
        numDecks: 21000,
        userOwnsCommander: false,
        totalRequiredCards: 99,
        ownedCardsCount: 45,
        completionPercentage: 45,
        typeBreakdown: {
          creatures: 35,
          instants: 5,
          sorceries: 8,
          artifacts: 12,
          enchantments: 4,
          battle: 0,
          planeswalkers: 1,
          lands: 34,
          nonbasicLands: 30,
          basicLands: 4,
        },
        typeOwnership: {
          creaturesOwned: 18,
          creaturesTotal: 35,
          instantsOwned: 3,
          instantsTotal: 5,
          sorceriesOwned: 4,
          sorceriesTotal: 8,
          artifactsOwned: 5,
          artifactsTotal: 12,
          enchantmentsOwned: 2,
          enchantmentsTotal: 4,
          planeswalkersOwned: 0,
          planeswalkersTotal: 1,
          nonbasicLandsOwned: 13,
          nonbasicLandsTotal: 30,
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially and then display commander cards", async () => {
    vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    // Initially displays loader
    expect(screen.getByText(/Analizando recomendaciones de EDHREC/i)).toBeInTheDocument();

    // After loading completes
    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
      expect(screen.getByText("The Ur-Dragon")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("link", { name: "Ver mazo y cartas" })[0])
      .toHaveAttribute("href", "/decks/recommendations/atraxa-praetors-voice");

    expect(screen.getByText("123.45 €")).toBeInTheDocument();
    expect(screen.getByText("67.89 €")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/3\/10 en colección/)).toBeInTheDocument();

    // Verify completion percentages
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();

    // Verify owned counts
    expect(screen.getByText("72 / 99 cartas en posesión")).toBeInTheDocument();
    expect(screen.getByText("45 / 99 cartas en posesión")).toBeInTheDocument();

    // Verify Top 100 badges
    expect(screen.getByText("Top 100 EDHREC #1")).toBeInTheDocument();
    expect(screen.getByText("Top 100 EDHREC #3")).toBeInTheDocument();

    // Verify ownership badge
    expect(screen.getByText("En tu colección")).toBeInTheDocument();
  });

  it("should display card type quotas breakdown for commanders", async () => {
    vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    // Check creature quota display (22/28)
    expect(screen.getByText("22/28")).toBeInTheDocument();
    // Check instant quota display (6/8)
    expect(screen.getByText("6/8")).toBeInTheDocument();
    // Check nonbasic lands quota display (20/25)
    expect(screen.getByText("20/25")).toBeInTheDocument();
  });

  it("should filter by search text when submitting search form", async () => {
    const getRecsSpy = vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar comandante por nombre/i);
    fireEvent.change(searchInput, { target: { value: "Atraxa" } });
    fireEvent.submit(searchInput.closest("form")!);

    await waitFor(() => {
      expect(getRecsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "Atraxa",
          page: 1,
        })
      );
    });
  });

  it("should filter by Top 100 only toggle", async () => {
    const getRecsSpy = vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    const top100Btn = screen.getByRole("button", { name: /Solo Top 100 EDHREC/i });
    fireEvent.click(top100Btn);

    await waitFor(() => {
      expect(getRecsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          top100Only: true,
        })
      );
    });
  });

  it("should filter by owned commander only toggle", async () => {
    const getRecsSpy = vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    const ownedBtn = screen.getByRole("button", { name: /En mi colección/i });
    fireEvent.click(ownedBtn);

    await waitFor(() => {
      expect(getRecsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownedCommanderOnly: true,
        })
      );
    });
  });

  it("should filter by mana color pips", async () => {
    const getRecsSpy = vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    // Click blue pip 'U'
    const bluePip = screen.getByRole("button", { name: "U" });
    fireEvent.click(bluePip);

    await waitFor(() => {
      expect(getRecsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: "U",
        })
      );
    });
  });

  it("should change sort mode between completion, rank and name", async () => {
    const getRecsSpy = vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    const popularityBtn = screen.getByRole("button", { name: "Popularidad" });
    fireEvent.click(popularityBtn);

    await waitFor(() => {
      expect(getRecsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "rank",
        })
      );
    });
  });

  it("should show empty state when no commanders are returned", async () => {
    vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 24,
      totalPages: 1,
      commanders: [],
    });

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("No se encontraron comandantes")).toBeInTheDocument();
    });
  });

  it("should render create deck button for each commander with initial name and commander prefilled", async () => {
    vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(mockResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", { name: /Crear mazo con este comandante/i });
    expect(createButtons.length).toBe(2);

    const initialCommanders = screen.getAllByTestId("initial-commander");
    expect(initialCommanders[0]).toHaveAttribute("data-commander", "Atraxa, Praetors' Voice");
    expect(initialCommanders[1]).toHaveAttribute("data-commander", "The Ur-Dragon");
  });

  it("should handle pagination next and previous buttons", async () => {
    const multiPageResponse: CommanderRecommendationsListResponse = {
      ...mockResponse,
      page: 1,
      totalPages: 3,
      total: 72,
    };

    const getRecsSpy = vi.mocked(deckActions.getEdhrecCommanderRecommendations).mockResolvedValue(multiPageResponse);

    render(<EdhrecRecommendationsView />);

    await waitFor(() => {
      expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(getRecsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});
