---
title: Body Parsing Middleware
description: Understand how bunWay parses JSON, urlencoded, and text payloads automatically, and learn to customize limits and overrides.
---

# Body Parsing Middleware

bunway includes lightweight helpers for parsing common content types without leaving Bun’s native `Request` objects. Each helper exposes the same signature and respects router-level or per-request overrides.

Even better: every router ships with an auto parser that runs before your handlers. If a request matches an enabled content type, `ctx.req.body` is already waiting for you—no manual parsing required unless you want extra control.

## Quick usage

```ts
import { bunway, json, urlencoded, text } from "bunway";

const app = bunway();
app.use(json());
app.use(urlencoded({ limit: 64 * 1024 }));
app.use(text());
```

::: code-group

```ts [Server]
app.use(json());
app.post("/echo", async (ctx) => ctx.res.json(await ctx.req.parseBody()));
```

```bash [Client]
curl -X POST http://localhost:7070/echo \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada"}'
```

:::

::: tip Fun fact — The Bun way
`ctx.req.body` remembers its value for the rest of the request, even if you swap content-type rules midflight. Bun’s zero-copy buffers keep things speedy without re-reading the stream.
:::

Behind the scenes each helper calls the matching `WayRequest.tryParse*` method. Parsed bodies land on `ctx.req.body`, and `ctx.req.bodyType` indicates which parser succeeded (`"json"`, `"urlencoded"`, `"text"`).

## json()

```ts
app.use(json());
app.use(
  json({
    limit: 1 * 1024 * 1024,
    type: [/json$/, "application/vnd.api+json"],
  })
);
```

Options:

| Option    | Type                                             | Default              | Description                            |
| --------- | ------------------------------------------------ | -------------------- | -------------------------------------- |
| `limit`   | `number`                                         | 1 MiB                | Max payload size before returning 413  |
| `type`    | `string \| RegExp \| ((contentType) => boolean)` | `"application/json"` | Match strategy for enabling the parser |
| `enabled` | `boolean`                                        | `true`               | Force-enable/disable the parser        |

If the payload exceeds the limit or JSON parsing fails, bunway sets `ctx.req.bodyParseError` and the middleware returns a `413` or `400` response (`{"error":"..."}`).

## urlencoded()

```ts
app.use(urlencoded({ limit: 64 * 1024 }));
```

Parses `application/x-www-form-urlencoded` payloads (HTML forms) and converts them to plain objects via `Object.fromEntries(new URLSearchParams(...))`.

Options mirror `json()` (limit, type, enabled). Invalid content types are skipped gracefully.

## text()

```ts
app.use(text());
app.use(text({ type: /text\/(plain|csv)/ }));
```

Reads the body as text and stores it on `ctx.req.body`. Useful when accepting raw string payloads or when you want to handle serialization manually.

## Auto parsing pipeline

Each router inserts an auto body parser before your route handlers. The pipeline looks like this:

1. Global middleware you registered (`cors()`, logging, etc.).
2. Auto parser resolves router defaults and `ctx.req.body` is populated when content types match.
3. Your route-specific middleware/handlers run with the cached payload.

Skip redundant work by calling `ctx.req.isBodyParsed()` inside custom middleware, or short-circuit with your own response if `ctx.req.bodyParseError` is set.

## Router defaults & per-request overrides

Router instances accept a `bodyParser` option at construction time:

```ts
const api = new Router({
  bodyParser: {
    json: { limit: 2 * 1024 * 1024 },
    text: { enabled: true },
  },
});
```

Inside handlers you can tweak behaviour dynamically:

```ts
app.post("/webhook", async (ctx) => {
  ctx.req.applyBodyParserOverrides({ text: { enabled: true } });
  const payload = await ctx.req.parseBody();
  // ...
});
```

::: tip Router defaults
Use router-level overrides for consistent behaviour across groups of routes (e.g., enable text parsing for webhook routers). Handlers can still adjust per-request behaviour as needed.
:::

`ctx.req.isBodyParsed()` lets you detect whether a parser already ran; use this in custom middleware to avoid duplicate work.

## Global tweaks with `bunway.bodyParser`

Prefer to keep configuration in one place? bunway exposes a tiny helper that behaves like Express’ `bodyParser()` middleware:

```ts
const app = bunway();
app.use(bunway.bodyParser({ text: { enabled: true }, json: { limit: 256 * 1024 } }));
```

The helper simply merges overrides onto each request before the auto parser executes—no need to maintain a custom wrapper.

## Error handling

If parsing fails (invalid JSON, payload too large), bunway marks `ctx.req.bodyParseError` and the helper responds with the appropriate HTTP status. Downstream middleware can check `ctx.req.bodyParseError` if you want custom behaviour.

---

Next: explore the [`cors()` middleware](cors.md) or browse the [API Reference](/api/index.html) for option type definitions.
