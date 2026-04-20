import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  setActiveCompany: (id: string, name?: string) => void;
  setActiveWorkspace: (id: string, name?: string) => void;
  resetWorkspaceContext: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeCompanyId: null,
      activeCompanyName: null,
      activeWorkspaceId: null,
      activeWorkspaceName: null,
      setActiveCompany: (id, name) => set((state) => ({ activeCompanyId: id, activeCompanyName: name || state.activeCompanyName })),
      setActiveWorkspace: (id, name) => set((state) => ({ activeWorkspaceId: id, activeWorkspaceName: name || state.activeWorkspaceName })),
      resetWorkspaceContext: () => set({ activeCompanyId: null, activeCompanyName: null, activeWorkspaceId: null, activeWorkspaceName: null }),
    }),
    {
      name: "atlas-workspace",
    }
  )
);
