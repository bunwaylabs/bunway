/**
 * Shared configuration objects for bunWay's body parsing helpers.
 *
 * Applications may import these helpers to tailor body parsing globally.
 *
 * Example:
 * ```ts
 * const router = new Router({
 *   bodyParser: resolveBodyParserOptions({ text: { enabled: true } }),
 * });
 * ```
 */

export type TypeMatcher = string | RegExp | ((contentType: string) => boolean);

interface BaseParserOptions {
  limit?: number;
  type?: TypeMatcher;
  enabled?: boolean;
}

export interface JsonParserOptions extends BaseParserOptions {}

export interface UrlencodedParserOptions extends BaseParserOptions {}

export interface TextParserOptions extends BaseParserOptions {}

export interface BodyParserOptions {
  json?: JsonParserOptions;
  urlencoded?: UrlencodedParserOptions;
  text?: TextParserOptions;
}

export interface ResolvedBodyParserOptions {
  json: Required<JsonParserOptions>;
  urlencoded: Required<UrlencodedParserOptions>;
  text: Required<TextParserOptions>;
}

export const DEFAULT_BODY_LIMIT = 1024 * 1024;

export const DEFAULT_BODY_PARSER_OPTIONS: ResolvedBodyParserOptions = {
  json: {
    enabled: true,
    limit: DEFAULT_BODY_LIMIT,
    type: "application/json",
  },
  urlencoded: {
    enabled: false,
    limit: DEFAULT_BODY_LIMIT,
    type: "application/x-www-form-urlencoded",
  },
  text: {
    enabled: false,
    limit: DEFAULT_BODY_LIMIT,
    type: "text/plain",
  },
};

export function resolveBodyParserOptions(
  overrides?: BodyParserOptions,
  base: ResolvedBodyParserOptions = DEFAULT_BODY_PARSER_OPTIONS
): ResolvedBodyParserOptions {
  return {
    json: {
      enabled: overrides?.json?.enabled ?? base.json.enabled,
      limit: overrides?.json?.limit ?? base.json.limit,
      type: overrides?.json?.type ?? base.json.type,
    },
    urlencoded: {
      enabled: overrides?.urlencoded?.enabled ?? base.urlencoded.enabled,
      limit: overrides?.urlencoded?.limit ?? base.urlencoded.limit,
      type: overrides?.urlencoded?.type ?? base.urlencoded.type,
    },
    text: {
      enabled: overrides?.text?.enabled ?? base.text.enabled,
      limit: overrides?.text?.limit ?? base.text.limit,
      type: overrides?.text?.type ?? base.text.type,
    },
  };
}
