# Ransom Notes Online

This repository contains the Ransom Notes Online project: a real-time multiplayer word game. The repository is organized as a small monorepo for frontend, backend, and shared types.

Folders:
- `frontend` — Next.js (App Router) frontend
- `backend` — NestJS backend (to be initialized)
- `shared` — shared TypeScript types and interfaces

Getting started (frontend):

1. Open a terminal in `frontend` and install dependencies:

```powershell
cd frontend
npm install
```

2. Run the dev server:

```powershell
npm run dev
```

Next steps:
- Initialize the NestJS backend under `backend`.
- Wire Socket.IO between frontend and backend.
- Implement game logic and UI components.
