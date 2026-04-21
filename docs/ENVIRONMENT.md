# Frontend Environment Variables

Frontend variables are loaded from `.env` and exposed only when prefixed with `VITE_`.

## Variables
- `VITE_API_V1_PREFIX`: API prefix path (default: `/api/v1`)
- `VITE_API_BASE_URL`: backend base URL (optional)
- `VITE_API_URL`: full API URL override (optional)
- `VITE_PROXY_TARGET`: Vite dev proxy target (optional)

## Example
- Local backend: `http://localhost:8000`
- Local frontend: `http://localhost:5173`
