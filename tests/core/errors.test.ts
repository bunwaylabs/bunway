import { describe, it, expect } from "bun:test";
import { WayContext } from "../../src/core/context";
import { HttpError, isHttpError, buildHttpErrorResponse } from "../../src/core/errors";
import { buildRequest } from "../testUtils";

describe("HttpError", () => {
  it("captures status, message, and headers", () => {
    const error = new HttpError(418, "I'm a teapot", {
      headers: { "X-Custom": "yes" },
    });

    expect(isHttpError(error)).toBe(true);
    expect(error.status).toBe(418);
    expect(error.headers["X-Custom"]).toBe("yes");
    expect(error.body).toEqual({ error: "I'm a teapot" });
  });

  it("renders JSON responses when requested", async () => {
    const ctx = new WayContext(
      buildRequest("/resource", {
        headers: { Accept: "application/json" },
      })
    );

    const error = new HttpError(400, "Bad input", {
      body: { message: "Bad input" },
      headers: { "X-Error-Code": "INVALID" },
    });

    const response = buildHttpErrorResponse(ctx, error);
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("X-Error-Code")).toBe("INVALID");
    expect(await response.json()).toEqual({ message: "Bad input" });
  });

  it("falls back to text when JSON is not preferred", async () => {
    const ctx = new WayContext(
      buildRequest("/resource", {
        headers: { Accept: "text/plain" },
      })
    );

    const response = buildHttpErrorResponse(ctx, new HttpError(500));
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(await response.text()).toContain("HTTP 500");
  });
});
