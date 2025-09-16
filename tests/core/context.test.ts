import { describe, it, expect } from "bun:test";
import { WayRequest, WayResponse } from "../../src/core/context";
import { DEFAULT_BODY_PARSER_OPTIONS } from "../../src/config";
import { buildRequest, TEST_BASE_URL } from "../testUtils";

describe("WayRequest", () => {
  it("exposes params helpers similar to express", () => {
    const request = buildRequest("/users/42");
    const wayReq = new WayRequest(request);

    expect(wayReq.params).toEqual({});
    wayReq.params = { id: "42", extra: "yes" };
    expect(wayReq.params).toEqual({ id: "42", extra: "yes" });
    expect(wayReq.param("id")).toBe("42");
  });

  it("parses query, pathname, and search from the URL", () => {
    const request = buildRequest("/posts/1?draft=true");
    const wayReq = new WayRequest(request);

    expect(wayReq.url).toBe(`${TEST_BASE_URL}/posts/1?draft=true`);
    expect(wayReq.path).toBe("/posts/1");
    expect(wayReq.pathname).toBe("/posts/1");
    expect(wayReq.search).toBe("?draft=true");
    expect(wayReq.query.get("draft")).toBe("true");
  });

  it("automatically parses JSON bodies respecting overrides", async () => {
    const body = JSON.stringify({ hello: "world" });
    const req = buildRequest("/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const wayReq = new WayRequest(req);
    const parsed = await wayReq.parseBody();
    expect(parsed).toEqual({ hello: "world" });
    expect(wayReq.bodyType).toBe("json");

    // ensure cached result returned on subsequent calls
    const again = await wayReq.parseBody();
    expect(again).toEqual({ hello: "world" });
  });

  it("honors per-request overrides when parsing", async () => {
    const req = buildRequest("/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const wayReq = new WayRequest(req);
    // disable json parsing to fall back to text
    wayReq.applyBodyParserOverrides({
      json: { enabled: false },
      text: { enabled: true },
    });

    const parsed = await wayReq.parseBody();
    expect(parsed).toBe("not-json");
    expect(wayReq.bodyType).toBe("text");
  });

  it("produces payload too large errors when exceeding limit", async () => {
    const req = buildRequest("/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ huge: "payload" }),
    });

    const wayReq = new WayRequest(req, {
      ...DEFAULT_BODY_PARSER_OPTIONS,
      json: { ...DEFAULT_BODY_PARSER_OPTIONS.json, limit: 5 },
    });

    const parsed = await wayReq.parseBody();
    expect(parsed).toBeNull();
    expect(wayReq.bodyParseError).toEqual({
      status: 413,
      message: "Payload Too Large",
    });
  });
});

describe("WayResponse", () => {
  it("builds JSON responses and tracks status", async () => {
    const res = new WayResponse();
    res.status(201);
    const response = res.json({ ok: true });
    expect(res.statusCode).toBe(201);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ ok: true });
    expect(res.last).toBe(response);
  });

  it("supports text and send helpers", async () => {
    const res = new WayResponse();
    const textRes = res.text("hello");
    expect(await textRes.text()).toBe("hello");

    const sendRes = res.send("raw");
    expect(await sendRes.text()).toBe("raw");
  });

  it("provides convenience status helpers", async () => {
    const res = new WayResponse();
    const ok = res.ok({ data: true });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ data: true });

    const created = res.created();
    expect(created.status).toBe(201);

    const noContent = res.noContent();
    expect(noContent.status).toBe(204);
    expect(await noContent.text()).toBe("");
  });
});
