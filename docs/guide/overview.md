---
title: Overview
description: Discover bunWay’s mission to bring Express-style routing to Bun, its goals, current features, and the roadmap ahead.
---

# Overview

bunway is an experiment to bring Express-like ergonomics to Bun without sacrificing Bun’s native speed or Web-first APIs. The goal is simple: **give Bun developers an all-in-one routing toolkit** that feels familiar, requires no external polyfills, and scales from quick prototypes to serious services.

::: tip Who is bunway for?
If you love the feel of Express but want Bun’s speed and native APIs, bunway is for you. It’s the nostalgic routing experience—rebuilt for Bun.
:::

## Goals

- **Stay Bun-native** – every feature builds on Bun’s Fetch-compatible runtime (`Request`, `Response`, streams, `Bun.serve`).
- **Express vibes** – routes, middleware, and helpers should feel comfortable to anyone coming from Express.
- **Batteries included** – ship practical middleware (body parsing, CORS, error handling) and keep extending the toolkit as the community grows.
- **Composable** – users can return native `Response` objects or use the convenience helpers; bunway does not hide the Fetch primitives.

## Current capabilities

Phase 0 (the current release) focuses on core ergonomics:

- `bunway()` factory → `app.listen()`
- Middleware chaining, sub-routers, and route handlers with `(ctx, next)` signature
- `WayRequest` and `WayResponse` helpers for parameters, body parsing, locals, JSON/text helpers, etc.
- Built-in middleware: `json()`, `urlencoded()`, `text()`, `cors()`, `errorHandler()`
- Router finalizer that merges middleware headers onto raw `Response` values
- Thorough Bun test suite covering routes, error paths, CORS behaviour, and body limits

## What’s next?

::: tip Phase-based development
We plan bunway in phases so contributors can focus on a slice of the ecosystem without losing sight of the bigger vision. Pick the phase that excites you most!
:::

bunway is intentionally iterative. We have a public roadmap that sketches future phases:

1. **HTTP niceties & DX** – cookies, security headers, compression, static files, ETags.
2. **Sessions & auth glue** – session middleware, CSRF protection, auth helpers.
3. **Streaming & uploads** – multipart parsing, file limits, SSE helpers, WebSocket sugar.
4. **QoS & protection** – rate limiting, request timeouts, slowloris guards.
5. **Observability** – logging, request IDs, Prometheus metrics.

See [Roadmap & Contributions](../community/build-together.md) for detailed ideas. Contributions are welcome at every stage.

## Philosophy

- **Bun-first, all-in-one**: If Bun ships it, we embrace it. No Node polyfills—let’s prove Bun can handle the full stack.
- **Community-led**: This project exists because we wanted a Bun-native alternative. Help define what “all-in-one” means.
- **Transparent APIs**: bunway’s public types are documented via TypeDoc. Browse the [API Reference](/api/index.html) for specifics.

Ready to build? Continue with [Getting Started](getting-started.md).
