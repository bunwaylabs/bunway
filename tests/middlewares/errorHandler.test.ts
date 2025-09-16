import { describe, it, expect, vi } from "bun:test";
import { WayContext } from "../../src/core/context";
import { errorHandler } from "../../src/middlewares/errorHandler";
import { HttpError } from "../../src/core/errors";
import { buildRequest } from "../testUtils";

describe("errorHandler middleware", () => {
  const makeContext = () =>
    new WayContext(
      buildRequest("/test", {
        headers: { Accept: "application/json" },
      })
    );

  it("returns HttpError responses without logging", async () => {
    const ctx = makeContext();
    const logger = vi.fn();
    const handler = errorHandler({ logger });

    const response = await handler(ctx, async () => {
      throw new HttpError(404, "Missing");
    });

    if (!(response instanceof Response)) {
      throw new Error("Expected HttpError to produce a response");
    }
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Missing" });
    expect(logger).not.toHaveBeenCalled();
  });

  it("logs unexpected errors and returns 500", async () => {
    const ctx = makeContext();
    const logger = vi.fn();
    const handler = errorHandler({ logger });

    const response = await handler(ctx, async () => {
      throw new Error("Boom");
    });

    if (!(response instanceof Response)) {
      throw new Error("Expected generic error to produce a response");
    }
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
    expect(logger).toHaveBeenCalledTimes(1);
  });

  it("supports mapping errors before handling", async () => {
    const ctx = makeContext();
    const handler = errorHandler({
      map: (err) => {
        if (err instanceof TypeError) {
          return new HttpError(400, "Bad type");
        }
        return null;
      },
    });

    const response = await handler(ctx, async () => {
      throw new TypeError("Wrong");
    });

    if (!(response instanceof Response)) {
      throw new Error("Expected mapped error to produce a response");
    }
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Bad type" });
  });
});
