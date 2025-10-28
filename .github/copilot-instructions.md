# AI Coding Instructions - Ransom Notes Online

## Project Overview
This is a real-time multiplayer word game where players join private lobbies and create sentences from random word pools to answer prompts. The project uses Next.js frontend, NestJS backend, and Socket.IO for real-time communication.

## Core Architecture

### State Machine
```
[LOBBY_CREATED] → [WAITING_FOR_PLAYERS] → [IN_PROGRESS] → [ROUND_ACTIVE] → [VOTING] → [ROUND_END] → [GAME_END]
                                                            ↑__________________________|
```

Each state has specific validation rules and allowed transitions:
- LOBBY_CREATED: Initial state, only host present
- WAITING_FOR_PLAYERS: 3+ players required to start
- IN_PROGRESS: Scores reset, judge assigned
- ROUND_ACTIVE: Word pools distributed, submissions open
- VOTING: All submissions locked, voting/judging phase
- ROUND_END: Update scores, check win condition
- GAME_END: First to 5 points or host ends game

### State Management
- All game state is server-authoritative in NestJS
- Lobbies are isolated, ephemeral (no persistence in MVP)
- Real-time updates use Socket.IO rooms based on lobby codes
- State transitions trigger validation and broadcasts

### Key Data Structures
```typescript
interface Lobby {
  code: string;          // 6-char alphanumeric
  state: "WAITING" | "IN_PROGRESS" | "ENDED";
  players: Player[];
  judgeIndex: number | null;
  roundNumber: number;
}

interface Player {
  id: number;
  nickname: string;
  score: number;
  status: "JOINED" | "READY" | "DISCONNECTED";
  words: string[];       // Current round's word pool
}

interface Round {
  prompt: string;
  submissions: Map<number, string[]>;  // playerID → ordered word IDs
  votes: Map<number, number>;          // voterID → submissionID
  stage: "ANSWERING" | "VOTING" | "REVEALING" | "COMPLETE";
}
```

## Critical Patterns

### Server-Side Validation
- All word submissions must be validated against player's assigned word pool
- Example validation in game logic:
```typescript
// Player can only submit words from their assigned pool
validateSubmission(playerId: number, wordIds: string[]) {
  const playerWords = this.getCurrentPlayerWords(playerId);
  return wordIds.every(id => playerWords.includes(id));
}
```

### Real-time Events
Socket events follow a consistent pattern:
1. Client emits intent
2. Server validates and updates state
3. Server broadcasts new state to entire lobby

Key Socket.IO events and payloads:
```typescript
// Creating/Joining Lobbies
socket.emit('lobby:create', { hostNickname: string });
socket.emit('lobby:join', { code: string, nickname: string });

// Game Flow
socket.emit('game:start');  // Host only
socket.emit('round:submit', { 
  wordIds: string[],     // Order matters for sentence
  roundNumber: number    // Validate current round
});

// Voting/Judging
socket.emit('round:vote', {
  submissionId: number,  // Selected answer's ID
  roundNumber: number
});

// Server Broadcasts
socket.on('lobby:update', (state: LobbyState) => {
  // Full state sync on any change
});
socket.on('round:begin', (data: {
  prompt: string,
  words: string[],  // Your word pool only
  timeLimit: number
}) => {});
```

Each event includes validation:
- Player membership in lobby
- Player's turn/role (e.g., judge)
- Current game/round state
- Data integrity (valid word IDs, etc.)

### Component Structure
Frontend follows a feature-based organization:

```
src/
├── components/
│   ├── lobby/
│   │   ├── LobbyCreation.tsx      # Create/join forms
│   │   ├── PlayerList.tsx         # Live player roster
│   │   └── WaitingRoom.tsx        # Pre-game lobby
│   ├── game/
│   │   ├── GameBoard.tsx          # Main game layout
│   │   ├── WordPool.tsx           # Draggable word tiles
│   │   ├── SubmissionArea.tsx     # Drop zone for words
│   │   └── VotingUI.tsx          # Judge/group voting
│   └── shared/
│       ├── Timer.tsx              # Round countdown
│       └── ScoreBoard.tsx         # Live scores
├── hooks/
│   ├── useSocket.ts              # Socket.IO connection
│   ├── useGameState.ts           # Shared game logic
│   └── useDragDrop.ts            # Word arrangement
└── context/
    └── GameContext.tsx           # Global game state
```

Key UI patterns:
- Game state updates trigger re-renders through Socket.IO events
- Drag-and-drop using react-dnd for word arrangement
- Tailwind/Mantine for consistent styling
- Mobile-first responsive design

## Development Workflow

### Setup
1. Frontend: Next.js app with Socket.IO client
   ```bash
   cd frontend
   npm install
   npm run dev    # Runs on http://localhost:3000
   ```

2. Backend: NestJS with Socket.IO gateway
   ```bash
   cd backend
   npm install
   npm run start:dev  # Runs on http://localhost:3001
   ```

3. No database required for MVP (in-memory state)

### Testing Strategy
```typescript
// Example game logic test
describe('LobbyService', () => {
  it('should validate word submissions', () => {
    const lobby = new Lobby('ABC123');
    const player = new Player(1, 'Alice');
    player.words = ['happy', 'day', 'friends'];
    
    expect(
      lobby.validateSubmission(player.id, ['happy', 'friends'])
    ).toBe(true);
    
    expect(
      lobby.validateSubmission(player.id, ['invalid', 'words'])
    ).toBe(false);
  });
});
```

Key test areas:
- Server-side game logic validation
- Lobby lifecycle and state transitions
- Score calculations and win conditions
- Socket event handling and broadcasts
- Edge cases (disconnects, timeouts)

## Common Pitfalls & Error Handling

### Security Validation
```typescript
// Always validate all client input server-side
class GameService {
  submitAnswer(playerId: number, wordIds: string[]) {
    // 1. Verify player is in an active game
    const player = this.getPlayer(playerId);
    if (!player || player.gameState !== 'ACTIVE') {
      throw new GameError('Player not in active game');
    }

    // 2. Verify submission timing
    if (!this.isSubmissionPhase(player.gameId)) {
      throw new GameError('Not in submission phase');
    }

    // 3. Validate words against player's pool
    if (!this.validateWords(playerId, wordIds)) {
      throw new GameError('Invalid word submission');
    }
  }
}
```

### Connection Management
```typescript
@WebSocketGateway()
class GameGateway {
  handleDisconnect(client: Socket) {
    const player = this.players.get(client.id);
    if (player) {
      // Mark disconnected but allow reconnect window
      player.status = 'DISCONNECTED';
      player.reconnectTimeout = setTimeout(() => {
        this.removePlayer(player.id);
      }, RECONNECT_WINDOW_MS);
    }
  }
}
```

### State Guards
- All state transitions must pass validation
- Lock submissions after round timer expires
- Prevent double-voting or self-voting
- Maintain unique nicknames per lobby

## TODOs & Future Scope
- [ ] **Redis Integration**
  ```typescript
  // Example future persistence layer
  class GameRepository {
    async saveLobbyState(lobbyId: string, state: LobbyState) {
      await this.redis.hset(`lobby:${lobbyId}`, state);
      await this.redis.expire(`lobby:${lobbyId}`, LOBBY_TTL);
    }
  }
  ```
- [ ] User accounts and game history
- [ ] Public lobby system with matchmaking
- [ ] Custom word deck support with content moderation