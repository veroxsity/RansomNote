# Game Logic: Ransom Notes Online

## Game Entities

- **Lobby**
    - Unique code (eg. 6-char alphanumeric, uppercase).
    - Host (first player to create).
    - Players: list of {id, nickname, score, status, socketID}.
    - State: Waiting, In-Progress, Ended.
    - Current round: Holds round-specific state (see below).
    - Judge index: tracks rotating judge (if judging mode, else null).
    - Round number, game history.
    - Config/timers (optional: per-lobby overrides).

- **Player**
    - ID (unique within lobby, ephemeral).
    - Nickname (unique within lobby).
    - Status: Joined, Ready, Disconnected.
    - Score: integer.
    - Current words: array of word objects for the round.

- **Round**
    - Prompt: Single question/statement for this round.
    - Word pools: For each player, an array of N random words, assigned at round start.
    - Submissions: Map of playerID → array of word IDs (order = sentence).
    - Votes: Map of voterID → submissionID (if group voting).
    - Judge: playerID (if applicable).
    - Stage: Waiting for answers, Waiting for votes, Revealing, Complete.
    - Timer/expiry if time-limited.

## Lifecycle (State Machine)

1. **Lobby Created**
    - Host receives code, others join with code.
    - Players choose nicknames (server enforces uniqueness).
    - Lobby state: Waiting.
    - When 3+ players ready, host (or all) can click Start.

2. **Game Start**
    - Game moves to In-Progress.
    - Score reset (all zero), roundIndex = 0.
    - Assign judge randomly or by host for Round 1, else group voting mode.
    
3. **Start Round**
    - RoundNumber increment.
    - Server randomly selects a prompt from prompt bank.
    - Global word pool generated (filter out prompt words, optional profanity filter—configurable).
    - Each player receives N unique, random word magnets (eg. 15–20).
        - Words can be repeated across players but each player only uses own pool.
    - Send to clients: prompt, own word pool (IDs), timer starts (eg 90s).

4. **Submission Phase**
    - Players see prompt + their unique pool of words.
    - Each assembles their answer by reordering their assigned words. Client sends array of word IDs in chosen order as answer.
    - Server validates: only valid IDs from that player’s pool, no extras/no repeats (unless assigned twice).
    - If timer expires and no answer, server submits blank or incomplete for them.
    - Once all submitted (or timer), submissions locked.

5. **Reveal Phase**
    - All submissions collected and mapped to player.
    - Depending on judge/group-vote:
        - **Judge:** Judge sees all answers (player names anonymized if needed), picks winner.
        - **Group Vote:** All non-judges vote once for their favorite answer (cannot vote for self).
            - Server calculates tally, handles ties (random pick or judge tie-break).
    - Players have 30–60s max to pick or timer picks random for undecided.

6. **Scoring**
    - Winner receives 1 point on server-side.
    - Round results broadcast: who won, current scores, winning note highlighted.
    - If anyone reaches WIN_THRESHOLD (eg 5 points), move to Game End.
    - Otherwise, advance judge (rotating), increment round number, reset round data.

7. **Game End**
    - If any player >= WIN_THRESHOLD, declare winner(s).
    - Lobby state = Ended.
    - Option to replay (scores reset), or “Return to Lobby” (keep lobby alive in Waiting), or exit/disband.

## Edge Cases & Validation

- **Disconnected Players:** If player DCs mid-round, their spot locks (option: auto-remove, auto-submit blank, or reintegrate if they reconnect before round ends).
- **Late Join:** Never allowed during active round—join only between rounds.
- **Duplicate Nicknames:** Checked and blocked on join.
- **Word Pool Exploiting:** All word selection/submission validated server-side—no custom input; server only accepts valid permutations of assigned word IDs.
- **Timeouts:** All phases have timers (configurable). No player can hold up the game. Defaults: 90s submission, 30s vote/judge.
- **Lobby Expiry:** If all players leave or inactive for X mins (eg 10 min), lobby is destroyed.

## Server Events / API Contracts (Simplified)
- **Events**
    - `lobby:create` → returns code
    - `lobby:join` → returns current lobby state, nickname uniqueness enforced
    - `lobby:update` → broadcast full state on any change
    - `game:start` → initializes scores/round
    - `round:begin` → sends prompt/word pool to each player
    - `round:submit` → players send answer (ordered array of word IDs)
    - `round:submitAck` → server confirms valid/invalid
    - `round:reveal` → broadcast all submissions (with/without names)
    - `result:vote/judge` → vote for answer or judge picks
    - `result:winner` → winner, new scores
    - `game:end` → show winner, allow replay/exit

## Data Structures (Examples)

- **Lobby**:
{
"code": "JKW82A",
"state": "IN_PROGRESS",
"players": [
{"id": 1, "nickname": "Jax", "score": 2, "status": "READY", "words": ["apple", "destroy", "quickly", ...]},
{"id": 2, "nickname": "Sam", "score": 3, ...}
],
"judgeIndex": 1,
"roundNumber": 4,
"history": [/* past rounds */]
}
- **Submission Example**:
{
"playerID": 2,
"answer": ["destroy", "apple", "quickly"]
}

## Security
- No answer accepted unless every word in answer matches assigned word IDs for that user and round.
- No voting for self (if enabled).
- Judge never repeats unless all have judged.
- All state transitions server-driven; clients only send intents.

## Game Win
- Victory requires WIN_THRESHOLD points (set at game start, default 5).
- Any tie (multiple hit threshold) triggers instant tie-breaker round.


