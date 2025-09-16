import { Router, type RouterOptions } from "./core/router";

/**
 * Default port for bunWay apps. Easy to remember, low collision.
 */
export const BUNWAY_DEFAULT_PORT = 7070;

/** Options controlling how the HTTP server is started. */
export interface ListenOptions {
  port?: number;
  hostname?: string;
}

/** Convenience alias for passing RouterOptions into bunway(). */
export interface BunWayOptions extends RouterOptions {}

/**
 * BunWayApp extends the Router with an Express-style .listen().
 * Usage:
 *   const app = bunway();
 *   app.get("/", (ctx) => ctx.res.text("OK"));
 *   app.listen(7070);
 */
export class BunWayApp extends Router {
  constructor(options?: BunWayOptions) {
    super(options);
  }

  /**
   * Start the HTTP server.
   * - listen(port)
   * - listen({ port, hostname })
   * - listen(port, onListen)
   * - listen(options, onListen)
   */
  listen(
    portOrOptions?: number | ListenOptions,
    onListen?: () => void
  ): ReturnType<typeof Bun.serve> {
    const port =
      typeof portOrOptions === "number"
        ? portOrOptions
        : (portOrOptions?.port ?? BUNWAY_DEFAULT_PORT);

    const hostname = typeof portOrOptions === "object" ? portOrOptions.hostname : undefined;

    const server = Bun.serve({
      port,
      hostname,
      fetch: (req: Request) => this.handle(req),
    });

    // Optional callback (Express-style)
    if (onListen) onListen();

    return server;
  }
}

/**
 * Factory to create a bunWay app (Express-style).
 */
export function bunway(options?: BunWayOptions): BunWayApp {
  return new BunWayApp(options);
}
