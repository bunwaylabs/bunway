import { buildHttpErrorResponse, HttpError, isHttpError } from "../core/errors";
import type { WayContext } from "../core/context";
import type { Handler } from "../core/router";

/**
 * Catch-all error handler middleware.
 *
 * Designed to be placed at the end of the global middleware chain to ensure
 * any thrown errors are logged (optionally) and converted into standard HTTP
 * responses. Works hand-in-hand with {@link HttpError} to provide precise status codes.
 *
 * Example:
 * ```ts
 * app.use(errorHandler({
 *   logger: console.error,
 *   map: (err) =>
 *     err instanceof SyntaxError ? new HttpError(400, "Invalid JSON") : null,
 * }));
 *
 * app.get("/secret", () => {
 *   throw new HttpError(403, "Forbidden");
 * });
 * ```
 */

export interface ErrorHandlerOptions {
  /** Optional logger invoked when an error bubbles up to the handler. */
  logger?: (error: unknown, ctx: WayContext) => void;
  /**
   * Allows converting arbitrary errors into {@link HttpError} instances before
   * they reach the catch-all branch. Return `null`/`undefined` to leave the
   * original error untouched.
   */
  map?: (error: unknown, ctx: WayContext) => HttpError | Error | null | undefined;
}

/** Create an error-handling middleware with optional logging and mapping. */
export function errorHandler(options: ErrorHandlerOptions = {}): Handler {
  const { logger, map } = options;

  return async (ctx, next) => {
    try {
      await next();
      return;
    } catch (err) {
      let handledError: unknown = err;

      if (map) {
        try {
          const mapped = map(err, ctx);
          if (mapped) {
            handledError = mapped;
          }
        } catch (mapError) {
          logger?.(mapError, ctx);
          handledError = err;
        }
      }

      if (handledError instanceof Response) {
        return handledError;
      }

      let httpError: HttpError;
      if (isHttpError(handledError)) {
        httpError = handledError;
      } else if (handledError instanceof Error) {
        if (logger) {
          try {
            logger(handledError, ctx);
          } catch {
            // ignore logger failures
          }
        }
        httpError = new HttpError(500, "Internal Server Error", {
          cause: handledError,
        });
      } else {
        if (logger) {
          try {
            logger(handledError, ctx);
          } catch {
            // ignore logger failures
          }
        }
        httpError = new HttpError(500, "Internal Server Error");
      }

      if (logger && httpError.status >= 500 && isHttpError(handledError)) {
        try {
          logger(handledError, ctx);
        } catch {
          // ignore logger failures
        }
      }

      return buildHttpErrorResponse(ctx, httpError);
    }
  };
}
