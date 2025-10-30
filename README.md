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
# Voting mode: 'group' (everyone votes) or 'judge' (rotating judge picks)
VOTE_MODE=group
WIN_THRESHOLD=5
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

Alternatively, from the repo root you can run both with one command (after installing root deps):

```bash
npm install
npm run dev
```

### One-command launcher with custom ports/host

You can start both frontend and backend with a single CLI that lets you choose ports and binding:

```bash
# From repo root
./app --fport 3000 --bport 3001 --local yes
```

Options:
- --fport <port>  Frontend port (Next.js dev), default 3000
- --bport <port>  Backend port (NestJS dev), default 3001
- --local yes|no  yes binds to localhost only; no binds to 0.0.0.0 (all interfaces)

Notes:
- In local=yes, the frontend will talk to the backend at http://localhost:<bport> and CORS will allow http://localhost:<fport>.
- In local=no, the backend allows any origin in dev (CORS "*"); the frontend auto-targets the backend at your current hostname and the provided backend port.
- If your shell doesn’t allow executing ./app directly, you can run the same via:

```bash
npm run app -- --fport 3000 --bport 3001 --local no
```

Stopping the one-command launcher
---------------------------------

The included one-command launcher (`./bin/app.mjs`, run via `./app`) starts both the Next.js frontend and the NestJS backend in development mode and shows their output in a single TUI. The launcher registers signal handlers so pressing Ctrl+C (SIGINT) will now cleanly shut down both dev servers and any child processes they spawned on Linux/macOS.

Quick verify after Ctrl+C

1. Start the launcher:

```bash
./app --fport 3000 --bport 3001 --local yes
```

2. Press Ctrl+C to stop the launcher. Both servers should terminate.

3. Confirm no processes are still listening on the dev ports (Linux example):

```bash
ss -ltnp | grep -E ':3000|:3001' || echo 'no listener on 3000/3001'
```

Or check for lingering Node processes:

```bash
ps aux | grep -E 'node|next|nest' | grep -v grep || echo 'no node/next/nest processes found'
```

Platform notes
--------------
- The launcher uses Unix process groups to reliably terminate child process trees (sends SIGTERM to the child's process group). This works on Linux and macOS. On Windows the process-group kill is not supported; if you target Windows we can add a cross-platform tree-kill approach (e.g., using the `tree-kill` npm package).
- If you previously had the dev servers left running (from before this fix), you can stop them manually by killing the processes or using the verification commands above and then `kill <pid>`.

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

### Debugging sockets
- To enable verbose socket logs in the browser without rebuilding, run in dev tools:
	`localStorage.setItem('debugSocket','true'); location.reload();`
- To disable: `localStorage.removeItem('debugSocket'); location.reload();`

### Ending a game early (host only)
- The host can end a game during the lobby (pre-start) via the End Game button.

### Voting modes
- Group mode (default): Everyone votes during VOTING; most votes wins (random tie-break).
- Judge mode: The rotating judge cannot submit or vote; after reveal, only the judge sees a pick UI and selects the winner.

To enable judge mode:
- Backend: set `VOTE_MODE=judge` in `backend/.env`.
- Frontend: set `NEXT_PUBLIC_VOTE_MODE=judge` in `frontend/.env.local` so the UI shows the judge picker and disables group voting.

## Troubleshooting

- If you see CORS or polling errors, verify `FRONTEND_ORIGIN` and `NEXT_PUBLIC_SOCKET_URL` values.
- If the frontend build fails on lint, note that production builds ignore ESLint; fix lint locally during dev.
- If sockets don’t reconnect, watch for the yellow reconnect banner in the app and check the backend console.
