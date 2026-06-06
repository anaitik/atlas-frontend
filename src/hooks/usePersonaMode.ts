import { useAuthStore } from "../store/auth";
import { useUiPreferencesStore } from "../store/uiPreferences";

/** Single source of truth for lead vs operator/reviewer experience and technical UI. */
export function usePersonaMode() {
  const user = useAuthStore((s) => s.user);
  const {
    personaMode,
    experienceMode,
    showTechnicalDetails,
    setPersonaMode,
    setExperienceMode,
    toggleExperienceMode,
    setShowTechnicalDetails,
    toggleTechnicalDetails,
  } = useUiPreferencesStore();

  const isLead = personaMode === "lead";
  const isOperator = personaMode === "operator";
  const isReviewer = personaMode === "reviewer";
  const isStaff = isOperator || isReviewer;
  /** Full team tools nav + operator upload/review surfaces */
  const isExpert = isStaff || experienceMode === "expert";
  /** Operator upload extras (preview, confirm extraction) — staff always, owners when expert toggle on */
  const isOperatorUi = isStaff || experienceMode === "expert";
  const isSimple = !isOperatorUi && isLead;

  return {
    personaMode,
    isLead,
    isOperator,
    isReviewer,
    isStaff,
    isExpert,
    isOperatorUi,
    isSimple,
    experienceMode,
    showTechnicalDetails,
    setPersonaMode,
    setExperienceMode,
    toggleExperienceMode,
    setShowTechnicalDetails,
    toggleTechnicalDetails,
    userRole: user?.role,
  };
}
