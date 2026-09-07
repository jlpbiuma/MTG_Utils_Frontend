import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthForm } from "@/components/auth-form";
import * as authActions from "@/actions/auth";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("@/actions/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/actions/auth")>();
  return {
    ...actual,
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInAsGuest: vi.fn().mockResolvedValue({}),
  };
});

describe("AuthForm Guest Login (Swift Parity)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render Entrar como invitado (demo) button", () => {
    render(<AuthForm />);

    const guestButton = screen.getByRole("button", {
      name: /Entrar como invitado \(demo\)/i,
    });
    expect(guestButton).toBeInTheDocument();
  });

  it("should call signInAsGuest and navigate to /decks on click", async () => {
    render(<AuthForm />);

    const guestButton = screen.getByRole("button", {
      name: /Entrar como invitado \(demo\)/i,
    });
    fireEvent.click(guestButton);

    await waitFor(() => {
      expect(authActions.signInAsGuest).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/decks");
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("should display error message if signInAsGuest fails", async () => {
    vi.mocked(authActions.signInAsGuest).mockResolvedValueOnce({
      error: "Error del servidor al acceder como invitado",
    });

    render(<AuthForm />);

    const guestButton = screen.getByRole("button", {
      name: /Entrar como invitado \(demo\)/i,
    });
    fireEvent.click(guestButton);

    await waitFor(() => {
      expect(
        screen.getByText("Error del servidor al acceder como invitado")
      ).toBeInTheDocument();
    });
  });
});
