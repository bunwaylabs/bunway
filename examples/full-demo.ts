type BunwayExports = typeof import("../src");

// When working inside the repo we usually want to import from `src/` so edits are reflected
// immediately. Published consumers resolve the package from `dist/`. Toggle via env.
const runtime = (await (Bun.env.BUNWAY_USE_SRC === "true"
  ? import("../src")
  : import("../dist"))) as BunwayExports;

const {
  bunway,
  cors,
  errorHandler,
  HttpError,
  json,
  text,
  urlencoded,
  Router: RouterCtor,
  BUNWAY_DEFAULT_PORT,
} = runtime;

type RouterInstance = InstanceType<typeof RouterCtor>;

type User = { id: string; name: string };

function createAdminRouter(): RouterInstance {
  const router = new RouterCtor();
  router.use(async (ctx, next) => {
    const auth = ctx.req.headers.get("authorization");
    if (auth !== "super-secret") {
      throw new HttpError(401, "Admin authorization required", {
        headers: { "WWW-Authenticate": "Basic realm=admin" },
      });
    }
    await next();
  });

  router.get("/stats", (ctx) => ctx.res.json({ uptime: process.uptime() }));
  return router;
}

function createApiRouter(): RouterInstance {
  const router = new RouterCtor();
  const users = new Map<string, User>([
    ["1", { id: "1", name: "Ada" }],
    ["2", { id: "2", name: "Linus" }],
  ]);

  router.get("/users", (ctx) => ctx.res.ok({ users: Array.from(users.values()) }));

  router.get("/users/:id", (ctx) => {
    const user = users.get(ctx.req.param("id") ?? "");
    if (!user) throw new HttpError(404, "User not found");
    return ctx.res.ok(user);
  });

  router.post("/users", async (ctx) => {
    ctx.req.applyBodyParserOverrides({
      text: { enabled: false },
      urlencoded: { enabled: true },
    });
    const form = (await ctx.req.parseBody()) as Record<string, unknown>;
    const id = crypto.randomUUID();
    const name = String(form?.name ?? "Anonymous");
    users.set(id, { id, name });
    return ctx.res.created({ id, name });
  });

  router.post("/users/:id/preferences", async (ctx) => {
    const data = (await ctx.req.parseBody()) as Record<string, unknown>;
    const id = ctx.req.param("id")!;
    users.set(id, { id, name: String(data?.name ?? "Anonymous") });
    ctx.req.locals.updatedAt = new Date().toISOString();
    return ctx.res.json({ saved: true, updatedAt: ctx.req.locals.updatedAt });
  });

  router.get(
    "/raw",
    () =>
      new Response(JSON.stringify({ message: "Raw response" }), {
        headers: { "Content-Type": "application/json" },
      })
  );

  return router;
}

export function createApp(): ReturnType<typeof bunway> {
  const app = bunway();

  const shouldLogRequests =
    Bun.env.BUNWAY_LOG_REQUESTS === "true" || Bun.env.NODE_ENV !== "production";

  app.use(
    cors({
      origin: (origin) => {
        if (!origin) return "*";
        if (origin.startsWith("http://localhost")) return origin;
        return false;
      },
      credentials: true,
      allowPrivateNetwork: true,
    })
  );

  app.use(async (ctx, next) => {
    if (!shouldLogRequests) {
      await next();
      return;
    }
    const start = performance.now();
    await next();
    const duration = performance.now() - start;
    console.log(
      `${ctx.req.method} ${ctx.req.path} -> ${ctx.res.statusCode} (${duration.toFixed(1)}ms)`
    );
  });

  app.use(json());
  app.use(urlencoded());
  app.use(text());

  app.use(
    errorHandler({
      logger: (err, ctx) => {
        console.error("Unhandled error", ctx.req.method, ctx.req.path, err);
      },
      map: (err) => {
        if (err instanceof SyntaxError) {
          return new HttpError(400, "Malformed JSON payload");
        }
        return null;
      },
    })
  );

  app.use("/admin", createAdminRouter());
  app.use("/api", createApiRouter());

  app.get("/health", (ctx) => ctx.res.text("OK"));
  app.post("/echo", async (ctx) => {
    // Auto body parsing ran earlier, so `ctx.req.body` is already populated; parseBody() is
    // called here only to illustrate the manual override API.
    const body = await ctx.req.parseBody();
    return ctx.res.ok({ body });
  });

  return app;
}

const PORT = Number(Bun.env.PORT ?? BUNWAY_DEFAULT_PORT);
const app = createApp();

app.listen({ port: PORT }, () => {
  console.log(`bunWay demo listening on http://localhost:${PORT}`);
});
