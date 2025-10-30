# Ransom Notes Online

Real-time multiplayer word game where players build sentences from random words to answer prompts. This monorepo contains a Next.js frontend, a NestJS backend, and shared TypeScript types.

Folders:
- `frontend` — Next.js 14 (App Router) client with Socket.IO
- `backend` — NestJS 11 server with Socket.IO gateway and in-memory game logic
- `shared` — shared TypeScript types and interfaces used by both

## Quickstart

Prereqs:
- Node.js 18+ (tested with Node 22)

1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

2) Configure environment

- `frontend/.env.local` (create from example if needed):

```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_DEBUG_SOCKET=false
```

- `backend/.env` (create from example if needed):

```
FRONTEND_ORIGIN=http://localhost:3000
```

3) Run in two terminals

Terminal A (backend):

```bash
cd backend
npm run dev
```

Terminal B (frontend):

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 and create/join a lobby. The server runs on http://localhost:3001.

## Scripts

Backend:
- `npm run dev` — start NestJS in watch mode
- `npm test` — run unit tests
- `npm run build` — compile to `dist/`

Frontend:
- `npm run dev` — start Next.js dev server
- `npm run build` — production build (ESLint is ignored during build)
- `npm run start` — start production server

## Testing

Run the backend test suite:

```bash
cd backend
npm test
```

## Configuration & Notes

- CORS: The backend reads allowed origins from `FRONTEND_ORIGIN` (comma-separated supported). Defaults to `http://localhost:3000`.
- Socket transport: The client uses WebSocket-only transport to avoid dev CORS issues.
- State: All game state is server-authoritative and kept in-memory (no DB).

## Troubleshooting

- If you see CORS or polling errors, verify `FRONTEND_ORIGIN` and `NEXT_PUBLIC_SOCKET_URL` values.
- If the frontend build fails on lint, note that production builds ignore ESLint; fix lint locally during dev.
- If sockets don’t reconnect, watch for the yellow reconnect banner in the app and check the backend console.
