# src/core - the pure zone

Everything here is a pure function: same input, same output, no side effects.

- **No I/O.** No `node:fs`, no `node:os`, no `node:path` reads, no network, no
  `process.env`. All of that belongs in `src/io/`. The one allowed runtime import is
  `node:crypto` in `hash.ts` (SHA-256 is deterministic).
- **No clock, no randomness.** Do not call `Date.now()` or `Math.random()` in core
  logic. Timestamps are passed in from the edges.
- **Deterministic and total.** Handle malformed/partial input by returning empty or
  safe defaults (`asObject`, `asArray` helpers), never by throwing on bad data.
- **Secret-safe by construction.** `collect.ts` must redact token/API-key values to a
  short hash marker before they enter `TrackedState`. Only the URL-valued env keys the
  rules inspect (`ANTHROPIC_BASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`) stay raw. If a new
  field could carry a secret, hash it.

The flow is `collect -> diff -> rules`. Keep each stage independently testable. Every
function here should have a direct unit test in `test/`.
