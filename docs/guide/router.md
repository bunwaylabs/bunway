---
title: Router Deep Dive
description: Learn how bunWay’s router composes middleware, sub-routers, and native Fetch responses while staying true to Bun.
---

# Router Deep Dive

bunway’s router borrows Express’ ergonomics while staying true to Bun’s Fetch APIs. This page explains the lifecycle so you can compose middleware, sub-routers, and custom responses with confidence.

## Anatomy of a request

1. **Match** – incoming requests match routes by HTTP method + path (supporting `:params`).
2. **Pipeline** – global middleware → auto body parser → route-specific middleware/handlers.
3. **Execution** – each handler receives `(ctx, next)`. Call `await next()` to continue the chain.
4. **Finalization** – the router chooses the final `Response` (explicit return, `ctx.res.last`, or default 200) and merges header bags (e.g., CORS) before returning.

## Registering routes

Define routes using the familiar HTTP verb helpers. Each handler receives the Bun-native context object, giving you immediate access to parameters, query strings, locals, and body parsing utilities.

```ts
const app = bunway();

app.get("/health", (ctx) => ctx.res.text("OK"));
app.post("/users", async (ctx) => ctx.res.created(await ctx.req.parseBody()));
app.patch("/users/:id", async (ctx) => {
  const id = ctx.req.param("id");
  const updates = await ctx.req.parseBody();
  return ctx.res.json(await updateUser(id, updates));
});
```

### Multiple handlers

Chain middleware the same way you would in Express. Each handler can perform work, populate `ctx.req.locals`, and decide whether to continue by calling `await next()`.

```ts
app.get("/users/:id", authMiddleware, loadUser, (ctx) => ctx.res.json(ctx.req.locals.user));
```

`next()` is promise-based—await it if you need to run code after downstream handlers complete.

## Middleware ordering

Global middleware runs in the order registered, followed by route-specific middleware. This makes it easy to compose logging, authentication, and other cross-cutting concerns.

```ts
app.use(cors()); // global
app.use(json()); // global
app.use(loggingMiddleware); // global

app.get("/secure", authMiddleware, (ctx) => ctx.res.ok(ctx.req.locals.user));
```

- Global middleware runs before route-specific middleware.
- `ctx.req.isBodyParsed()` lets you skip redundant parsing.
- Middleware can return `Response` to short-circuit the pipeline (e.g., auth failures).

## Sub-routers

Group related endpoints into sub-routers for better organization. bunway rewrites the request URL so nested routers see paths relative to their mount point.

```ts
import { Router } from "bunway";

const api = new Router();
api.get("/users", listUsers);
api.get("/users/:id", showUser);

app.use("/api", api);
```

Sub-routers inherit parent middleware and can register their own `router.use()` handlers.

::: tip Sub-router inheritance
Middleware registered on the parent app runs before sub-router handlers. Add router-specific middleware (auth, logging) inside the router for scoped behaviour.
:::

### Nested routers

Routers can be nested multiple levels deep. This lets large applications expose modular areas (e.g., `/api/admin`) without losing composability.

```ts
const admin = new Router();
admin.use(requireAdmin);
admin.get("/stats", getStats);

api.use("/admin", admin);
```

::: tip Returning native responses
Handlers can always return `Response` objects straight from Fetch APIs—bunWay will still merge any middleware headers during finalization.
:::

## Error handling

- Throw `HttpError` for explicit status/body/headers.
- Throw/return `Response` for fully custom responses.
- Use `errorHandler()` middleware for logging/mapping.
- Unhandled errors fall back to a safe 500 JSON payload.

```ts
app.get("/secret", () => {
  throw new HttpError(403, "Forbidden");
});
```

## 404 behaviour

Unmatched routes return:

```json
HTTP/1.1 404 Not Found
Content-Type: application/json
{"error":"Not Found"}
```

Customize by adding a catch-all route at the end:

```ts
app.use((ctx) => ctx.res.status(404).json({ error: "Route not found" }));
```

::: warning Catch-all
Be sure to register catch-all handlers last—bunway processes middleware in order, so earlier routes or middleware can short-circuit the response.
:::

## Body parser defaults

Routers accept body parser defaults via constructor:

```ts
const router = new Router({
  bodyParser: {
    json: { limit: 2 * 1024 * 1024 },
    text: { enabled: true },
  },
});
```

Handlers can override parsing dynamically with `ctx.req.applyBodyParserOverrides()`.

## Recipes — run everything, the Bun way

### Friendly request logger

```ts
app.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(1);
  console.log(`${ctx.req.method} ${ctx.req.path} → ${ctx.res.statusCode} (${ms}ms)`);
});
```

Flip logging on or off with environment variables (e.g., `BUNWAY_LOG_REQUESTS=true`) to keep production output tidy.

### Admin-only sub-router

```ts
const admin = new Router();
// bring HttpError in from "bunway" to reuse friendly responses
admin.use(async (ctx, next) => {
  if (ctx.req.headers.get("authorization") !== "super-secret") {
    throw new HttpError(401, "Admin authorization required");
  }
  await next();
});

admin.get("/stats", (ctx) => ctx.res.json({ uptime: process.uptime() }));

app.use("/admin", admin);
```

### Per-request format switch

```ts
app.post("/webhook", async (ctx) => {
  ctx.req.applyBodyParserOverrides({ text: { enabled: true }, json: { enabled: false } });
  const payload = await ctx.req.parseBody();
  return ctx.res.ok({ received: payload });
});
```

::: note Configuration tip
Combine these recipes with `app.use(bunway.bodyParser({ text: { enabled: true } }))` to set defaults before per-request overrides kick in.
:::

## Advanced patterns

- **Streaming**: work directly with `await ctx.req.rawBody()` or `ctx.req.original.body` for streams.
- **Locals**: share data across middleware via `ctx.req.locals` (e.g., `ctx.req.locals.user = user`).
- **Async cleanup**: run code after `await next()` to implement logging, timers, or metrics.

---

Continue to [Middleware Overview](/middleware/index) or explore type-level details in the [API Reference](/api/index.html).
