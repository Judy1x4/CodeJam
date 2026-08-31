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
