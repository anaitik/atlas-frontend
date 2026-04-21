# Frontend Codebase Context

## Role in system
The frontend provides user-facing workflow surfaces and consumes backend APIs for ESG operations.

## Important areas
- `src/pages/`: route-level user experiences.
- `src/components/`: reusable UI and workflow components.
- `src/store/`: client state management.
- `src/lib/`: API and utility helpers.

## Contribution guidance
- Keep UI behavior aligned to backend contracts.
- Centralize API-client updates to avoid drift.
- Maintain consistent error/loading/empty-state UX for workflow pages.
