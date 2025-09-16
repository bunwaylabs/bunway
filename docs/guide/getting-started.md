# Getting Started

bunway lets you write Bun HTTP handlers with familiar Express-style ergonomics while staying 100% Bun-native.

## Installation

```bash
bun add bunway
```

> bunway is Bun-only. Please do not attempt to use it from Node.js.

## Hello world

Spin up a minimal server to see bunway in action.

```ts
import { bunway, cors, json, errorHandler } from "bunway";

const app = bunway();

app.use(cors({ origin: true }));
app.use(json());
app.use(errorHandler({ logger: console.error }));

app.get("/", (ctx) => ctx.res.text("Hello from bunway"));

app.listen({ port: 7070 }, () => {
  console.log("bunway listening on http://localhost:7070");
});
```

::: tip Bun-first only
bunway targets Bun exclusively—no Node polyfills or compatibility layers are shipped. Use Bun v1.0+ for best results.
:::

## Requests & responses

Every handler receives a `WayContext`:

::: code-group

```ts [Server]
app.post("/echo", async (ctx) => {
  const body = await ctx.req.parseBody();
  return ctx.res.json({ received: body });
});
```

```bash [Client]
curl -X POST http://localhost:7070/echo \
  -H "Content-Type: application/json" \
  -d '{"hello":"bunway"}'
```

:::

- `ctx.req` (WayRequest) decorates Bun's `Request` with helpers such as `params`, `query`, `locals`, and body parsing.
- `ctx.res` (WayResponse) wraps `Response` with helpers like `json()`, `text()`, `status()`, and convenience methods (`ok`, `created`, etc.).

Want the raw Fetch API? Return a `Response` directly and bunway will still apply middleware headers.

## Sub-routers

```ts
import { Router } from "bunway";

const api = new Router();
api.get("/users", (ctx) => ctx.res.json({ users: [] }));

const app = bunway();
app.use("/api", api);
```

## Testing with Bun

Use Bun’s built-in test runner—no extra libraries required:

```ts
import { describe, it, expect } from "bun:test";
import { bunway } from "bunway";

describe("health", () => {
  it("returns OK", async () => {
    const app = bunway();
    app.get("/health", (ctx) => ctx.res.text("OK"));
    const res = await app.handle(new Request("http://localhost/health"));
    expect(await res.text()).toBe("OK");
  });
});
```

Run tests via `bun test`.

::: warning Testing tips
The Bun test runner resets global state between files. Keep fixtures explicit and prefer per-test setup/teardown to avoid surprises.
:::

::: tip Project scaffolding
Looking for repo layout, scripts, and contributor workflow? See the repository [README](https://github.com/bunwaylabs/bunway#readme) for setup details beyond runtime usage.
:::

Continue exploring the [Middleware guides](/middleware/index) or dig into the [API reference](/api/index.html).
