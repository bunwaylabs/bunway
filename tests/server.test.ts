import { afterEach, describe, expect, it, vi } from "bun:test";
import { bunway, json } from "../src";
import { buildRequest } from "./testUtils";

describe("bunway app listen", () => {
  let serveSpy: ReturnType<typeof vi.spyOn> | null = null;

  afterEach(() => {
    serveSpy?.mockRestore();
    serveSpy = null;
  });

  it("delegates to Bun.serve with numeric port and callback", async () => {
    const app = bunway();
    app.get("/", (ctx) => ctx.res.text("ok"));

    let capturedOptions: Parameters<typeof Bun.serve>[0] | null = null;
    serveSpy = vi
      .spyOn(Bun, "serve")
      .mockImplementation((options: Parameters<typeof Bun.serve>[0]) => {
        capturedOptions = options;
        return { stop() {} } as any;
      });

    const onListen = vi.fn();
    const server = app.listen(4321, onListen);

    expect(onListen).toHaveBeenCalledTimes(1);
    expect(serveSpy).toHaveBeenCalledWith(expect.objectContaining({ port: 4321 }));
    expect(typeof capturedOptions?.fetch).toBe("function");

    const response = await capturedOptions!.fetch!(buildRequest("/"));
    expect(await response.text()).toBe("ok");

    server.stop();
  });

  it("supports listen options with hostname and default port", () => {
    const app = bunway();

    serveSpy = vi.spyOn(Bun, "serve").mockImplementation((options) => {
      return { stop() {} } as any;
    });

    const server = app.listen({ hostname: "0.0.0.0" });
    expect(serveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 7070,
        hostname: "0.0.0.0",
      })
    );
    server.stop();
  });
});

describe("bunway factory helpers", () => {
  it("re-exports middleware helpers directly", () => {
    expect(bunway.json).toBe(json);
  });

  it("applies per-request body parser overrides via bodyParser helper", async () => {
    const app = bunway();
    app.use(bunway.bodyParser({ json: { limit: 32 } }));
    app.post("/", async (ctx) => {
      await ctx.req.parseBody();
      return ctx.res.json({ ok: true });
    });

    const small = await app.handle(
      buildRequest("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 1 }),
      })
    );

    expect(small.status).toBe(200);

    const large = await app.handle(
      buildRequest("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ big: "x".repeat(64) }),
      })
    );

    expect(large.status).toBe(413);
    expect(await large.json()).toEqual({ error: "Payload Too Large" });
  });
});
