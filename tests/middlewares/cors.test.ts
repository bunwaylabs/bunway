import { describe, it, expect } from "bun:test";
import { WayContext } from "../../src/core/context";
import { cors } from "../../src/middlewares/cors";
import { buildRequest, TEST_ORIGIN } from "../testUtils";

const createContext = (init: RequestInit & { path?: string }) => {
  const { path = "/resource", ...options } = init;
  return new WayContext(buildRequest(path, options as RequestInit));
};

describe("cors middleware", () => {
  it("skips when there is no origin header", async () => {
    const ctx = createContext({ method: "GET" });
    let nextCalled = false;
    await cors()(ctx, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(ctx.req.locals.__corsHeaders).toBeUndefined();
  });

  it("handles simple requests and stores headers for finalizer", async () => {
    const ctx = createContext({
      method: "GET",
      headers: { Origin: TEST_ORIGIN },
    });

    await cors({ origin: true, credentials: true })(ctx, async () => {});

    const bag = ctx.req.locals.__corsHeaders as Record<string, string>;
    expect(bag["Access-Control-Allow-Origin"]).toBe(TEST_ORIGIN);
    expect(bag["Access-Control-Allow-Credentials"]).toBe("true");
    expect(ctx.res.headers.get("Vary")).toContain("Origin");
  });

  it("responds to preflight requests with configured headers", async () => {
    const ctx = createContext({
      method: "OPTIONS",
      headers: {
        Origin: TEST_ORIGIN,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "X-Custom",
      },
    });

    await cors({ allowPrivateNetwork: true })(ctx, async () => {
      throw new Error("next should not run");
    });

    const last = ctx.res.last!;
    expect(last.status).toBe(204);
    expect(last.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(last.headers.get("Access-Control-Allow-Methods")).toContain("PUT");
    expect(last.headers.get("Access-Control-Allow-Headers")).toBe("X-Custom");
    expect(last.headers.get("Access-Control-Max-Age")).toBe("600");
  });

  it("omits headers when origin is not allowed", async () => {
    const ctx = createContext({
      method: "GET",
      headers: { Origin: "http://blocked.test" },
    });

    let nextCalled = false;
    await cors({ origin: "http://allowed.test" })(ctx, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(ctx.req.locals.__corsHeaders).toBeUndefined();
  });
});
