import { createAutoBodyParser } from "../middlewares/bodyParser";
import {
  DEFAULT_BODY_PARSER_OPTIONS,
  resolveBodyParserOptions,
  type BodyParserOptions,
  type ResolvedBodyParserOptions,
} from "../config";
import { WayContext, type NextFunction } from "./context";
import { buildHttpErrorResponse, HttpError, isHttpError } from "./errors";

/**
 * Signature for bunWay middleware/handlers.
 * Matches express' `(ctx, next)` form but works with Fetch primitives.
 */
export type Handler = (
  ctx: WayContext,
  next: NextFunction
) => Promise<void | Response> | void | Response;

interface Route {
  method: string;
  path: string;
  regex: RegExp;
  keys: string[];
  handlers: Handler[];
}

interface SubRouter {
  prefix: string;
  router: Router;
}

/** Optional configuration supplied when instantiating a Router. */
export interface RouterOptions {
  bodyParser?: BodyParserOptions;
}

/**
 * BunWay router implementation.
 *
 * Usage mirrors Express:
 * ```ts
 * const router = new Router();
 * router.use(cors());
 * router.get("/health", (ctx) => ctx.res.text("OK"));
 * router.post("/users", async (ctx) => ctx.res.created(await ctx.req.parseBody()));
 * ```
 *
 * Internally the router still works with {@link Request}/{@link Response}, which
 * means handlers can choose to return a native Response or use `ctx.res` helpers.
 * Middleware-supplied extras (CORS headers, etc.) are merged in the finalizer so
 * behaviour stays consistent regardless of handler style.
 */
export class Router {
  private routes: Route[] = [];
  private children: SubRouter[] = [];
  private middlewares: Handler[] = []; // global middleware
  private bodyParserConfig: ResolvedBodyParserOptions;
  private autoBodyParser: Handler;

  constructor(options?: RouterOptions) {
    this.bodyParserConfig = resolveBodyParserOptions(
      options?.bodyParser,
      DEFAULT_BODY_PARSER_OPTIONS
    );
    this.autoBodyParser = createAutoBodyParser((ctx) => ctx.req.getBodyParserConfig());
  }

  // Route registration
  get(path: string, ...handlers: Handler[]) {
    this.add("GET", path, handlers);
  }
  post(path: string, ...handlers: Handler[]) {
    this.add("POST", path, handlers);
  }
  put(path: string, ...handlers: Handler[]) {
    this.add("PUT", path, handlers);
  }
  delete(path: string, ...handlers: Handler[]) {
    this.add("DELETE", path, handlers);
  }
  patch(path: string, ...handlers: Handler[]) {
    this.add("PATCH", path, handlers);
  }
  options(path: string, ...handlers: Handler[]) {
    this.add("OPTIONS", path, handlers);
  }

  // Overloaded use(): global middleware OR sub-router
  use(handler: Handler): void;
  use(prefix: string, router: Router): void;
  use(a: string | Handler, b?: Router): void {
    if (typeof a === "string" && b) {
      this.children.push({ prefix: a, router: b });
      return;
    }
    if (typeof a === "function") {
      this.middlewares.push(a);
      return;
    }
    throw new Error("Invalid use() signature");
  }

  setBodyParser(options: BodyParserOptions): void {
    this.bodyParserConfig = resolveBodyParserOptions(options, DEFAULT_BODY_PARSER_OPTIONS);
  }

  configureBodyParser(options: BodyParserOptions): void {
    this.bodyParserConfig = resolveBodyParserOptions(options, this.bodyParserConfig);
  }

  /** Snapshot of the current resolved parser configuration. */
  getBodyParserConfig(): ResolvedBodyParserOptions {
    return this.bodyParserConfig;
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const pathname = url.pathname;

    // 1) Sub-routers
    for (const { prefix, router } of this.children) {
      if (pathname.startsWith(prefix)) {
        const newUrl = new URL(req.url);
        newUrl.pathname = pathname.slice(prefix.length) || "/";
        const newReq = new Request(newUrl.toString(), req); // TS-safe
        return await router.handle(newReq);
      }
    }

    // 2) Match routes
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.regex.exec(pathname);
      if (!match) continue;

      // Params
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = match[i + 1]!;
      });

      // Context
      const ctx = new WayContext(req, { bodyParser: this.bodyParserConfig });
      ctx.req.params = params;

      // Pipeline: global middleware first, then route handlers
      // Compose middleware in the same order express does.
      const pipeline = [...this.middlewares, this.autoBodyParser, ...route.handlers];
      let idx = 0;
      let finalResponse: Response | null = null;

      const next: NextFunction = async () => {
        const handler = pipeline[idx++];
        if (!handler) return;

        const result = await handler(ctx, next);
        if (result instanceof Response) {
          finalResponse = result;
        }
      };

      try {
        await next();
      } catch (err) {
        const errorResponse = resolveRouterError(err, ctx);
        return finalizeResponse(ctx, errorResponse);
      }

      return finalizeResponse(ctx, finalResponse);
    }

    // 3) 404
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Internals
  private add(method: string, path: string, handlers: Handler[]) {
    const { regex, keys } = this.pathToRegex(path);
    this.routes.push({ method, path, regex, keys, handlers });
  }

  private pathToRegex(path: string): { regex: RegExp; keys: string[] } {
    const keys: string[] = [];
    const regexStr = path
      .replace(/\/:([^/]+)/g, (_: string, key: string) => {
        keys.push(key);
        return "/([^/]+)";
      })
      .replace(/\//g, "\\/");
    return { regex: new RegExp(`^${regexStr}$`), keys };
  }
}

/**
 * Applies final adjustments (like middleware supplied headers) to the
 * response that will ultimately be returned to Bun.
 */
function finalizeResponse(ctx: WayContext, explicit?: Response | null): Response {
  let response = explicit ?? ctx.res.last ?? new Response(null, { status: 200 });

  const extraHeaders = ctx.req.locals.__corsHeaders as Record<string, string> | undefined;
  if (extraHeaders && Object.keys(extraHeaders).length > 0) {
    const merged = new Headers(response.headers);
    for (const [key, value] of Object.entries(extraHeaders)) {
      merged.set(key, value);
    }
    response = new Response(response.body, {
      status: response.status,
      headers: merged,
    });
  }

  return response;
}

/**
 * Converts thrown values into user-friendly HTTP responses.
 * Prefers HttpError instances created by middleware/handlers but will fall
 * back to a generic 500 response for unexpected errors.
 */
function resolveRouterError(err: unknown, ctx: WayContext): Response {
  if (isHttpError(err)) {
    return buildHttpErrorResponse(ctx, err);
  }
  const error = err instanceof Error ? err : undefined;
  const httpError = new HttpError(500, "Internal Server Error", {
    cause: error,
  });
  return buildHttpErrorResponse(ctx, httpError);
}
