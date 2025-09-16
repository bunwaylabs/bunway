import { describe, it, expect } from "bun:test";
import { bunway, cors, errorHandler, HttpError } from "../../src";
import { buildRequest, TEST_ORIGIN } from "../testUtils";

describe("integration", () => {
  it("handles json bodies and applies CORS headers", async () => {
    const app = bunway();
    app.use(cors({ origin: true }));
    app.use(errorHandler());
    app.post("/echo", async (ctx) => {
      const body = await ctx.req.parseBody();
      return ctx.res.json({ body });
    });

    const response = await app.handle(
      buildRequest("/echo", {
        method: "POST",
        headers: {
          Origin: TEST_ORIGIN,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ body: { hello: "world" } });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(TEST_ORIGIN);
  });

  it("merges CORS headers when handler returns a raw Response", async () => {
    const app = bunway();
    app.use(cors({ origin: TEST_ORIGIN }));
    app.use(errorHandler());
    app.get("/raw", () => {
      return new Response("raw body", { status: 202 });
    });

    const res = await app.handle(
      buildRequest("/raw", {
        headers: { Origin: TEST_ORIGIN },
      })
    );

    expect(res.status).toBe(202);
    expect(await res.text()).toBe("raw body");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(TEST_ORIGIN);
  });

  it("formats HttpError responses via errorHandler", async () => {
    const app = bunway();
    app.use(cors({ origin: true }));
    app.use(errorHandler());
    app.get("/missing", () => {
      throw new HttpError(404, "Not found");
    });

    const res = await app.handle(
      buildRequest("/missing", {
        headers: { Origin: TEST_ORIGIN, Accept: "application/json" },
      })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(TEST_ORIGIN);
  });
});
