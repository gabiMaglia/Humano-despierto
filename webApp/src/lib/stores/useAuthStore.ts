import { create } from "zustand";

export type AppRole = "student" | "teacher" | "admin";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  glyph: string | null;
  role: AppRole;
}

interface AuthStore {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  setUser: (user: AuthUser | null) => void;
}

/**
 * Espejo cliente del estado de sesión real (Supabase). Lo puebla
 * `AuthProvider` vía `onAuthStateChange` — nunca inventa un usuario.
 * NO es la fuente de autoridad de permisos (eso es `profiles.role` en el
 * servidor, ADR-006): esto es solo para pintar la UI (Nav, isSignedIn).
 */
export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  setUser: (user) => set({ user, isSignedIn: user !== null, isLoaded: true }),
}));
