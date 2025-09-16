import type { Handler } from "../core/router";
import type { WayContext } from "../core/context";

/**
 * Bun-native CORS middleware compatible with bunWay's router finalizer.
 *
 * Usage:
 * ```ts
 * // Allow any localhost origin and send credentials
 * app.use(cors({ origin: (origin) => origin?.startsWith("http://localhost") ? origin : false, credentials: true }));
 *
 * // Simple allow-list
 * app.use(cors({ origin: ["https://app.example.com", /\.my-app\.com$/] }));
 * ```
 *
 * The middleware inspects the incoming Origin/Access-Control headers,
 * determines whether the request should be allowed, and records all response
 * headers so the router can apply them even if a handler returns a raw `Response`.
 */

const DEFAULT_METHODS = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"];
const DEFAULT_MAX_AGE = 600;

type OriginOptionFn = (origin: string | null, ctx: WayContext) => string | false;

type OriginOption = "*" | true | string | RegExp | (string | RegExp)[] | OriginOptionFn;

export interface CORSOptions {
  origin?: OriginOption;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  allowPrivateNetwork?: boolean;
}

type HeaderBag = Record<string, string>;

function ensureHeaderBag(ctx: WayContext): HeaderBag {
  const locals = ctx.req.locals as Record<string, any>;
  if (!locals.__corsHeaders) {
    locals.__corsHeaders = {} satisfies HeaderBag;
  }
  return locals.__corsHeaders as HeaderBag;
}

function setHeader(ctx: WayContext, bag: HeaderBag, name: string, value: string) {
  // Persist for router finalizer + set immediately on ctx.res
  bag[name] = value;
  ctx.res.header(name, value);
}

function appendVary(ctx: WayContext, bag: HeaderBag, value: string) {
  const existing = bag["Vary"];
  const seen = new Set<string>();
  if (existing) {
    for (const part of existing.split(",")) {
      const trimmed = part.trim();
      if (trimmed) seen.add(trimmed);
    }
  }
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
  }
  setHeader(ctx, bag, "Vary", Array.from(seen).join(", "));
}

function matchPattern(origin: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") {
    return origin === pattern;
  }
  return pattern.test(origin);
}

function resolveOrigin(
  requestOrigin: string,
  ctx: WayContext,
  originOption: OriginOption,
  credentials: boolean
): string | null {
  if (originOption === "*" || originOption === undefined) {
    return credentials ? requestOrigin : "*";
  }

  if (originOption === true) {
    return requestOrigin;
  }

  if (typeof originOption === "string") {
    return matchPattern(requestOrigin, originOption) ? requestOrigin : null;
  }

  if (originOption instanceof RegExp) {
    return originOption.test(requestOrigin) ? requestOrigin : null;
  }

  if (Array.isArray(originOption)) {
    for (const entry of originOption) {
      if (typeof entry === "string" || entry instanceof RegExp) {
        if (matchPattern(requestOrigin, entry)) return requestOrigin;
      }
    }
    return null;
  }

  if (typeof originOption === "function") {
    const result = originOption(requestOrigin, ctx);
    if (result === false || result === null || result === undefined) {
      return null;
    }
    if (result === "*") {
      return credentials ? requestOrigin : "*";
    }
    return result;
  }

  return null;
}

function formatHeaderList(values: string[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values.join(", ");
}

/** Create a CORS middleware instance for the given policy options. */
export function cors(options: CORSOptions = {}): Handler {
  const {
    origin: originOption = "*",
    methods = DEFAULT_METHODS,
    allowedHeaders,
    exposedHeaders,
    credentials = false,
    maxAge = DEFAULT_MAX_AGE,
    allowPrivateNetwork = false,
  } = options;

  const methodsHeader = formatHeaderList(methods) ?? DEFAULT_METHODS.join(", ");
  const allowedHeadersHeader = formatHeaderList(allowedHeaders);
  const exposedHeadersHeader = formatHeaderList(exposedHeaders);

  return async (ctx, next) => {
    const requestOrigin = ctx.req.headers.get("Origin");
    if (!requestOrigin) {
      await next();
      return;
    }

    const method = ctx.req.method.toUpperCase();
    const isPreflight =
      method === "OPTIONS" && ctx.req.headers.has("Access-Control-Request-Method");

    const resolvedOrigin = resolveOrigin(requestOrigin, ctx, originOption, credentials);

    if (!resolvedOrigin) {
      // No headers set; allow the request chain to handle the request.
      await next();
      return;
    }

    const bag = ensureHeaderBag(ctx);
    appendVary(ctx, bag, "Origin");

    if (isPreflight) {
      appendVary(ctx, bag, "Access-Control-Request-Headers");
      appendVary(ctx, bag, "Access-Control-Request-Method");
      setHeader(ctx, bag, "Access-Control-Allow-Origin", resolvedOrigin);
      if (credentials) {
        setHeader(ctx, bag, "Access-Control-Allow-Credentials", "true");
      }
      setHeader(ctx, bag, "Access-Control-Allow-Methods", methodsHeader);
      if (allowedHeadersHeader) {
        setHeader(ctx, bag, "Access-Control-Allow-Headers", allowedHeadersHeader);
      } else {
        const requestedHeaders = ctx.req.headers.get("Access-Control-Request-Headers");
        if (requestedHeaders) {
          setHeader(ctx, bag, "Access-Control-Allow-Headers", requestedHeaders);
        }
      }
      setHeader(ctx, bag, "Access-Control-Max-Age", String(maxAge));

      if (
        allowPrivateNetwork &&
        ctx.req.headers.get("Access-Control-Request-Private-Network") === "true"
      ) {
        setHeader(ctx, bag, "Access-Control-Allow-Private-Network", "true");
      }

      ctx.res.status(204);
      ctx.res.send("");
      return;
    }

    setHeader(ctx, bag, "Access-Control-Allow-Origin", resolvedOrigin);
    if (credentials) {
      setHeader(ctx, bag, "Access-Control-Allow-Credentials", "true");
    }
    if (exposedHeadersHeader) {
      setHeader(ctx, bag, "Access-Control-Expose-Headers", exposedHeadersHeader);
    }

    await next();
  };
}
