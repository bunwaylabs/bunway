import { describe, it, expect } from "bun:test";
import { Router } from "../../src/core/router";
import { HttpError } from "../../src/core/errors";
import { buildRequest } from "../testUtils";

const originHeaderBagKey = "__corsHeaders";

describe("Router", () => {
  it("routes requests, sets params, and returns ctx.res responses", async () => {
    const router = new Router();
    router.get("/users/:id", async (ctx) => {
      expect(ctx.req.params.id).toBe("42");
      const parsed = await ctx.req.parseBody();
      expect(parsed).toBeNull();
      return ctx.res.json({ id: ctx.req.param("id") });
    });

    const response = await router.handle(buildRequest("/users/42"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "42" });
  });

  it("applies extra headers stored on the request locals", async () => {
    const router = new Router();
    router.use(async (ctx, next) => {
      (ctx.req.locals as Record<string, any>)[originHeaderBagKey] = {
        "X-Test": "1",
      };
      await next();
    });
    router.get("/", () => {
      return new Response("raw");
    });

    const res = await router.handle(buildRequest("/"));
    expect(await res.text()).toBe("raw");
    expect(res.headers.get("X-Test")).toBe("1");
  });

  it("converts HttpError instances into proper responses", async () => {
    const router = new Router();
    router.get("/secret", () => {
      throw new HttpError(401, "Missing token");
    });

    const res = await router.handle(
      buildRequest("/secret", {
        headers: { Accept: "application/json" },
      })
    );

    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.json()).toEqual({ error: "Missing token" });
  });

  it("wraps unexpected errors with a 500 response", async () => {
    const router = new Router();
    router.get("/boom", () => {
      throw new Error("Kaboom");
    });

    const res = await router.handle(
      buildRequest("/boom", {
        headers: { Accept: "text/plain" },
      })
    );

    expect(res.status).toBe(500);
    expect(await res.text()).toContain("Internal Server Error");
  });

  it("returns 404 JSON when no route matches", async () => {
    const router = new Router();

    const res = await router.handle(buildRequest("/missing"));

    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.json()).toEqual({ error: "Not Found" });
  });

  it("supports sub-routers mounted at a prefix", async () => {
    const api = new Router();
    api.get("/status", (ctx) => ctx.res.ok({ ok: true }));

    const router = new Router();
    router.use("/api", api);

    const res = await router.handle(buildRequest("/api/status"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("allows configuring body parser defaults dynamically", async () => {
    const router = new Router({
      bodyParser: { text: { enabled: true }, json: { enabled: false } },
    });

    router.configureBodyParser({ text: { limit: 8 } });
    router.post("/echo", async (ctx) => {
      const body = await ctx.req.parseBody();
      return ctx.res.text(String(body));
    });

    const res = await router.handle(
      buildRequest("/echo", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "hello",
      })
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");

    router.setBodyParser({ text: { limit: 4, enabled: true } });

    const tooLarge = await router.handle(
      buildRequest("/echo", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "toolong",
      })
    );

    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ error: "Payload Too Large" });
  });

  it("throws when use() receives an unsupported signature", () => {
    const router = new Router();

    expect(() => router.use(123 as any)).toThrow("Invalid use() signature");
  });
});
