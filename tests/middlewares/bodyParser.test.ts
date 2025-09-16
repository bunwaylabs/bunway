import { describe, it, expect } from "bun:test";
import { WayContext } from "../../src/core/context";
import { json, text, urlencoded } from "../../src/middlewares/bodyParser";
import { buildRequest } from "../testUtils";

const buildContext = (init: RequestInit & { path?: string }) => {
  const { path = "/", ...options } = init;
  return new WayContext(buildRequest(path, options as RequestInit));
};

describe("body parser middleware", () => {
  it("parses JSON bodies", async () => {
    const ctx = buildContext({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    let nextCalled = false;
    await json()(ctx, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(ctx.req.body).toEqual({ hello: "world" });
  });

  it("parses urlencoded bodies", async () => {
    const ctx = buildContext({
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ foo: "bar" }).toString(),
    });

    await urlencoded()(ctx, async () => {});
    expect(ctx.req.body).toEqual({ foo: "bar" });
  });

  it("parses plain text bodies", async () => {
    const ctx = buildContext({
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });

    await text()(ctx, async () => {});
    expect(ctx.req.body).toBe("hello");
  });

  it("returns 413 when payload exceeds configured limit", async () => {
    const ctx = buildContext({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: "too big" }),
    });

    let nextCalled = false;
    const response = await json({ limit: 5 })(ctx, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error("Expected a Response when payload too large");
    }
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Payload Too Large" });
  });
});
