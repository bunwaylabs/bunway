# Core Primitives

bunway decorates Bun’s Fetch primitives with lightweight helpers. Understanding these building blocks makes it easier to compose middleware and handlers.

## WayContext

Every handler receives a `WayContext` object:

```ts
app.use(async (ctx, next) => {
  console.log(ctx.req.method, ctx.req.path);
  await next();
});
```

- `ctx.req` → {@link WayRequest}: wrapper around Bun’s `Request` with `params`, `query`, `locals`, body parsing helpers, etc.
- `ctx.res` → {@link WayResponse}: fluent builder for returning JSON/text/any payloads while still exposing the underlying `Response`.

## WayRequest

```ts
app.get("/users/:id", async (ctx) => {
  const id = ctx.req.param("id");
  const search = ctx.req.query.get("status");
  const payload = await ctx.req.parseBody();

  // Store data for downstream middleware/handlers
  ctx.req.locals.user = { id, search, payload };

  return ctx.res.ok({ id, search, payload });
});
```

### Key helpers

- `params` / `param()` – Express-style route parameters.
- `query` – `URLSearchParams` instance for query string access.
- `locals` – shared mutable state across middleware.
- `parseBody()` – respects global + per-request overrides.
- `applyBodyParserOverrides()` – tweak body parsing on the fly.
- `rawBody()` / `rawText()` – lazy access to the request body (cached).

::: tip Locals
Use `ctx.req.locals` as a per-request scratchpad. It’s perfect for sharing deserialized users, permissions, or tracing IDs between middleware and handlers.
:::

## WayResponse

```ts
app.post("/sessions", async (ctx) => {
  const session = await createSession(ctx.req);
  return ctx.res
    .status(201)
    .header("Set-Cookie", `session=${session.id}; HttpOnly; Path=/`)
    .json({ id: session.id });
});
```

### Key helpers

- `status(code)` – chainable status setter.
- `header(name, value)` – set response headers.
- `json(data)` / `text(string)` / `send(body)` – return native `Response` objects.
- `ok()`, `created()`, `noContent()` – handy sugar for common status codes.
- `last` – inspect the last generated `Response` object (router uses this fallback).

::: tip Response builders
WayResponse always returns native Fetch `Response` objects, so you can pass them directly to Bun APIs or other tooling without serialization tricks.
:::

## Returning native Responses

Prefer the Fetch API? Return a `Response` directly and bunway’s router will still merge middleware headers:

```ts
app.get("/raw", () => new Response("raw"));
```

## Next steps

With the primitives in mind, learn how routing works in bunway by reading the [Router](router.md) guide, then explore the built-in [Middleware](/middleware/index).
