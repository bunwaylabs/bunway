import type { WayContext } from "./context";

/** Options bag for {@link HttpError}. */
export interface HttpErrorOptions {
  cause?: unknown;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Error helpers shared across bunWay.
 *
 * Example usage inside a route:
 * ```ts
 * app.get("/secret", () => {
 *   throw new HttpError(403, "Forbidden", {
 *     headers: { "X-Reason": "AUTH" },
 *     body: { error: "Forbidden" },
 *   });
 * });
 * ```
 *
 * The router (or errorHandler middleware) catches the error, calls
 * {@link buildHttpErrorResponse}, and sends a properly typed response that
 * respects the client's `Accept` header.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body?: unknown;

  constructor(status: number, message?: string, options: HttpErrorOptions = {}) {
    const { cause, headers, body } = options;
    if (cause !== undefined) {
      super(message ?? `HTTP ${status}`, { cause });
    } else {
      super(message ?? `HTTP ${status}`);
    }
    this.name = "HttpError";
    this.status = status;
    this.headers = headers ? { ...headers } : {};
    if (body !== undefined) {
      this.body = body;
    } else if (message !== undefined) {
      this.body = { error: message };
    }
  }
}

/** Type guard to detect HttpError instances coming from user code. */
export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError;
}

function prefersJson(accept: string | null): boolean {
  if (!accept || accept === "*/*") return true;
  const values = accept.toLowerCase().split(",");
  for (const raw of values) {
    const media = raw.trim();
    if (!media) continue;
    if (media.includes("application/json") || media.includes("+json")) {
      return true;
    }
    if (media.includes("text/plain")) {
      return false;
    }
  }
  return accept.includes("*/*");
}

function normalizeBody(
  error: HttpError,
  prefersJsonResponse: boolean
): { body: unknown; contentType?: string } {
  if (error.body instanceof Response) {
    return { body: error.body.body ?? null, contentType: undefined };
  }

  if (typeof error.body === "string") {
    return { body: error.body, contentType: "text/plain" };
  }

  if (error.body !== undefined) {
    if (prefersJsonResponse) {
      try {
        return {
          body: JSON.stringify(error.body),
          contentType: "application/json",
        };
      } catch {
        return {
          body: String(error.body),
          contentType: "text/plain",
        };
      }
    }
    const fallback =
      typeof error.body === "object" && error.body !== null
        ? (error.message ?? `HTTP ${error.status}`)
        : String(error.body);
    return { body: fallback, contentType: "text/plain" };
  }

  const fallbackMessage = error.message ?? `HTTP ${error.status}`;
  if (prefersJsonResponse) {
    return {
      body: JSON.stringify({ error: fallbackMessage }),
      contentType: "application/json",
    };
  }
  return { body: fallbackMessage, contentType: "text/plain" };
}

/**
 * Convert an {@link HttpError} into a Bun/Fetch {@link Response}.
 * Automatically negotiates JSON vs text and ensures custom headers are applied.
 */
export function buildHttpErrorResponse(ctx: WayContext, error: HttpError): Response {
  if (error.body instanceof Response) {
    const base = error.body;
    const merged = new Headers(base.headers);
    for (const [key, value] of Object.entries(error.headers)) {
      merged.set(key, value);
    }
    return new Response(base.body, {
      status: error.status,
      headers: merged,
    });
  }

  const wantsJson = prefersJson(ctx.req.headers.get("accept"));
  const normalized = normalizeBody(error, wantsJson);
  const headers = new Headers(error.headers);
  const body = normalized.body as any;
  const contentType = normalized.contentType;
  if (contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", contentType);
  }
  return new Response(body, {
    status: error.status,
    headers,
  });
}
