# MVP Scope

## Players Can:
- Create a new game lobby and share its code.
- Join a lobby by code, choose nickname.
- See all lobby members (unique usernames enforced).
- Host triggers game start.
- **Game Flow:**
    - Server reveals a prompt, assigns N unique words to each player.
    - Players construct a sentence from ONLY their assigned words, in any order.
    - Submissions hidden until all submit or timer ends.
- All answers revealed together.
- Voting/Judging:
    - Either one player judges (rotates each round) or group voting (majority vote).
    - Winner scores a point. Scores shown.
- Rounds repeat with new prompt/words.
- First to 5 points wins. Everyone sees winner screen.
- Option to restart with same players or exit.

## Specific Game State/Logic
- Lobbies are isolated (state not shared).
- All major state changes = server broadcasts full state to everyone.
- Disconnected/left players are auto-removed from round.
- Server-side: only allows sentence built from player’s word IDs (no cheating/typos/copying).
- Server rotates judge fairly; tracks scores.
- Lobby auto-expires after X mins inactivity.

## NOT Included in MVP
- Persistent accounts/login
- Game stats/history
- Power-ups, animations
- Open/public lobbies; all by invite code only
- Deck editing or custom cards (future scope)
