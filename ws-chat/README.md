# ws-chat

Real-time chat on **`@forinda/kickjs-ws`**: decorator WebSocket controllers, rooms, a per-room user list, token auth on connect, heartbeat, and a Redis broker so several instances share one chat.

- `src/modules/chats/chat.gateway.ts` — `@WsController('/chat')`: `room:join`, `room:leave`, `message:send` (only to rooms you joined), `room:users` pushed to the room on every join/leave/disconnect, a `*` catch-all for unknown events.
- `src/auth.ts` — HMAC-signed chat tokens (`issueToken` / `verifyToken`) and `resolveSocketUser`, the `WsAdapter({ auth: { resolveUser } })` hook. It reads `?token=` (browsers can't set WebSocket headers) or `Authorization: Bearer`; no or bad token → the socket closes with **4401** before any handler runs.
- `src/modules/chats/chat.controller.ts` — `POST /api/v1/chat/token {name}` (demo sign-in; swap for your auth) and `GET /api/v1/chat/rooms/:room/users` (needs `Authorization: Bearer <chat token>`, like the socket).
- `src/modules/chats/presence.repository.ts` — who is in which room: a Redis hash when Redis is configured (shared by every instance), a `Map` otherwise.
- `src/adapters/redis.adapter.ts` — `RedisAdapter` owns the two ioredis connections (publisher + subscriber), binds `REDIS`, reports `redis` on `GET /health/ready`, quits on shutdown.
- `src/index.ts` — `WsAdapter({ heartbeatInterval, auth, broker: redisBroker(...) })`; the broker relays `ctx.to(room).send()` between instances.
- `src/adapters/public-page.adapter.ts` + `public/index.html` — a plain page at `/` to try it in a browser.

Guide: [WebSockets](https://kickjs.app/guide/websockets) · API: [@forinda/kickjs-ws](https://kickjs.app/api/ws)

## Protocol

Connect to `ws://localhost:3000/ws/chat?token=<token>`. Frames are JSON `{ "event": …, "data": … }`.

| Client → server | data             | Server → client | data                       |
| --------------- | ---------------- | --------------- | -------------------------- |
| `room:join`     | `{ room }`       | `welcome`       | `{ id, name }`             |
| `room:leave`    | `{ room }`       | `room:users`    | `{ room, users }`          |
| `message:send`  | `{ room, text }` | `message`       | `{ room, from, text, at }` |
|                 |                  | `error`         | `{ message }`              |

Room names match `[a-z0-9-]{1,32}`; text is 1–500 characters. The server pings every `WS_HEARTBEAT_MS` and drops a socket that missed the previous pong.

## Env

| Variable          | Default (dev)    | Notes                                                      |
| ----------------- | ---------------- | ---------------------------------------------------------- |
| `CHAT_SECRET`     | dev-only default | Required unless `NODE_ENV` is `development` or `test`, 32+ chars (`openssl rand -hex 32`) |
| `REDIS_URL`       | unset            | Set it to run more than one instance                       |
| `WS_HEARTBEAT_MS` | `30000`          | `0` disables the heartbeat                                 |

## Run

```bash
pnpm install          # or: npm install
cp .env.example .env
pnpm dev              # or: npm run dev — open http://localhost:3000 in two tabs
```

Two instances sharing one chat:

```bash
docker run -d --rm --name ws-chat-redis -p 6379:6379 redis:7-alpine
pnpm build            # or: npm run build
REDIS_URL=redis://localhost:6379 PORT=3001 pnpm start &
REDIS_URL=redis://localhost:6379 PORT=3002 pnpm start &
# open http://localhost:3001 and http://localhost:3002, join the same room, chat across them
curl http://localhost:3001/health/ready   # {"status":"ready","checks":[{"name":"redis","status":"up"}]}
```

From a terminal instead of the page:

```bash
TOKEN=$(curl -s -X POST -H 'content-type: application/json' -d '{"name":"alice"}' \
  http://localhost:3000/api/v1/chat/token | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
npx wscat -c "ws://localhost:3000/ws/chat?token=$TOKEN"
> {"event":"room:join","data":{"room":"general"}}
> {"event":"message:send","data":{"room":"general","text":"hi"}}
```

## Test

```bash
pnpm test             # or: npm test
```

`src/modules/chats/chat.test.ts` starts the app on a free port with real `ws` clients: a socket without a token (or with a forged or expired one) is closed with 4401; one client's room message reaches the other, with the room user list kept in step (also over HTTP) and updated on disconnect; a client in another room gets nothing, and sending to a room you haven't joined is refused; the heartbeat pings. The tests run without Redis (single process); the two-instance path is the run above.

## Deploy

**Required env:** `CHAT_SECRET` (32+ chars; fail closed — with `NODE_ENV=production`, the image's, or unset, the app refuses to boot without it). Optional `REDIS_URL` to run several instances.

**Docker**

```bash
docker build -t ws-chat .
docker run -p 3000:3000 -e CHAT_SECRET=$(openssl rand -hex 32) ws-chat
# open http://localhost:3000 — the page and ws://…/ws/chat on the same port
```

One instance keeps rooms and presence in memory. For several, give every instance the same `REDIS_URL` (and `CHAT_SECRET`); the load balancer must pass WebSocket upgrades.

**Not serverless:** Netlify and Vercel functions can't hold WebSocket connections open, so this app needs a long-running server (the image, or any Node host).

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
