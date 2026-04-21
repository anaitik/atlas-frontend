# Frontend Deployment

## Local run
1. Install dependencies:
   - `npm ci`
2. Configure environment:
   - Copy `.env.example` to `.env` and adjust API settings.
3. Start app:
   - `npm run dev`

## Docker run
1. Build image:
   - `docker build -t atlas-frontend .`
2. Start container:
   - `docker run -p 5173:5173 atlas-frontend`

## Notes
- Current Dockerfile runs the Vite dev server.
- For production static hosting, use `npm run build` and serve `dist/` through a static web server.
