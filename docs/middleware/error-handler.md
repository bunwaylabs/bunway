---
title: Error Handler Middleware
description: Catch and format errors in bunWay using errorHandler(), with logging hooks and HttpError support.
---

# Error Handler Middleware

`errorHandler()` provides a catch-all layer that logs unexpected errors, respects thrown `HttpError` instances, and keeps responses Fetch-friendly.

## Usage

Place it near the end of your middleware chain:

```ts
import { bunway, errorHandler, HttpError } from "bunway";

const app = bunway();
app.use(errorHandler({ logger: console.error }));

app.get("/secret", () => {
  throw new HttpError(403, "Forbidden");
});
```

- Thrown `HttpError`s become responses with their status, body, and headers.
- Non-HttpError exceptions yield a 500 JSON payload (`{"error":"Internal Server Error"}`) and optional logging.
- If you throw/return a native `Response`, the middleware simply passes it through.

## Mapping custom errors

Use the `map` option to translate domain exceptions into `HttpError` instances:

```ts
app.use(
  errorHandler({
    logger: console.error,
    map: (err) => {
      if (err instanceof SyntaxError) return new HttpError(400, "Invalid JSON payload");
      if (err instanceof AuthError) return new HttpError(401, err.message);
      return null; // fallback to default handling
    },
  })
);
```

The mapping function may return:

- `HttpError` – used directly
- `Error` – re-thrown so the standard branch handles it
- `null`/`undefined` – skip mapping

::: tip Custom responses
Need to return a custom `Response`? Throw or return the `Response` directly inside the handler—`errorHandler()` passes it through untouched.
:::

## Logging

Provide `logger` to capture unexpected errors. bunway wraps calls in `try/catch` so logging failures don’t crash the app. Example logger signature: `(error, ctx) => void`.

## Response format

When a handler throws `HttpError(404, "Not found")`:

```json
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":"Not found"}
```

If the request’s `Accept` header prefers text (`text/plain`), bunway returns a plain-text body instead.

## Tips

- Combine with `cors()` so even error responses contain the correct CORS headers.
- Use `ctx.req.locals` to pass debugging info to the logger.
- Keep error messages client-safe; internal stack traces shouldn’t leak to users. Log detailed errors server-side instead.

For option details see `ErrorHandlerOptions` in the [API Reference](/api/index.html).
