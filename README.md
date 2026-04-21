# Atlas Frontend

Frontend web application for Atlas Breakdown.

## Quick Start
1. Install dependencies:
   - `npm ci`
2. Configure env:
   - Copy `.env.example` to `.env`
   - Set API-related variables
3. Run dev server:
   - `npm run dev`

## Docker
1. Build:
   - `docker build -t atlas-frontend .`
2. Run:
   - `docker run -p 5173:5173 atlas-frontend`

## Project Structure
- `src/`: app source code
- `public/`: static assets
- `docs/`: frontend docs

## Docs
- `docs/README.md`
- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT.md`
- `docs/CODEBASE_CONTEXT.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/FUTURE_DEVELOPMENT.md`
- `docs/ARCHITECTURE.md`
