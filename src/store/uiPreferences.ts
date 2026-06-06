import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ExperienceMode = "simple" | "expert";
export type PersonaMode = "lead" | "operator" | "reviewer";

interface UiPreferencesState {
  experienceMode: ExperienceMode;
  personaMode: PersonaMode;
  helpPanelOpen: boolean;
  showTechnicalDetails: boolean;
  onboardingDismissed: Record<string, boolean>;
  setExperienceMode: (mode: ExperienceMode) => void;
  setPersonaMode: (mode: PersonaMode) => void;
  toggleExperienceMode: () => void;
  setShowTechnicalDetails: (show: boolean) => void;
  toggleTechnicalDetails: () => void;
  setHelpPanelOpen: (open: boolean) => void;
  dismissOnboarding: (companyId: string) => void;
  isOnboardingDismissed: (companyId: string) => boolean;
}

export function defaultExperienceModeForRole(role?: string | null): ExperienceMode {
  if (role === "company_owner" || role === "report_viewer") return "simple";
  if (role === "system_admin" || role === "data_reviewer" || role === "sustainability_manager") return "expert";
  return "simple";
}

export function defaultPersonaForRole(role?: string | null): PersonaMode {
  if (role === "company_owner" || role === "report_viewer") return "lead";
  if (role === "data_reviewer") return "reviewer";
  if (role === "sustainability_manager" || role === "system_admin") return "operator";
  return "lead";
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set, get) => ({
      experienceMode: "simple",
      personaMode: "lead",
      helpPanelOpen: false,
      showTechnicalDetails: false,
      onboardingDismissed: {},
      setExperienceMode: (mode) => set({ experienceMode: mode }),
      setPersonaMode: (mode) => set({ personaMode: mode }),
      toggleExperienceMode: () =>
        set((s) => ({ experienceMode: s.experienceMode === "simple" ? "expert" : "simple" })),
      setShowTechnicalDetails: (show) => set({ showTechnicalDetails: show }),
      toggleTechnicalDetails: () => set((s) => ({ showTechnicalDetails: !s.showTechnicalDetails })),
      setHelpPanelOpen: (open) => set({ helpPanelOpen: open }),
      dismissOnboarding: (companyId) =>
        set((s) => ({
          onboardingDismissed: { ...s.onboardingDismissed, [companyId]: true },
        })),
      isOnboardingDismissed: (companyId) => !!get().onboardingDismissed[companyId],
    }),
    { name: "atlas-ui-preferences" }
  )
);
