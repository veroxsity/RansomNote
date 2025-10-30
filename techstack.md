# Tech Stack

| Layer      | Technology              | Reason                                             |
| ---------- | ----------------------- | -------------------------------------------------- |
| Frontend   | React.js (Next.js)      | Fast prototyping, component-based, easy drag/drop  |
| Styling    | Tailwind CSS OR Mantine | Quick, modern layouts                              |
| Realtime   | Socket.IO               | Real-time, supports web rooms, familiar API        |
| Backend    | Node.js w/ NestJS       | Scalable, TypeScript everywhere, well-structured   |
| State      | In-Memory (MVP), Redis  | Fast for now; Redis upgrade for scale/persistence  |
| Hosting    | Docker on VPS/Cloud     | Clean deploy, simple reverse proxy                 |
| Auth       | Nickname/Session only   | No passwords/accounts for MVP                      |

**Extra Dev Notes:**
- Validate everything server-side—never trust client.
- Consider server events/contract early to avoid pain later.
- Write E2E tests for game logic if possible.
