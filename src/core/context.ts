import type { BodyInit } from "bun";

import {
  DEFAULT_BODY_PARSER_OPTIONS,
  resolveBodyParserOptions,
  type BodyParserOptions,
  type ResolvedBodyParserOptions,
  type TypeMatcher,
} from "../config";

/**
 * Core request/response primitives used by bunWay and passed to every handler.
 *
 * Quick start:
 * ```ts
 * app.get("/users/:id", async (ctx) => {
 *   const id = ctx.req.param("id");
 *   const body = await ctx.req.parseBody();
 *   return ctx.res.json({ id, body });
 * });
 * ```
 *
 * {@link WayRequest} wraps Bun's {@link Request}, adding express-like helpers
 * such as `params`, `query`, `locals`, and body parsing utilities while keeping
 * the original streaming behaviour. {@link WayResponse} offers a small fluent
 * API around {@link Response} so you can build replies with `res.json()`,
 * `res.text()`, or `res.send()`. {@link WayContext} simply packages both for
 * ergonomic middleware composition.
 */

type ParsedBodyType = "json" | "urlencoded" | "text";

interface BodyParseErrorState {
  status: number;
  message: string;
}

function cloneResolved(config: ResolvedBodyParserOptions): ResolvedBodyParserOptions {
  return {
    json: { ...config.json },
    urlencoded: { ...config.urlencoded },
    text: { ...config.text },
  };
}

function matchesType(type: string, matcher: TypeMatcher | undefined, fallback: string): boolean {
  if (!type) return false;
  const check = matcher ?? fallback;
  if (typeof check === "string") return type.includes(check);
  if (check instanceof RegExp) return check.test(type);
  return check(type);
}

/**
 * Decorates the incoming {@link Request} with routing and parsing helpers.
 *
 * ```ts
 * app.post("/echo", async (ctx) => {
 *   const body = await ctx.req.parseBody();
 *   console.log(ctx.req.headers.get("content-type"));
 *   return ctx.res.json({ received: body });
 * });
 * ```
 */
export class WayRequest {
  private readonly originalRequest: Request;
  private readonly parsedUrl: URL;
  private readonly localsStore: Record<string, any> = {};
  private paramsStore: Record<string, string> = {};
  private bodyValue: any = null;

  private _rawBody: Uint8Array | null = null;
  private _rawText: string | null = null;
  private _bodyParsed = false;
  private _bodyType: ParsedBodyType | null = null;
  private _bodyParseError: BodyParseErrorState | null = null;
  private bodyParserDefaults: ResolvedBodyParserOptions;
  private bodyParserOverrides: BodyParserOptions | null = null;

  constructor(req: Request, parserConfig?: ResolvedBodyParserOptions) {
    this.originalRequest = req;
    this.parsedUrl = new URL(req.url);
    this.bodyParserDefaults = cloneResolved(parserConfig ?? DEFAULT_BODY_PARSER_OPTIONS);
  }

  get original(): Request {
    return this.originalRequest;
  }

  /** Snapshot of current route params (mutable on purpose for express parity). */
  get params(): Record<string, string> {
    return this.paramsStore;
  }

  /** Allows the router or middleware to replace params in one go. */
  set params(value: Record<string, string>) {
    this.paramsStore = value;
  }

  /** Convenience helper mirroring Express' `req.param(name)` lookup. */
  param(key: string): string | undefined {
    return this.paramsStore[key];
  }

  /** Fully-qualified request URL. */
  get url(): string {
    return this.parsedUrl.href;
  }

  /** Path segment (no query string). Equivalent to `new URL(req.url).pathname`. */
  get pathname(): string {
    return this.parsedUrl.pathname;
  }

  /** Alias for `pathname` for those used to Express' `req.path`. */
  get path(): string {
    return this.parsedUrl.pathname;
  }

  /** Raw query string portion (including leading `?`). */
  get search(): string {
    return this.parsedUrl.search;
  }

  /** Live {@link URLSearchParams} view of the request query. */
  get query(): URLSearchParams {
    return this.parsedUrl.searchParams;
  }

  /** Parsed body payload once a parser has run. */
  get body(): any {
    return this.bodyValue;
  }

  /** Shared per-request state bag useful for communication between middleware. */
  get locals(): Record<string, any> {
    return this.localsStore;
  }

  get method(): string {
    return this.original.method;
  }

  get headers(): Headers {
    return this.original.headers;
  }

  get bodyType(): ParsedBodyType | null {
    return this._bodyType;
  }

  get bodyParseError(): BodyParseErrorState | null {
    return this._bodyParseError;
  }

  /** True when a body parser (auto or manual) already produced a result. */
  isBodyParsed(): boolean {
    return this._bodyParsed;
  }

  /** Merge caller-provided overrides with the request-scoped defaults. */
  applyBodyParserOverrides(overrides: BodyParserOptions): void {
    if (!this.bodyParserOverrides) {
      this.bodyParserOverrides = { ...overrides };
      return;
    }

    this.bodyParserOverrides = {
      json: { ...this.bodyParserOverrides.json, ...overrides.json },
      urlencoded: {
        ...this.bodyParserOverrides.urlencoded,
        ...overrides.urlencoded,
      },
      text: { ...this.bodyParserOverrides.text, ...overrides.text },
    };
  }

  getBodyParserConfig(): ResolvedBodyParserOptions {
    if (!this.bodyParserOverrides) return this.bodyParserDefaults;
    return resolveBodyParserOptions(this.bodyParserOverrides, this.bodyParserDefaults);
  }

  /**
   * Persist successful parsing state. Called by the individual parser helpers.
   */
  setParsedBody(value: any, type: ParsedBodyType): void {
    this.bodyValue = value;
    this._bodyParsed = true;
    this._bodyType = type;
    this._bodyParseError = null;
  }

  setBodyParseError(status: number, message: string): void {
    this.bodyValue = null;
    this._bodyParsed = true;
    this._bodyParseError = { status, message };
  }

  /** Lazy-load the request body as bytes. Cached so multiple calls are cheap. */
  async rawBody(): Promise<Uint8Array> {
    if (!this._rawBody) {
      const buf = await this.original.arrayBuffer();
      this._rawBody = new Uint8Array(buf);
    }
    return this._rawBody;
  }

  async rawText(): Promise<string> {
    if (this._rawText !== null) return this._rawText;
    const decoder = new TextDecoder();
    this._rawText = decoder.decode(await this.rawBody());
    return this._rawText;
  }

  async tryParseJson(options: Required<ResolvedBodyParserOptions["json"]>): Promise<boolean> {
    const contentType = this.headers.get("content-type") || "";
    if (!matchesType(contentType, options.type, "application/json")) return false;

    const raw = await this.rawBody();
    if (raw.byteLength > options.limit) {
      this.setBodyParseError(413, "Payload Too Large");
      return true;
    }

    const text = await this.rawText();
    if (!text) {
      this.setParsedBody({}, "json");
      return true;
    }

    try {
      this.setParsedBody(JSON.parse(text), "json");
    } catch {
      this.setBodyParseError(400, "Invalid JSON");
    }
    return true;
  }

  async tryParseUrlencoded(
    options: Required<ResolvedBodyParserOptions["urlencoded"]>
  ): Promise<boolean> {
    const contentType = this.headers.get("content-type") || "";
    if (!matchesType(contentType, options.type, "application/x-www-form-urlencoded")) return false;

    const raw = await this.rawBody();
    if (raw.byteLength > options.limit) {
      this.setBodyParseError(413, "Payload Too Large");
      return true;
    }

    const text = await this.rawText();
    const params = new URLSearchParams(text);
    this.setParsedBody(Object.fromEntries(params.entries()), "urlencoded");
    return true;
  }

  async tryParseText(options: Required<ResolvedBodyParserOptions["text"]>): Promise<boolean> {
    const contentType = this.headers.get("content-type") || "";
    if (!matchesType(contentType, options.type, "text/plain")) return false;

    const raw = await this.rawBody();
    if (raw.byteLength > options.limit) {
      this.setBodyParseError(413, "Payload Too Large");
      return true;
    }

    this.setParsedBody(await this.rawText(), "text");
    return true;
  }

  async autoParseBody(config: ResolvedBodyParserOptions): Promise<void> {
    if (this._bodyParsed) return;
    if (config.json.enabled && (await this.tryParseJson(config.json))) return;
    if (config.urlencoded.enabled && (await this.tryParseUrlencoded(config.urlencoded))) return;
    if (config.text.enabled && (await this.tryParseText(config.text))) return;

    const contentType = this.headers.get("content-type") || "";
    if (config.json.enabled && contentType.includes("application/json")) {
      await this.tryParseJson({
        enabled: true,
        limit: config.json.limit,
        type: "application/json",
      });
      return;
    }

    if (config.urlencoded.enabled && contentType.includes("application/x-www-form-urlencoded")) {
      await this.tryParseUrlencoded({
        enabled: true,
        limit: config.urlencoded.limit,
        type: "application/x-www-form-urlencoded",
      });
      return;
    }

    if (config.text.enabled) {
      await this.tryParseText({
        enabled: true,
        limit: config.text.limit,
        type: () => true,
      });
    }
  }

  async parseBody(overrides?: BodyParserOptions): Promise<any> {
    if (this._bodyParsed) return this.bodyValue;

    const config = overrides
      ? resolveBodyParserOptions(overrides, this.getBodyParserConfig())
      : this.getBodyParserConfig();

    await this.autoParseBody(config);
    return this.bodyValue;
  }
}

/**
 * Fluent builder around {@link Response} for ergonomic reply construction.
 *
 * ```ts
 * return ctx.res.status(201).json({ created: true });
 * // or return ctx.res.ok({ created: true });
 * ```
 */
export class WayResponse {
  private _headers: Headers = new Headers();
  private _status: number = 200;
  private _last: Response | null = null;

  // Core
  status(code: number): this {
    this._status = code;
    return this;
  }

  /** Replace/append a header to the backing response state. */
  header(name: string, value: string): this {
    this._headers.set(name, value);
    return this;
  }

  /** Serialize data as JSON and return a Response. */
  json(data: any): Response {
    this._headers.set("Content-Type", "application/json");
    const res = new Response(JSON.stringify(data), {
      status: this._status,
      headers: this._headers,
    });
    this._last = res;
    return res;
  }

  /** Serialize data as plain text. */
  text(data: string): Response {
    this._headers.set("Content-Type", "text/plain");
    const res = new Response(data, {
      status: this._status,
      headers: this._headers,
    });
    this._last = res;
    return res;
  }

  /** Construct a Response using whatever body the caller supplies. */
  send(data: BodyInit): Response {
    const res = new Response(data, {
      status: this._status,
      headers: this._headers,
    });
    this._last = res;
    return res;
  }

  get statusCode(): number {
    return this._status;
  }

  get headers(): Headers {
    return this._headers;
  }

  /** Convenience 200 helper returning JSON when data is supplied. */
  ok(data?: any): Response {
    this._status = 200;
    return data !== undefined ? this.json(data) : this.send("");
  }

  /** HTTP 201 helper mirroring express' `res.created`. */
  created(data?: any): Response {
    this._status = 201;
    return data !== undefined ? this.json(data) : this.send("");
  }

  /** Respond with a 204 No Content. */
  noContent(): Response {
    this._status = 204;
    return this.send("");
  }

  // Access last built Response (when handler didn't return explicitly)
  get last(): Response | null {
    return this._last;
  }
}

export type NextFunction = () => Promise<void>;

/**
 * Container passed to every middleware/handler combining {@link WayRequest}
 * and {@link WayResponse}. Most apps interact with bunWay exclusively through
 * this object.
 *
 * ```ts
 * app.use(async (ctx, next) => {
 *   console.log(ctx.req.method, ctx.req.path);
 *   await next();
 * });
 * ```
 */
export class WayContext {
  readonly req: WayRequest;
  readonly res: WayResponse;

  /** Instantiate a context for the given request and optional body parser conf. */
  constructor(req: Request, options?: { bodyParser?: ResolvedBodyParserOptions }) {
    this.req = new WayRequest(req, options?.bodyParser);
    this.res = new WayResponse();
  }
}
