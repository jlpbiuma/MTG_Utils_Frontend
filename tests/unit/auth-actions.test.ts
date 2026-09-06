import { describe, it, expect, vi, beforeEach } from "vitest";
import { signInWithEmail, signUpWithEmail, signOutUser, getCurrentUser } from "@/actions/auth";
import * as apiClient from "@/lib/api-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

vi.mock("@/lib/api-client", () => ({
  backendFetch: vi.fn(),
}));

describe("FastAPI Auth Actions", () => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  });

  describe("signInWithEmail", () => {
    it("returns validation error if email or password is empty", async () => {
      const res = await signInWithEmail("", "");
      expect(res.error).toBeDefined();
      expect(res.error).toContain("Debes ingresar tu correo y contraseña");
    });

    it("successfully logs in and sets auth cookies", async () => {
      vi.mocked(apiClient.backendFetch).mockResolvedValueOnce({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        user: { id: "user-123", email: "jace@magic.io", name: "jace" },
      });

      const res = await signInWithEmail("jace@magic.io", "moxpearl123");
      expect(res.error).toBeUndefined();
      expect(apiClient.backendFetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "jace@magic.io", password: "moxpearl123" }),
      });
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "mtg_token",
        "test-access-token",
        expect.objectContaining({ httpOnly: true })
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "mtg_user_id",
        "user-123",
        expect.objectContaining({ httpOnly: true })
      );
    });

    it("returns backend error when credentials are invalid", async () => {
      vi.mocked(apiClient.backendFetch).mockRejectedValueOnce(
        new Error("Invalid login credentials")
      );

      const res = await signInWithEmail("wrong@magic.io", "badpassword");
      expect(res.error).toBe("Invalid login credentials");
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe("signUpWithEmail", () => {
    it("validates password length >= 6", async () => {
      const res = await signUpWithEmail("test@test.com", "123");
      expect(res.error).toContain("al menos 6 caracteres");
    });

    it("registers user and stores token on immediate activation", async () => {
      vi.mocked(apiClient.backendFetch).mockResolvedValueOnce({
        accessToken: "registered-token",
        user: { id: "new-user-456", email: "chandra@magic.io" },
      });

      const res = await signUpWithEmail("chandra@magic.io", "pyromancer");
      expect(res.error).toBeUndefined();
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "mtg_token",
        "registered-token",
        expect.any(Object)
      );
    });

    it("handles needsConfirmation when confirmation email is sent", async () => {
      vi.mocked(apiClient.backendFetch).mockResolvedValueOnce({
        needsConfirmation: true,
      });

      const res = await signUpWithEmail("unconfirmed@magic.io", "password123");
      expect(res.needsConfirmation).toBe(true);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe("signOutUser", () => {
    it("calls backend logout and clears auth cookies", async () => {
      mockCookieStore.get.mockReturnValueOnce({ value: "active-token" });
      vi.mocked(apiClient.backendFetch).mockResolvedValueOnce({ success: true });

      await signOutUser();

      expect(apiClient.backendFetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer active-token" },
      });
      expect(mockCookieStore.delete).toHaveBeenCalledWith("mtg_token");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("mtg_refresh_token");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("mtg_user_id");
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("getCurrentUser", () => {
    it("returns user details when cookies are present", async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "mtg_token") return { value: "valid-token" };
        if (name === "mtg_user_id") return { value: "user-999" };
        if (name === "mtg_user_email") return { value: "liliana@magic.io" };
        return undefined;
      });

      const user = await getCurrentUser();
      expect(user.isAuthenticated).toBe(true);
      expect(user.id).toBe("user-999");
      expect(user.email).toBe("liliana@magic.io");
      expect(user.name).toBe("liliana");
    });

    it("falls back to guest when cookies are absent", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const user = await getCurrentUser();
      expect(user.isAuthenticated).toBe(false);
      expect(user.name).toBe("Invitado");
    });
  });
});
