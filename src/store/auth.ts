import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserOut } from "../types/api-overrides";

interface AuthState {
  token: string | null;
  user: UserOut | null;
  setAuth: (token: string, user: UserOut) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

// UserOut comes from our backend definition matching the schema.
// A mock type here to avoid circular/missing imports if api-overrides isn't updated
export type { UserOut } from "../types/api-overrides";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: "atlas-auth", // unique name inside localStorage
    }
  )
);
