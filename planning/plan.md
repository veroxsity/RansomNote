# Plan: Online Ransom Notes Game

## Purpose
Build a real-time browser version of the Ransom Notes party game. Players create/join private lobbies with a code. Each round, everyone assembles silly sentences from randomized "magnet" words to answer a prompt. Players vote; first to 5 wins.

## Features
- **Lobby System:** Create/join lobby by code.
- **Player Limit:** 3–8 per lobby.
- **Game Rounds:**
  - Server sends prompt + word pool (unique for each player).
  - Players assemble answer using only their words (drag/drop or click).
  - Answers hidden until all submitted or timer ends.
  - Voting: either judge (rotates) or all vote (group voting, one vote each).
  - Winner scores a point.
  - Next round, new prompt, new words.
  - End: First to 5 points or players choose to end.

## Game Logic
- **LobbyManager:** Keeps all active lobbies; cleans dead ones.
- **Joining:** Players join by code—checks for max/active status.
- **Start Game:** Either when everyone’s ‘ready’ or when host clicks ‘start’.
- **Word Pools:** For each round, server deals unique set of words to each player, valid only for that round.
- **Building Answers:** Players assemble sentences by selecting (and ordering) their assigned words.
- **Submissions:** Sent to server for validation (right player, only their words, right count).
- **Timer:** If timer runs out, anyone left gets auto-filled or blank.
- **Reveal:** All sentences shown for judging/vote.
- **Judging:** Judge rotates, or group votes (tie = random winner).
- **Score Keeping:** Winner earns point. Reset for next round.
- **Victory:** First to 5 points. Lobby shown results, ability to restart.
- **Security:** All main logic/validation on the backend.

## Technical Scope
- Real-time comms: lobbies, game state, submissions.
- UI/UX: Clean, mobile-friendly, barebones at first.
- Server-side: All cheating blocked, all state server-authoritative.

## Out of Scope (for MVP)
- User accounts/logins
- Public lobby browsing
- Fancy visuals/animations
- Game history/stat tracking
