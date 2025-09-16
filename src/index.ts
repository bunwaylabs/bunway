/**
 * Public entry point re-exporting the bunWay factory, middleware, and types.
 */
import type { BodyParserOptions } from "./config";
import type { Handler } from "./core/router";
import {
  BunWayApp,
  bunway as createBunwayApp,
  BUNWAY_DEFAULT_PORT,
  type BunWayOptions,
} from "./server";
import { json, text, urlencoded } from "./middlewares/bodyParser";

interface BunwayFactory {
  (options?: BunWayOptions): BunWayApp;
  json: typeof json;
  urlencoded: typeof urlencoded;
  text: typeof text;
  bodyParser: (options?: BodyParserOptions) => Handler;
}

const bunwayFactory = ((options?: BunWayOptions) => createBunwayApp(options)) as BunwayFactory;

bunwayFactory.json = json;
bunwayFactory.urlencoded = urlencoded;
bunwayFactory.text = text;
bunwayFactory.bodyParser = (options?: BodyParserOptions): Handler => {
  return async (ctx, next) => {
    if (options) ctx.req.applyBodyParserOverrides(options);
    await next();
  };
};

/**
 * Factory function users import.
 *
 * Example usage:
 * ```ts
 * import { bunway } from "bunway";
 * const app = bunway();
 * app.get("/", (ctx) => ctx.res.text("OK"));
 * app.listen();
 * ```
 *
 * Middleware helpers (`json`, `urlencoded`, `text`, `bodyParser`) are available
 * as static properties mirroring Express' API.
 */
export const bunway = bunwayFactory;

// Core exports
export { BunWayApp, BUNWAY_DEFAULT_PORT } from "./server";
export { Router } from "./core/router";
export { WayContext, WayRequest, WayResponse } from "./core/context";
export { json, urlencoded, text } from "./middlewares/bodyParser";
export { cors } from "./middlewares/cors";
export { HttpError } from "./core/errors";
export { errorHandler } from "./middlewares/errorHandler";

// Types
export type { Handler } from "./core/router";
export type { BunWayOptions } from "./server";
export type { NextFunction } from "./core/context";
export type { BodyParserOptions } from "./config";
export type { HttpErrorOptions } from "./core/errors";
export type { ErrorHandlerOptions } from "./middlewares/errorHandler";
