export const TEST_BASE_URL = "http://localhost:7070";
export const TEST_ORIGIN = "http://localhost:3000";

export function buildRequest(
  path: string,
  init: RequestInit = {},
  baseUrl: string = TEST_BASE_URL
): Request {
  const url = new URL(path, baseUrl).toString();
  return new Request(url, init);
}
