# Shock Shop Frontend

React + Vite storefront for the FastAPI shop backend.

## Run

```bash
npm install
npm run dev
```

Frontend runs on `http://127.0.0.1:5173` by default.

Backend should be running on `http://127.0.0.1:8000`.

## Env

Copy `.env.example` to `.env` if you want to override the API base URL:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Notes

- Products and categories are loaded from the FastAPI API.
- Cart state is stored in browser `localStorage`.
- Current UI does not depend on backend cart routes because those routes are still unstable.
