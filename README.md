# Chat Is the Boss

A real-time 3D browser arena where Twitch viewers control the boss and the streamer fights to survive. Built by Nikhil Malankar with OpenAI Codex on 30–31 October 2026 for the Codex x TwitchCon Hackathon.

**Play:** https://chat-is-the-boss.web.app

## Play and stream
1. Open the hosted game in a WebGL2-capable desktop browser and select **Connect Twitch**. Sign in as the broadcaster and authorize read-only chat access.
2. Wait for your Twitch identity to appear, then select **Enter the arena**.
3. Capture that game browser window in OBS and stream to your Twitch channel. An independent OBS Browser Source creates another game instance, so use Window Capture.
4. Viewers send `!laser`, `!charge`, `!shield`, `!rockets`, or `!slam` in that channel's Twitch chat.

**Goal:** destroy as many bosses as possible before losing all five lives.

Move with WASD/arrows, hold left mouse or J to fire, and press Space to dodge. Aiming is automatic; shooting is manual with an eight-shot magazine, firing cooldown and reload. Touch controls provide a movement pad, FIRE and DODGE. Pickups grant temporary Rapid Fire, Scattergun or Heavy Cannon.

In live mode, the boss pursues the player but attacks only in response to chat. Each accepted command queues one action in arrival order, with eight pending actions maximum and a 0.75-second per-viewer cooldown. Paused commands wait for resume. Chat's four-second vote cycles also change the displayed weapon loadout. The HUD identifies the latest sender, command and outcome. Defeated bosses are replaced automatically; later bosses increase pressure. Disconnecting Twitch pauses play.

## Run locally
Requires Node.js 22 or newer and a WebGL2-capable browser. The committed `index.html` includes the bundled renderer, so runtime needs no package installation.

1. Create a confidential application at https://dev.twitch.tv/console/apps with OAuth redirect **http://localhost:4328/auth/callback**.
2. Copy `.env.example` to `.env` and fill in your own Twitch client ID and secret. Keep `.env` private.
3. Run `npm start` and open http://localhost:4328.
4. Connect Twitch as the broadcaster, then enter the arena. Send supported commands from another Twitch account to verify viewer interaction.

The game needs Twitch authorization to start. No shared credentials are supplied. The app requests only `user:read:chat` and never posts chat messages.

## Source and rebuilding
- `src/game.js`: gameplay, input, UI, effects and sound.
- `src/boss3d.js`: procedural Three.js arena and characters.
- `server.mjs`: OAuth, Twitch EventSub WebSocket adapter and per-browser sessions.
- `index.html`: page and committed bundled game.
- `build-3d.mjs`: bundles source into the page.

Run `npm ci` followed by `npm run build:3d` to rebuild. Three.js is bundled locally; no runtime CDN, downloaded character models or runtime AI is required. Third-party license: `docs/THREE-LICENSE.txt`. Original artwork is procedural and sound effects are synthesized with WebAudio.

## Testing and evidence
With `npm start` running, run `npm test` for HTTP/security and session-isolation checks. The `.cjs` gameplay scripts are development browser checks that require Chrome and puppeteer-core; some use local tool paths and earlier scripts document superseded designs. `tests/chat-control.cjs` covers the live command queue correction.

Real broadcaster authorization, EventSub subscription and broadcaster commands were verified. A user-recorded live Twitch demonstration on 31 October shows a distinct viewer sending commands and the game HUD confirming `!slam` fired. This does not establish load testing or broad device compatibility. Physical mobile and broader multi-viewer testing remain outstanding.

## Hosting and limitations
The public testing deployment uses Firebase Hosting and a single Google Cloud Run instance. `firebase.json`, `.firebaserc` and `Dockerfile` describe this deployment; use your own project for a separate deployment. Set `PUBLIC_ORIGIN` to your HTTPS origin and register its `/auth/callback` with Twitch. Store the client secret in Secret Manager, never source control.

Tokens and sessions stay in server memory, isolated by an HttpOnly session cookie. Restarting the service requires reconnecting Twitch. The deployment is a single-instance prototype, not a horizontally scaled production system. The browser polls commands every 350ms to avoid proxy buffering; the backend retains at most 100 recent commands for 30 seconds.

## Codex development
Codex helped implement the procedural 3D world, manual combat and pickups, Twitch OAuth/EventSub integration, responsive interface, effects, tests and deployment configuration. Iteration was driven by playtesting feedback, including replacing autonomous boss attacks with actual chat-driven queued attacks.

Principal build session: `01a18c54-1314-7f73-9e0d-831438172cdd`.
See `docs/SUBMISSION.md` for submission evidence.
