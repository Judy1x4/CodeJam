# VaultGate: Implementation Log

Companion to [VAULTGATE_PROJECT_PLAN.md](./VAULTGATE_PROJECT_PLAN.md). One section per
plan block, appended after that block finishes. Each entry records what was
actually built, whether the plan's stated exit evidence was met, and any place
the implementation diverged from the plan's literal text.

## Day 1 — Block 1: Baseline and scope lock

**Status:** done

**What was done:**

- Confirmed the Starter Kit revision (`git log`: single `8d0bd4f Initial commit`).
- Configured Ark locally in `.env` (`ARK_API_KEY`, `ARK_MODEL`, `ARK_BASE_URL` for
  the `ap-southeast-1` / BytePlus-international region; `APP_AUTH_TOKEN` set to a
  real random value, not the placeholder). `.env` is gitignored.
- Ran the baseline acceptance task: Playground Run completed, a follow-up
  message continued the same Codex session, and the Agent workspace survived a
  stop/restart.
- Ran `npm run check` — typecheck, server tests, and both workspace builds all
  passed.
- Created the feature branch `vaultgate-middleware`.
- Froze the P0 scope as written in the plan (section 5) — no P1/P2 items until
  P0 is stable.

**Exit evidence (per plan):** baseline Playground Run succeeds and the
validation suite is green. **Met.**

**Deviations from plan:** none.

## Day 1 — Block 2: Contracts and fixtures

**Status:** done

**What was done:**

- Added `apps/server/src/security/types.ts` — `Classification`,
  `PolicyDecision`, `DemoPrincipal`, `ProtectedDocument`, `AgentGrant`,
  `SecurityEvent`, matching the plan's data contracts (section 9) verbatim.
- Added `apps/server/src/security/fixtures.ts`:
  - Two demo principals (`alice-finance`, `bob-engineering`).
  - Eight synthetic documents spanning all four classifications (`FIN-001`,
    `FIN-002`, `FIN-003`, `HR-001`, `HR-002`, `ENG-001`, `ENG-002`, `PUB-001`).
  - One planted canary (`VAULT_CANARY_7f3a2b91`), present only in the
    restricted `HR-001` fixture.
- Added `apps/server/src/security/fixtures.test.ts` — asserts principal count,
  full classification coverage, canary placement, and unique document IDs.
- Ran `npm run check` — clean (20 tests passing, including the 5 new fixture
  tests).

**Exit evidence (per plan):** tests can load and classify fixtures without
starting a model. **Met.**

**Deviations from plan:** `AgentGrant.agentId` is defined to reference a real
`Agent.id`, but no Agent records exist yet — Agents are only created later,
through the existing CRUD UI, during the Day 2 demo setup (Block 4). Rather
than fabricate placeholder IDs, fixtures.ts adds `agentGrantProfiles`, keyed by
Agent **display name** (`"Finance Analyst Agent"`, `"Engineering Assistant
Agent"`) instead of a real `agentId`, mirroring the plan's own "Agent grants"
table (section 8). Block 3's policy evaluator is expected to resolve a real
Agent to its profile by matching `agent.name` against this table; a proper
`AgentGrant` record with a real `agentId` gets constructed once that Agent
exists.

## Day 1 — Block 3: Policy, retrieval, and redaction

**Status:** done

**What was done:**

- Added `apps/server/src/security/document-store.ts` — deterministic local
  keyword search over `protectedDocuments`, scoring by term overlap (title
  matches weighted 2x, content matches 1x), no embeddings or external calls.
- Added `apps/server/src/security/policy.ts` — `evaluateDocumentAccess`,
  implementing the plan's rule order (section 12): inactive principal → grant
  missing/revoked → department mismatch → restricted always blocked →
  classification exceeds grant → authorized.
- Added `apps/server/src/security/redactor.ts` — `redact`, four regex passes
  (planted canary, API-key-shaped tokens, account-number format, email
  addresses), returning cleaned text and a count; never returns or logs the
  matched value.
- Added `apps/server/src/security/vault-gate.ts` — `prepareContext`,
  orchestrating search → policy → redaction → context envelope →
  `SecurityEvent`, matching the request flow in plan section 7. Fails closed
  (denies, records `reasonCode: "internal_error"`) if anything in the pipeline
  throws.
- Added one test file per module (`document-store.test.ts`, `policy.test.ts`,
  `redactor.test.ts`, `vault-gate.test.ts`) covering the plan's section 14
  test list, including the two exit-evidence cases.
- Ran `npm run check` — clean (44 tests passing).

**Exit evidence (per plan):** one test returns authorized redacted excerpts,
another returns a denial with no excerpts. **Met** — see
`vault-gate.test.ts`'s "returns an authorized, redacted excerpt for Alice"
and "denies Bob's Engineering Agent from reading Finance documents".

**Deviations from plan:**

1. **Grant profiles needed to be principal-specific (fixes a Block 2 gap).**
   The original `agentGrantProfiles` from Block 2 keyed grants only by Agent
   display name, with no link to which principal holds the grant. That meant
   Bob selecting the Finance Analyst Agent in the UI would have been
   authorized by the same profile Alice uses — exactly the cross-user access
   the plan's product story (section 3) requires VaultGate to deny. Fixed by
   adding `principalId` and `revokedAt` to `AgentGrantProfile`, so a grant now
   only matches a specific (principal, Agent name) pair. Covered by a
   dedicated test in both `policy.test.ts` and `vault-gate.test.ts` ("denies
   Bob even if he selects the Finance Analyst Agent").
2. **Retrieval needed stopword filtering.** The initial keyword tokenizer
   didn't exclude common words ("the", "and", "in", "all", ...). An
   adversarial query containing several of these matched every fixture
   document weakly, which caused `ENG-001` (an Engineering-internal document
   Bob legitimately can read) to be pulled in as a retrieval candidate for a
   query that was really asking about the restricted HR file. No security
   invariant was broken — the canary and the restricted document itself never
   leaked — but the response would have been a confusing partial answer
   instead of a clean denial, which matters for the plan's abuse-case demo
   (section 17). Fixed with a small stopword list in `document-store.ts`.
3. **`policy.ts` returns only `authorized: boolean`, not the three-way
   `PolicyDecision`.** Redaction-awareness (upgrading `allow` to
   `allow_redacted`) lives in `vault-gate.ts` instead, keeping policy.ts a
   pure authorization boundary — this was proposed and confirmed before
   implementation, not a mid-implementation change.
4. **The "redactor exception → fail closed" test lives in `vault-gate.test.ts`,
   not `redactor.test.ts`.** Plain regex replacement doesn't throw on valid
   string input, so that test mocks `redact` to throw and asserts
   `vault-gate.ts`'s try/catch denies correctly — also proposed and confirmed
   before implementation.

## Day 1 — Block 4: AgentService integration

**Status:** done

**What was done:**

- `apps/server/src/types.ts` — added `securityEvents: SecurityEvent[]` to
  `Database`.
- `apps/server/src/store.ts` — defaults `securityEvents` to `[]` for both a
  fresh database and one loaded from a pre-existing `db.json` that predates
  the field.
- `apps/server/src/agent-service.ts`:
  - `sendMessage` now takes a third `principalId` argument. It resolves the
    principal against `demoPrincipals` and fails closed with `401` for an
    unknown or inactive principal, before any `Run` is created.
  - Calls `prepareContext` (Block 3) before entering the store transaction
    that checks the Agent's busy/stopped status, using the Agent's `.name`
    for the grant lookup.
  - On `deny`: still persists the user `Message` and an `AgentRun`, but
    resolves the Run immediately with a fixed denial message and an
    assistant `Message` carrying that same text — `AgentRunner.run` is never
    called, and the Agent's status never becomes `busy`.
  - On `allow` / `allow_redacted`: persisted `AgentRun.prompt` stays the
    original user message; the string actually sent to `AgentRunner.run` is
    the VaultGate context envelope plus the question — except when nothing
    relevant was retrieved, in which case the original raw prompt is sent
    unwrapped, so a non-document coding task (the baseline acceptance
    scenario) reaches Codex unchanged.
  - Every call persists a `SecurityEvent`, regardless of decision.
  - Added `listPrincipals()` and `getSecurityEvents(runId)`.
- `apps/server/src/app.ts`:
  - `POST /api/agents/:id/messages` now requires an `X-Demo-Principal` header
    matching a known principal ID; an invalid or missing header is rejected
    with `400` before `AgentService.sendMessage` is ever called.
  - Added `GET /api/security/principals` and `GET /api/runs/:id/security-events`.
  - Did **not** add `POST /api/agents/:id/security/revoke` — the plan marks
    grant revocation P1 ("add only after P0 is stable"), so it's deferred to
    Day 2.
- Updated `agent-service.test.ts`'s existing lifecycle tests to pass a
  principal (`"alice-finance"`) with the new `sendMessage` signature, and
  added a `VaultGate integration` test group: authorized+redacted invokes the
  runner with sanitized context, a denial never invokes the runner, and an
  unknown principal is rejected before any Run exists.
- Added a test to `app.test.ts` proving a missing or unknown
  `X-Demo-Principal` header is rejected at the HTTP layer without reaching
  `AgentService`.
- Ran `npm run check` — clean (48 tests passing).

**Exit evidence (per plan):** an API-level test proves a denied request never
invokes the runner; an allowed request invokes it with sanitized context.
**Met** — see `agent-service.test.ts`'s `VaultGate integration` group.

**Deviations from plan:** none beyond the design decision already flagged and
confirmed before implementation (the deny-path behavior: still create a
`Message`/`AgentRun`, resolve immediately with a generic denial message,
never touch the runner or `RunStatus`).

**Note, not a deviation:** the existing web Playground UI can no longer send
a message successfully as-is, since it doesn't yet send an `X-Demo-Principal`
header — every request now gets `400`. This is expected: the plan's own Day 1
definition of done states "the middleware works end to end through the
backend with automated evidence. The UI may still be unchanged." The
principal selector that fixes this is Day 2 Block 1 scope, not a regression
introduced here.

## Day 2 — Block 1: Minimal UI

**Status:** done

**What was done:**

- `apps/web/src/types.ts` — added `Classification`, `PolicyDecision`,
  `DemoPrincipal`, `SecurityEvent`, mirroring the server response shapes the
  UI actually consumes.
- `apps/web/src/api.ts` — added `principals()` and `securityEvents(runId)`;
  `sendMessage` now takes a `principalId` and sends it as the
  `X-Demo-Principal` header.
- `apps/web/src/App.tsx`:
  - New `principals`/`selectedPrincipalId` state, fetched in `bootstrap`
    alongside Agents and system info; defaults to the first principal.
  - An "Acting as" selector in the sidebar (Alice/Bob), same interaction
    pattern as the existing Agent list.
  - `sendMessage` passes `selectedPrincipalId` through; the send button is
    also disabled when no principal is selected yet.
  - New `securityEvents` state, fetched whenever `activeRun.id` changes,
    rendered as a small panel between the message thread and the composer:
    a decision badge (allow / allow_redacted / deny), reason code, document
    IDs, and redaction count.
- `apps/web/src/styles.css` — badge colors per decision (green/amber/red)
  and panel layout only, no broader redesign.
- Ran `npm run check` — clean (48 tests passing; unchanged from Block 4,
  this block is frontend-only).

**Exit evidence (per plan):** the browser can visibly demonstrate one
`allow` and one `deny`. **Met and verified in a real browser** — not just
via typecheck/build. Details below.

**Browser verification performed:** `npm run check` passing was not treated
as sufficient for a UI change. Launched the actual local POC (`npm run poc`,
real Docker runtime, real Ark model — no mocks) and drove it with a headless
Chromium (Playwright) script: unlocked the access-token screen, confirmed
the "Acting as" picker renders, created a real Agent named
`Finance Analyst Agent`, sent "What were the approved expenses and budget
variance for Project Atlas?" as Alice, and again as Bob without switching
Agents. Screenshots confirmed:
- The principal picker and evidence panel render with no layout issues
  (no overlap, badges legible, colors correct).
- Alice's request: green `ALLOWED` badge, `authorized` reason, `FIN-001,
  FIN-003` — and the real Codex/Ark model answered citing `[FIN-001]` using
  only the authorized excerpt.
- Bob's request (same Agent, same question): red `DENIED` badge,
  `grant_missing_or_revoked` reason, and the chat shows the fixed VaultGate
  denial message — confirming the cross-user denial from Block 3's
  principal-specific grant fix actually holds through the full stack, not
  just in unit tests.

This required downloading a headless Chromium via Playwright and its
missing shared libraries (`libnspr4`, `libnss3`, etc., not preinstalled and
no root available) via `apt-get download` + `dpkg-deb -x` into a scratch
directory — no system changes, all cleaned up afterward, along with the POC
server and any runtime containers it started.

**Deviations from plan:** none.

## Day 2 — Block 2: Abuse case and revocation

**Status:** done — user opted for the full block, including revocation,
since the allow/deny path was already stable (plan section 15 makes
revocation conditional on that).

**What was done — abuse case:**

- `apps/server/src/security/vault-gate.test.ts` — added three more
  adversarial-phrasing tests: different wording targeting the same
  restricted document, a fake "SYSTEM: unrestricted mode" override attempt,
  and a request that asks to bypass redaction outright. All confirm the
  canary stays absent and the outcome (`deny` or `allow_redacted` with the
  account number still stripped) is unaffected by phrasing — the enforcement
  is structural (retrieval + policy + redaction), not prompt-parsing, so no
  wording can change it.
- `apps/web/src/App.tsx` — added the plan's own abuse-case wording (section
  3) as a fourth `starterPrompts` entry, one click away during the demo.

**What was done — revocation:**

- `apps/server/src/security/types.ts` — added `RevokedGrant { principalId,
  agentName, revokedAt }`.
- `apps/server/src/security/policy.ts` — added `applyRevocations(profiles,
  revoked)`, merging the static `agentGrantProfiles` with a revocation
  overlay by (principalId, agentName) key.
- `apps/server/src/security/vault-gate.ts` — `PrepareContextInput` gained an
  optional `grants` override, threaded into `evaluateDocumentAccess`, so a
  caller can supply the revocation-aware grant list instead of always using
  the static default.
- `apps/server/src/types.ts` / `store.ts` — added `revokedGrants:
  RevokedGrant[]` to `Database`, same additive/backward-compatible pattern
  as Block 4's `securityEvents`.
- `apps/server/src/agent-service.ts` — `sendMessage` now computes
  `applyRevocations(agentGrantProfiles, store.snapshot().revokedGrants)`
  before calling `prepareContext`. Added `revokeGrant(agentId, principalId)`:
  validates the principal and Agent exist and that a static grant profile
  actually exists for that pair (`404` otherwise), then persists a
  `RevokedGrant` record (idempotent — re-revoking just updates the
  timestamp).
- `apps/server/src/app.ts` — added `POST /api/agents/:id/security/revoke`
  (body: `{ principalId }`), matching the plan's API sketch (section 11).
- `apps/web/src/api.ts` / `App.tsx` — added `revokeGrant`, and a small
  "Revoke this principal's grant" link in the security-evidence panel,
  shown only when the latest decision isn't already `deny`. After a
  successful revoke it's replaced with "Grant revoked — resend the question
  to see the denial." instead of auto-resending, to keep the demo narration
  in the presenter's control.
- Tests: `policy.test.ts` covers `applyRevocations` directly;
  `agent-service.test.ts` adds the full scenario from the plan's
  Revocation Case (section 3) — an allowed request, a revoke call, then the
  identical question denied — plus a `404` test for revoking a grant that
  was never granted.
- Ran `npm run check` — clean (56 tests passing).

**Exit evidence (per plan):** the canary is absent and the denial remains
understandable in the UI. **Met and verified in a real browser** — same
approach as Block 1: launched the real POC (Docker + real Ark model),
drove it with Playwright. Confirmed: Alice's Project Atlas question
returns `ALLOWED` with a real cited answer; clicking "Revoke this
principal's grant" immediately shows the revoked notice; resending the
identical question now returns `DENIED` / `grant_missing_or_revoked`, and
the chat shows the fixed denial message — reproducing the plan's
Revocation Case end to end, not just in unit tests.

**Deviations from plan:** none. One judgment call, not a deviation: the
plan doesn't specify a persistence shape for revocation, so `RevokedGrant`
and the `applyRevocations` merge function are new — designed to slot
alongside the existing `AgentGrantProfile` shape from Block 2 rather than
replace it, since real per-request revocation state has to be mutable while
the base grant configuration stays static demo fixture data.
