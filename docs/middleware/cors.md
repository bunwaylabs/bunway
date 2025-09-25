---
title: CORS Middleware
description: Configure bunWay’s Bun-native CORS middleware to handle simple and preflight requests with granular origin policies.
---

# CORS Middleware

`cors()` brings fine-grained CORS control to bunway while keeping everything Bun-native. The middleware examines the incoming Origin/Access-Control headers, decides whether to allow the request, and records headers so the router can merge them even when you return a raw `Response` object.

## Basic usage

```ts
import { cors } from "bunway";

app.use(cors()); // wildcard
app.use(cors({ origin: true })); // reflect request origin
app.use(cors({ origin: "https://app.example.com" }));
```

Set `credentials: true` to allow cookies/authorization headers—bunway automatically prevents `*` when credentials are enabled by reflecting the incoming origin instead.

```ts
app.use(cors({ origin: true, credentials: true }));
```

::: tip Credentials
When `credentials: true`, bunway automatically reflects the request origin instead of using `*`. Ensure your allow list covers every origin that should receive credentialed responses.
:::

## Allow list patterns

- `string` – match exact origin
- `RegExp` – pattern match
- `(origin, ctx) => string | false` – custom logic (return the origin to allow, `false` to block)
- Arrays combine multiple strings/regexes

```ts
app.use(
  cors({
    origin: (origin) => (origin?.startsWith("http://localhost") ? origin : false),
    allowPrivateNetwork: true,
  })
);
```

## Preflight requests

Preflight (`OPTIONS`) requests are answered automatically with:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods` (customizable via `methods` option)
- `Access-Control-Allow-Headers` (explicit list or echo request header)
- `Access-Control-Allow-Credentials` when `credentials: true`
- `Access-Control-Max-Age` (default 600 seconds)
- `Access-Control-Allow-Private-Network` when `allowPrivateNetwork: true`

The middleware also ensures the proper `Vary` headers (`Origin`, `Access-Control-Request-*`) are set to keep caches honest.

## Header merging

All generated headers are stored in `ctx.req.locals.__corsHeaders`. bunway’s router finalizer merges these onto the final `Response`, even if your handler returns a native `Response` object:

```ts
app.get("/raw", () => new Response("raw", { status: 202 }));
```

## Options reference

:::details CORS Options reference

- **`origin`**: `"*"` \| `true` \| `string` \| `RegExp` \| `(string \| RegExp)[]` \| `(origin, ctx) => string \| false`
  - Decide which origins are allowed. Returning `false` blocks the request; when `credentials: true`, bunWay reflects the approved origin instead of `"*"`.
- **`credentials`**: `boolean` (default `false`)
  - Allow credentialed requests. bunWay automatically prevents `"*"` when enabled.
- **`methods`**: `string[]` (default `['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS']`)
  - Whitelist methods used in preflight responses.
- **`allowedHeaders`**: `string[]`
  - Force a specific allow-list instead of echoing `Access-Control-Request-Headers`.
- **`exposedHeaders`**: `string[]`
  - Populate `Access-Control-Expose-Headers`.
- **`maxAge`**: `number` (default `600`)
  - Cache duration (seconds) for successful preflight responses.
- **`allowPrivateNetwork`**: `boolean` (default `false`)
  - Opt into `Access-Control-Allow-Private-Network`.

:::

## Recommendations

- Reflect (`origin: true`) when you need credentials.
- Keep the allow-list tight in production—prefer regex/string arrays over wildcards.

::: warning Production allow list
Audit CORS settings regularly. Accidentally allowing `*` with credentials or forgetting to restrict origins can expose sensitive endpoints.
:::

- Combine with `errorHandler()` to log disallowed origins or unexpected headers.

For type details see `CORSOptions` in the [API Reference](/api/index.html).
