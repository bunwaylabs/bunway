# bunway

**Run everything. The Bun way.** bunway is an open-source experiment to recreate the ergonomics of Express on top of Bun’s native runtime. If you moved to Bun for its speed and modern APIs but miss the familiar middleware/route flow, this toolkit is for you.

> bunway embraces Bun’s primitives (`Request`, `Response`, streams, Bun.serve, Bun’s test runner) and avoids Node polyfills. It’s intentionally Bun-only.

## Why bunway?

- Couldn’t find a Bun routing library that _felt_ like home for Express developers.
- Wanted batteries included—body parsing, CORS, error handling—without abandoning Fetch semantics.
- Believe that an all-in-one Bun-native toolkit can exist if the community builds it together.

## Highlights (Phase 0)

- `bunway()` factory → `app.listen()` with Bun’s `Bun.serve`
- Familiar middleware pipeline `(ctx, next)` with support for sub-routers
- `WayRequest`/`WayResponse` helpers for params, locals, JSON/text responses, and body parsing
- Built-in middleware: `json()`, `urlencoded()`, `text()`, `cors()`, `errorHandler()`
- Response finalizer merges middleware header bags onto raw `Response` values
- Bun-native test suite covering routes, errors, CORS, body limits

See the [Roadmap & Contributions](docs/community/build-together.md) for upcoming phases (cookies, sessions, streaming, security, observability, …).

## Getting started (usage)

Install from npm (Bun-only runtime):

```bash
bun add bunway
```

```ts
import { bunway, cors, json, errorHandler, HttpError } from "bunway";

const app = bunway();

app.use(cors({ origin: true }));
app.use(json());
app.use(errorHandler({ logger: console.error }));

app.get("/", (ctx) => ctx.res.text("Hello from bunway"));

app.get("/users/:id", async (ctx) => {
  const id = ctx.req.param("id");
  if (!id) throw new HttpError(404, "User not found");
  return ctx.res.json({ id, body: await ctx.req.parseBody() });
});

app.listen({ port: 7070 }, () => {
  console.log("bunway listening on http://localhost:7070");
});
```

For deep usage docs visit the VitePress site (`bun run docs:dev`).

## Project setup (contributors)

```
src/                # source
├─ core/            # WayRequest, WayResponse, Router
├─ middlewares/     # builtin middleware
├─ config/          # shared config/types
├─ server.ts        # bunway app + listen helper
examples/           # runnable samples (bun run examples/basic.ts)
tests/              # Bun tests (bun test)
docs/               # VitePress guides + TypeDoc API reference
```

Scripts (Bun-native unless noted):

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `bun install`          | install dependencies                          |
| `bun run test`         | Bun test suite                                |
| `bun run typecheck`    | TypeScript strict check                       |
| `bun run build`        | compile TS → `dist/` (JS + d.ts + sourcemaps) |
| `bun run docs`         | generate TypeDoc HTML into `docs/public/api`  |
| `bun run docs:dev`     | run VitePress docs locally                    |
| `bun run docs:build`   | build static docs site                        |
| `bun run format`       | Prettier formatting                           |
| `npm run prepare:dist` | build + shape `dist/` for publishing          |

## Documentation

- Usage guides live in [`docs/guide`](docs/guide) (served by VitePress).
- Built-in middleware docs live in [`docs/middleware`](docs/middleware).
- Roadmap & contribution details: [`docs/community/build-together`](docs/community/build-together.md).
- API reference is generated via TypeDoc into `docs/public/api/index.html` (`bun run docs`).

## Contributing

bunway belongs to the community—anyone can use it, shape it, and help prove Bun can be an all-in-one backend platform.

1. **Stay Bun-native** – rely on Bun’s standard library; avoid Node-only dependencies.
2. **Pick a phase** – grab an item from the roadmap and open an issue/PR to discuss approach.
3. **Prototype boldly** – rough PRs welcome; iterate together.
4. **Test & document** – add Bun tests, update TypeDoc comments, expand VitePress guides.
5. **Keep it fun** – bunway is a playground. Share ideas, experiment, and help fellow Bun developers feel at home.

Guidelines, scripts, and workflow tips live in [docs/community/build-together.md](docs/community/build-together.md).

## License

MIT © bunway contributors
