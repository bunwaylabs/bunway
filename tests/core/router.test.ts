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
});
