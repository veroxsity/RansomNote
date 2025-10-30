# Quick Start Guide - Ransom Notes Online

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Installation & Running

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
The backend will start on **http://localhost:3001**

### Frontend Setup
```bash
cd frontend
npm install  # Note: Mantine dependencies were removed (unused, caused conflicts)
npm run dev
```
The frontend will start on **http://localhost:3000**

**Note:** The original package.json had conflicting Mantine versions. Since the app uses Tailwind CSS for styling (not Mantine), those dependencies were removed along with unused drag-and-drop libraries.

## Environment Variables

### Backend (optional)
Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
```

### Frontend (optional)
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Testing the Game

1. **Open two browser windows** (or use incognito mode)
2. **Window 1:** Create a lobby
   - Enter a nickname
   - Click "Create Game"
   - Note the lobby code shown
3. **Window 2:** Join the lobby
   - Click "Join Instead"
   - Enter a nickname (different from Window 1)
   - Enter the lobby code
   - Click "Join Game"
4. **Add a third player** (minimum required)
   - Open another window/tab
   - Join with the same lobby code
5. **All players:** Click "Ready Up"
6. **Host (Window 1):** Click "Start Game"
7. **Play the game:**
   - Read the prompt
   - Select words from your pool
   - Submit your answer
   - Vote on other players' submissions
   - First to 5 points wins!

## Troubleshooting

### Socket connection fails
- Ensure backend is running on port 3001
- Check console for CORS errors
- Verify `NEXT_PUBLIC_SOCKET_URL` matches backend URL

### TypeScript errors during development
- Run `npm install` to ensure all dependencies are installed
- The lint errors shown are expected until dependencies are installed

### Game doesn't start
- Need at least 3 players in lobby
- All players must click "Ready Up"
- Only the host (first player) can start the game

### Words don't appear
- Check browser console for errors
- Verify `backend/data/words.json` exists
- Restart backend if hot-reload failed

## Project Structure

```
RansomNote/
├── backend/          # NestJS server
│   ├── src/
│   │   ├── game/     # Game logic & Socket.IO gateway
│   │   └── shared/   # Type definitions
│   └── data/         # Word pools & prompts
├── frontend/         # Next.js client
│   └── app/
│       ├── components/  # React components
│       ├── contexts/    # Socket context
│       └── hooks/       # Custom hooks
└── shared/           # Shared types between frontend/backend
```

## Next Steps

- Review `FIXES_APPLIED.md` for detailed changes
- Run the test suite: `npm test` (in backend)
- Customize word pools in `backend/data/words.json`
- Add more prompts to make the game more fun!

## Production Deployment

Before deploying:
1. Update CORS origins in `backend/src/main.ts` and `backend/src/game/game.gateway.ts`
2. Set production environment variables
3. Build frontend: `npm run build` in frontend/
4. Build backend: `npm run build` in backend/
5. Use a process manager like PM2 for the backend
6. Deploy frontend to Vercel/Netlify or similar
7. Consider adding Redis for lobby persistence (see TODOs in copilot-instructions.md)

Enjoy the game! 🎮
