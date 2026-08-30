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
