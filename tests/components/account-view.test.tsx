import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AccountView } from "@/components/account-view";
import { UserSessionState } from "@/actions/auth";

vi.mock("@/actions/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/actions/auth")>();
  return {
    ...actual,
    signOutUser: vi.fn(),
  };
});

describe("AccountView Component (Swift Parity)", () => {
  it("should render authenticated user profile and details", () => {
    const user: UserSessionState = {
      id: "usr-123456",
      email: "planeswalker@magic.io",
      name: "Planeswalker",
      isAuthenticated: true,
      mode: "authenticated",
    };

    render(<AccountView user={user} />);

    // Header avatar and name
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("Planeswalker")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Cuenta autenticada")).toBeInTheDocument();

    // Technical data section matching Swift Section("Datos")
    expect(screen.getByText("Backend (localhost:8000)")).toBeInTheDocument();
    expect(screen.getByText("planeswalker@magic.io")).toBeInTheDocument();
    expect(screen.getByText("usr-123456")).toBeInTheDocument();
    expect(
      screen.getByText(/Mazos, colección y completitud se sincronizan con el backend/i)
    ).toBeInTheDocument();
  });

  it("should render demo / guest user profile correctly", () => {
    const guestUser: UserSessionState = {
      id: "00000000-0000-0000-0000-000000000000",
      email: "demo@magic.io",
      name: "Jugador Demo",
      isAuthenticated: true,
      mode: "demo",
    };

    render(<AccountView user={guestUser} />);

    expect(screen.getByText("J")).toBeInTheDocument();
    expect(screen.getByText("Jugador Demo")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getAllByText("Invitado / demo").length).toBeGreaterThanOrEqual(1);
  });

  it("should show sign out confirmation dialog when clicking Cerrar sesión", () => {
    const user: UserSessionState = {
      id: "usr-123456",
      email: "test@magic.io",
      name: "Test User",
      isAuthenticated: true,
      mode: "authenticated",
    };

    render(<AccountView user={user} />);

    const signOutBtn = screen.getByRole("button", { name: /Cerrar sesión/i });
    fireEvent.click(signOutBtn);

    expect(screen.getByText("¿Cerrar sesión?")).toBeInTheDocument();
    expect(screen.getByText("Volverás a la pantalla de inicio de sesión.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("should display signed out state when user is not authenticated", () => {
    const unauthenticatedUser: UserSessionState = {
      id: "anonymous",
      email: "",
      name: "",
      isAuthenticated: false,
    };

    render(<AccountView user={unauthenticatedUser} />);

    expect(screen.getByText("No has iniciado sesión")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a Iniciar Sesión/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });
});
