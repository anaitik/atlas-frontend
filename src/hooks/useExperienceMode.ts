import { usePersonaMode } from "./usePersonaMode";

/** @deprecated Prefer usePersonaMode for workspace pages. */
export function useExperienceMode() {
  const {
    isSimple,
    isOperatorUi,
    experienceMode,
    setExperienceMode,
    toggleExperienceMode,
    userRole,
  } = usePersonaMode();

  return {
    isSimple,
    isExpert: isOperatorUi,
    experienceMode,
    setExperienceMode,
    toggleExperienceMode,
    userRole,
  };
}
