import { create } from "zustand";
import { MOCK_USER, type MockUser } from "@/lib/mocks/user";

interface AuthStore {
  user: MockUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isSignedIn: false,
  isLoaded: true,
  signIn:  () => set({ user: MOCK_USER, isSignedIn: true }),
  signOut: () => set({ user: null,      isSignedIn: false }),
}));
