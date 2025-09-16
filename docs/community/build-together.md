# Roadmap & Contributions

bunway is a community-powered experiment to build the Bun-native, all-in-one web toolkit we want to use. Think of this page as our shared map—and the invitation to help draw the next checkpoints.

## Philosophy: Bun-first, Battery-packed

- **Bun is the runtime.** Fetch, streams, crypto, testing—Bun already ships the toys, we just get to play with them.
- **Express vibes forever.** Familiar middleware ergonomics make Express expats feel at home on Bun.
- **All-in-one ambition.** We’re chasing a single package that covers routing, middleware, sessions, security, observability—the works.
- **Ship & tell.** Every feature rides out with TypeDoc, guides, and examples so the next explorer moves faster.

<div class="timeline">
  <div class="timeline__node">
    <span class="timeline__badge success">Phase 0 · shipped</span>
    <h3>Core MVP</h3>
    <p>Express vibes unlocked. bunway now wraps Bun’s Request/Response primitives with the essentials.</p>
    <ul>
      <li><code>WayRequest</code>, <code>WayResponse</code>, <code>WayContext</code></li>
      <li>Router verbs, params, sub-routers, middleware, 404 fallback</li>
      <li>Response finalizer merging middleware header bags</li>
      <li><code>bunway()</code> factory + <code>app.listen()</code></li>
      <li>Built-ins: <code>errorHandler</code>, <code>cors</code>, <code>json</code>, <code>urlencoded</code>, <code>text</code></li>
      <li>Bun test suite covering routes, errors, CORS, body limits</li>
    </ul>
  </div>
  <div class="timeline__node">
    <span class="timeline__badge">Phase 1</span>
    <h3>HTTP niceties & DX</h3>
    <p>Polish the experience. Cookies, headers, compression—because ergonomics matter.</p>
    <ul>
      <li>Cookie helpers (parse/set, signed cookies)</li>
      <li>Security headers (helmet-style middleware)</li>
      <li>Compression (gzip/br) via Bun APIs</li>
      <li>Static file serving with cache controls & etags</li>
      <li>Weak/strong ETag helpers for user responses</li>
      <li>Expanded docs & examples</li>
    </ul>
  </div>
  <div class="timeline__node">
    <span class="timeline__badge">Phase 2</span>
    <h3>Sessions & auth glue</h3>
    <p>Give bunway a memory—sessions, CSRF protection, auth helpers.</p>
    <ul>
      <li>Session middleware with pluggable stores (Memory, Redis)</li>
      <li>Session rotation helpers</li>
      <li>CSRF protection (token + cookie)</li>
      <li>Auth helpers for basic/JWT flows</li>
    </ul>
  </div>
  <div class="timeline__node">
    <span class="timeline__badge">Phase 3</span>
    <h3>Streaming & uploads</h3>
    <p>Let bunway flex its streaming muscles—multipart, SSE, websockets.</p>
    <ul>
      <li>Multipart/form-data streaming with limits & storage adapters</li>
      <li>File upload constraints (size, type filters)</li>
      <li>Server-Sent Events helper</li>
      <li>WebSocket routing sugar on top of <code>Bun.serve</code></li>
    </ul>
  </div>
  <div class="timeline__node">
    <span class="timeline__badge">Phase 4</span>
    <h3>QoS & protection</h3>
    <p>Keep the gates strong—rate limiting, timeouts, DoS guards.</p>
    <ul>
      <li>Rate limiting (Memory + Redis)</li>
      <li>Request timeouts/aborts + body size guards beyond <code>Content-Length</code></li>
      <li>Basic DoS protection (slowloris guards, header sanity checks)</li>
    </ul>
  </div>
  <div class="timeline__node">
    <span class="timeline__badge">Phase 5</span>
    <h3>Observability</h3>
    <p>See everything—logs, request IDs, metrics so we can brag about latency.</p>
    <ul>
      <li>Bun-native logger (morgan-style + structured output)</li>
      <li>Request IDs + trace propagation helpers</li>
      <li>Metrics endpoint (Prometheus) with histograms</li>
    </ul>
  </div>
</div>

## How to contribute

::: tip How to start
Pick a phase from the roadmap, open an issue to discuss approach, and prototype using Bun’s native APIs. We love rough proof-of-concepts—iterate together!
:::

1. **Pick a phase** – grab the milestone that sparks joy and open an issue/PR.
2. **Prototype** – hack on Bun’s primitives; keep it native, keep it lean.
3. **Test & document** – Bun tests + TypeDoc updates = future contributors thanking you.
4. **Collaborate** – riff in issues, review PRs, shape the roadmap together.

## Development workflow

```bash
bun install           # install deps
bun run test          # Bun test suite
bun run typecheck     # TypeScript check
bun run format        # Prettier
bun run docs          # TypeDoc API reference
bun run docs:dev      # VitePress docs site (development)
```

`npm run prepare:dist` builds the publishable package (`dist/`), ready for npm.

## Community promise

Bunway is the clubhouse for Bun devs chasing that Express nostalgia. We’re building the toolkit we want: fast, native, expressive, and delightfully bun-tastic.

Jump in. Share ideas. Iterate quickly. The more we contribute, the sweeter Bun-first programming gets.
