---
title: Middleware Overview
description: Browse bunWay’s built-in Bun-native middleware for body parsing, CORS, and error handling, plus tips for creating your own helpers.
---

# Middleware Overview

bunway ships a set of Bun-native middleware helpers to cover common HTTP needs. Each helper mirrors Express-style APIs while staying close to Bun’s Fetch primitives.

- [Body Parsing](body-parsing.md) – JSON, urlencoded, and text helpers built on top of `WayRequest`.
- [CORS](cors.md) – fine-grained origin policies with automatic header merging.
- [Error Handling](error-handler.md) – catch-all middleware that logs and formats errors.

You can always create your own middleware—just follow the `(ctx, next)` signature. bunway keeps `ctx.req` and `ctx.res` open so native Bun `Request`/`Response` APIs remain available.

::: tip Need another helper?
Have an idea for middleware we should bundle (cookies, sessions, compression)? Open an issue or PR on GitHub and help us expand the toolkit.
:::
