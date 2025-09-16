import {
  DEFAULT_BODY_LIMIT,
  type JsonParserOptions,
  type ResolvedBodyParserOptions,
  type TextParserOptions,
  type UrlencodedParserOptions,
} from "../config";
import type { Handler } from "../core/router";

/**
 * Body parsing middleware helpers.
 *
 * Usage:
 * ```ts
 * app.use(json());
 * app.use(urlencoded());
 * app.use(text());
 * ```
 *
 * These mimic the classic Express helpers but work with Bun's Request/Response
 * primitives. Each helper attempts to parse the body, stores the result on
 * `ctx.req.body`, and advances the middleware chain.
 *
 * To adjust limits or accepted types:
 * ```ts
 * app.use(json({ limit: 2 * 1024 * 1024 }));
 * app.use(urlencoded({ type: /application\/(json|x-www-form-urlencoded)/ }));
 * ```
 */

/** If parsing threw an error earlier, surface it as JSON and stop the chain. */
function respondIfError(ctx: Parameters<Handler>[0]): Response | void {
  if (!ctx.req.bodyParseError) return;
  return ctx.res
    .status(ctx.req.bodyParseError.status)
    .json({ error: ctx.req.bodyParseError.message });
}

/**
 * Parse `application/json` requests.
 *
 * ```ts
 * app.use(json());
 * app.use(json({ limit: 2 * 1024 * 1024, type: [/json$/, "application/vnd.api+json"] }));
 * ```
 */
export function json(options: JsonParserOptions = {}): Handler {
  return async (ctx, next) => {
    if (ctx.req.isBodyParsed()) {
      await next();
      return;
    }

    const handled = await ctx.req.tryParseJson({
      enabled: true,
      limit: options.limit ?? DEFAULT_BODY_LIMIT,
      type: options.type ?? "application/json",
    });

    if (!handled) {
      await next();
      return;
    }

    const errorResponse = respondIfError(ctx);
    if (errorResponse) return errorResponse;

    await next();
  };
}

/**
 * Parse `application/x-www-form-urlencoded` bodies (HTML form submissions).
 *
 * ```ts
 * app.use(urlencoded());
 * app.use(urlencoded({ limit: 64 * 1024 }));
 * ```
 */
export function urlencoded(options: UrlencodedParserOptions = {}): Handler {
  return async (ctx, next) => {
    if (ctx.req.isBodyParsed()) {
      await next();
      return;
    }

    const handled = await ctx.req.tryParseUrlencoded({
      enabled: true,
      limit: options.limit ?? DEFAULT_BODY_LIMIT,
      type: options.type ?? "application/x-www-form-urlencoded",
    });

    if (!handled) {
      await next();
      return;
    }

    const errorResponse = respondIfError(ctx);
    if (errorResponse) return errorResponse;

    await next();
  };
}

/**
 * Parse plain text (`text/plain`) payloads.
 *
 * ```ts
 * app.use(text());
 * app.use(text({ type: /text\/(plain|csv)/ }));
 * ```
 */
export function text(options: TextParserOptions = {}): Handler {
  return async (ctx, next) => {
    if (ctx.req.isBodyParsed()) {
      await next();
      return;
    }

    const handled = await ctx.req.tryParseText({
      enabled: true,
      limit: options.limit ?? DEFAULT_BODY_LIMIT,
      type: options.type ?? "text/plain",
    });

    if (!handled) {
      await next();
      return;
    }

    const errorResponse = respondIfError(ctx);
    if (errorResponse) return errorResponse;

    await next();
  };
}

/**
 * Automatically parse the request body using the per-request configuration.
 * Used internally by the router to provide sensible defaults.
 */
export function createAutoBodyParser(
  resolveConfig?: (ctx: Parameters<Handler>[0]) => ResolvedBodyParserOptions
): Handler {
  return async (ctx, next) => {
    if (!ctx.req.isBodyParsed()) {
      const config = resolveConfig ? resolveConfig(ctx) : ctx.req.getBodyParserConfig();
      await ctx.req.autoParseBody(config);
      const errorResponse = respondIfError(ctx);
      if (errorResponse) return errorResponse;
    }
    await next();
  };
}
