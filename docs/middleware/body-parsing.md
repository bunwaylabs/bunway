# Body Parsing Middleware

bunway includes lightweight helpers for parsing common content types without leaving Bun’s native `Request` objects. Each helper exposes the same signature and respects router-level or per-request overrides.

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

## Error handling

If parsing fails (invalid JSON, payload too large), bunway marks `ctx.req.bodyParseError` and the helper responds with the appropriate HTTP status. Downstream middleware can check `ctx.req.bodyParseError` if you want custom behaviour.

---

Next: explore the [`cors()` middleware](cors.md) or browse the [API Reference](/api/index.html) for option type definitions.
