"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/api-client";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_EMAIL = "planeswalker@magic.io";

export interface UserSessionState {
  id: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
}

/**
 * Returns current authenticated user ID from session cookie or FastAPI backend.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mtg_user_id")?.value;
    if (userId) {
      return userId;
    }
  } catch (error) {
    console.warn("Could not retrieve user ID from cookie:", error);
  }

  return process.env.DEV_USER_ID || DEMO_USER_ID;
}

/**
 * Returns user details and authentication status.
 */
export async function getCurrentUser(): Promise<UserSessionState> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("mtg_token")?.value;
    const userId = cookieStore.get("mtg_user_id")?.value;
    const email = cookieStore.get("mtg_user_email")?.value;

    if (token && userId) {
      return {
        id: userId,
        email: email || "",
        name: email ? email.split("@")[0] : "Planeswalker",
        isAuthenticated: true,
      };
    }

    if (token) {
      const me = await backendFetch<UserSessionState>("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (me?.isAuthenticated) {
        return me;
      }
    }
  } catch (error) {
    console.warn("Could not retrieve user session:", error);
  }

  return {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    name: "Invitado",
    isAuthenticated: false,
  };
}

/**
 * Logs in with Email and Password using the FastAPI Backend.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error?: string }> {
  if (!email || !password) {
    return { error: "Debes ingresar tu correo y contraseña." };
  }

  try {
    const res = await backendFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.error) {
      return { error: res.error };
    }

    const cookieStore = await cookies();
    if (res.accessToken) {
      cookieStore.set("mtg_token", res.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    if (res.refreshToken) {
      cookieStore.set("mtg_refresh_token", res.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    if (res.user?.id) {
      cookieStore.set("mtg_user_id", res.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.set("mtg_user_email", res.user.email || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    revalidatePath("/", "layout");
    return {};
  } catch (err: any) {
    return { error: err?.message || "Error al iniciar sesión." };
  }
}

/**
 * Registers a new user with Email and Password via FastAPI Backend.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ error?: string; needsConfirmation?: boolean }> {
  if (!email || !password) {
    return { error: "Debes ingresar tu correo y contraseña." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const res = await backendFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.error) {
      return { error: res.error };
    }

    if (res.needsConfirmation) {
      return { needsConfirmation: true };
    }

    if (res.accessToken) {
      const cookieStore = await cookies();
      cookieStore.set("mtg_token", res.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      if (res.user?.id) {
        cookieStore.set("mtg_user_id", res.user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    }

    revalidatePath("/", "layout");
    return {};
  } catch (err: any) {
    return { error: err?.message || "Error inesperado al registrar usuario." };
  }
}

/**
 * Signs out the current user via FastAPI Backend and deletes cookies.
 */
export async function signOutUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("mtg_token")?.value;
    if (token) {
      await backendFetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    cookieStore.delete("mtg_token");
    cookieStore.delete("mtg_refresh_token");
    cookieStore.delete("mtg_user_id");
    cookieStore.delete("mtg_user_email");
  } catch (error) {
    console.warn("Error signing out:", error);
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
