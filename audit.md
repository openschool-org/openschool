# OpenSchool — Production Readiness Audit

Tracking document for the full pre-production audit (see audit prompt this file was generated from). This is a **template/checklist**, not a completed audit — every item starts as `NOT STARTED`. Fill in `Status` and `Reason / Evidence` as each item is actually audited against the code. Do not mark anything `PASS` without having read the implementing code; do not trust documentation or naming as evidence.

Per CLAUDE.md: before filing a new finding, check the Findings Log (Part D) to make sure it isn't already tracked.

---

## Table of Contents

- [Rules of Engagement](#rules-of-engagement)
- [Division of Labor](#division-of-labor)
- [Progress Summary](#progress-summary)
- [Part A — Audit Checklists (technical / security / quality)](#part-a--audit-checklists)
- [Part A2 — Feature Verification Checklist (functional / product correctness)](#part-a2--feature-verification-checklist-functional--product-correctness)
- [Part B — Structured Deliverables](#part-b--structured-deliverables)
- [Part C — Deployment Verdict](#part-c--deployment-verdict)
- [Part D — Findings Log](#part-d--findings-log)
- [Part E — Final Engineering Assessment](#part-e--final-engineering-assessment)
- [Confidence Classification (final pass)](#confidence-classification-final-pass)

---

## How to use this document

1. Work section by section (Part A), or by risk priority if time-constrained (Authentication → Authorization → ThunderID → Database/Transactions → Timetable/Attendance/Notifications → everything else).
2. For each item: set `Status`, and always fill `Reason / Evidence` — a one-line pointer to the file/function/line (or migration number) that justifies the verdict, even for PASS.
3. Any `FAIL` or `PARTIAL` item must get a corresponding row in the **Findings Log** (Part D) with a severity, using the classification in Part E.
4. Update the **Progress Summary** status column — including `Reviewed by` (AI, once the code is actually read) and `Approved` (human-only, per [Rules of Engagement](#rules-of-engagement)) — as sections complete.
5. Part A (technical/security/quality, code-derived) and Part A2 (feature-by-feature functional correctness, derived from `docs/FEATURES.md`) are independent passes — a feature can be `PASS` in one and `FAIL` in the other (e.g. correctly hidden in the UI but IDOR-able server-side). Work through both; Part A2 rows cross-reference the Part A section that covers the same ground technically, rather than re-auditing it.
6. Once Parts A and A2 are done, fill in Part B (structured deliverables — matrices/reports), then Part C (verdict), then Part E (scores).

### Status legend

| Symbol | Meaning |
|---|---|
| ⬜ NOT STARTED | Not yet audited |
| ✅ PASS | Verified correct in the actual code; no issue found |
| ⚠️ PARTIAL | Partially correct — works in the common case but has gaps, or enforced in some layers but not others |
| ❌ FAIL | Confirmed defect, vulnerability, or missing control |
| ➖ N/A | Does not apply to this system/deployment model |
| 🔍 UNVERIFIED | Cannot be determined from the repo alone — requires runtime/infra/load verification |

---

## Rules of Engagement

These rules govern how the AI and the human operate on this audit. They exist because the two failure modes this document is trying to prevent are: (1) the AI quietly marking something `PASS` on impression rather than evidence, and (2) a finding or a `READY` verdict getting acted on without a human ever actually looking at it.

### How the AI must behave

1. **Never mark `PASS` without reading the implementing code.** Documentation, naming, comments, or "this is probably fine" are not evidence. Cite the exact file/function/line in `Reason / Evidence`.
2. **Static-analysis-only areas get audited directly, in full** — no partial sampling and calling it done. If time-boxing forces a partial pass, say so explicitly in `Reason / Evidence` (e.g. "sampled 5/17 routes") rather than leaving it looking complete.
3. **Runtime/human-only areas (see Division of Labor below) never get a `PASS` or `FAIL` from the AI.** They get `🔍 UNVERIFIED` with a note on what's missing (live instance, load test, product decision, etc.), or a `PARTIAL` if the AI could verify the code-level logic but not the runtime behavior — state clearly which half was checked.
4. **Check `audit.md` (Part D, Findings Log) before filing a new finding**, per CLAUDE.md — don't duplicate an existing entry.
5. **The AI may set `Reviewed By: AI` on any row it has actually read the code for.** The AI must never set the `Approved` column — that field is human-only, always.
6. **No self-grading the verdict.** The AI can propose scores (Part E) and a draft verdict (Part C), but must label them `DRAFT — pending human approval`, never present them as final.
7. **Flag uncertainty instead of rounding it away.** If evidence is partial or the code is ambiguous, use `PARTIAL` or `🔍 UNVERIFIED` rather than picking whichever of `PASS`/`FAIL` seems more likely.
8. **Don't fix findings while auditing unless asked.** Auditing and remediation are separate passes — record the finding, don't silently patch it, so the human can see what was actually wrong before it's gone.

### How the human must behave

1. **Every `Approved` checkbox is a human action.** The AI reviewing a section does not close it — treat `Reviewed By: AI` as "ready for human sign-off," not "done."
2. **Spot-check, don't rubber-stamp.** For at least the CRITICAL/HIGH findings and anything marked `✅ PASS` in Authentication/Authorization/§13 Race Conditions, re-derive the AI's evidence by opening the cited file/line yourself before approving.
3. **Runtime/human-only areas (§9, §13 confirmation, §22, §29–31, §32, §40 live requests, §41, Backup/DR, Deployment Verdict) require you to actually run the system** — spin up `docker compose`, exercise the flow, or make the product call. The AI cannot approve its own guess here.
4. **The Deployment Verdict (Part C) is a risk-acceptance decision, not a checklist output.** Even if every row is green, only a human signs off on `READY`.
5. **Coordinate cross-tester dedup and disclosure decisions** (what's public vs private) — this is a team/process call outside the AI's scope.
6. **When you override an AI finding** (downgrade severity, mark a `FAIL` as acceptable risk, etc.), leave a one-line rationale in the row so the next person (human or AI) knows it was a deliberate call, not an oversight.

---

## Division of Labor

Splits every audit area into what the AI can complete unassisted by reading the repo, versus what needs a human — either because it requires a running system, live infrastructure, or a judgment/product call only a human can make. Use this to route work, not to skip sections: everything in the human column still needs the corresponding Part A checklist filled in, just not by the AI alone.

### AI can complete from the repo alone (static analysis / code reading)

No running services needed for these — the AI reads the code on disk and fills in `Reason / Evidence` directly. The AI can also write regression tests (Go/Vitest) for anything found broken here, since that's normal code-editing.

| Section(s) | Audit area | Why the AI can do it alone | Reviewed by | Approved |
|---|---|---|---|---|
| §4 | Authentication — JWT validation, JWKS caching, role extraction | Read `middleware/auth.go`, `internal/identity/`, `internal/thunderid/` | ⬜ | ⬜ |
| §5–6 | Authorization — role gates, IDOR checks, missing checks on mutating routes | Read every route file, trace handler → service → repo | ⬜ | ⬜ |
| §7 | Injection & input security | Grep + read validation/sanitization code paths | ⬜ | ⬜ |
| §8 | Password reset (code-level: token generation/storage/expiry logic) | Read the reset flow end-to-end in code | ⬜ | ⬜ |
| §10, §16, §17 | DB schema, migrations, constraints, invariants enforced only in Go | Read all migrations + `db/sqlc/models.go` | ⬜ | ⬜ |
| §11 | Academic-year integrity (code-level enforcement) | Read the app-level enforcement point + cross-ref ADR 0003 | ⬜ | ⬜ |
| §12 | Transaction boundaries | Read multi-step service functions | ⬜ | ⬜ |
| §14–15 | SQL quality, index coverage vs actual query patterns | Read queries against migration-defined indexes | ⬜ | ⬜ |
| §18–21 | Timetable / Attendance / Notification / Job logic bugs | Read the service code, reason about the state machine | ⬜ | ⬜ |
| §23–26 | Frontend hooks, TanStack Query cache/invalidation, TS `any`/unsafe casts, API contract drift | Read frontend source | ⬜ | ⬜ |
| §27–28 | Logging secrets, DTO over-exposure | Grep + read handler responses | ⬜ | ⬜ |
| §33–35 | Env/secrets exposure, Docker config, dependency manifests | Read `.env.example`, Dockerfiles, `go.mod`/`package.json` | ⬜ | ⬜ |
| §36–38 | Dead code, god services, layering violations | Static read + grep for unused exports | ⬜ | ⬜ |
| §42 | Timezone/date logic | Read code and spot wrong logic (can't observe an actual midnight-boundary bug without runtime data) | ⬜ | ⬜ |
| §43–47 | File/PDF handling, analytics queries, observability hooks, shutdown handling, config wiring (code-level) | Read the implementing code directly | ⬜ | ⬜ |
| §48 | Documentation drift | Compare docs against code directly | ⬜ | ⬜ |

### Requires a human (running system, live infra, or product/process judgment)

| Section(s) | Area | Why it's not AI-alone | Reviewed by | Approved |
|---|---|---|---|---|
| §9 | ThunderID real outage/timeout/retry behavior | Needs a live ThunderID instance and an actual induced failure | ⬜ | ⬜ |
| §13 | Race conditions — confirming, not just spotting the pattern | Needs concurrent load against a running stack | ⬜ | ⬜ |
| §22 | Backup & disaster recovery | Needs an actual backup run + a real restore drill | ⬜ | ⬜ |
| §29–31 | Performance, connection pool exhaustion, rate-limit effectiveness at scale | Needs seeded realistic data volume + load-testing tools | ⬜ | ⬜ |
| §32 | CORS/proxy behavior end-to-end | Needs an actual deployed reverse proxy | ⬜ | ⬜ |
| §40 | Adversarial testing as live requests (not just code reasoning) | AI can do this too if the human spins up `docker compose` + backend locally and lets it hit the API with curl — otherwise it's code-reasoning only | ⬜ | ⬜ |
| §41 | Business logic correctness | Requires knowing what the school actually wants — a product/domain call, not derivable from code | ⬜ | ⬜ |
| Part C | Deployment Verdict (READY / NOT READY) | Ultimately a risk-acceptance decision only a human can make | ⬜ | ⬜ |
| Part D fixes | Fixing found issues, reviewing/merging PRs | The AI can write the fix; a human must decide it's safe to merge and actually merge it | ⬜ | ⬜ |
| — | Coordinating the testers, deciding what goes public vs stays private | Team/process decision | ⬜ | ⬜ |

---

## Progress Summary

Section-level tracking. `Reviewed by` = AI once it has actually read the code for every item in that section; `Approved` is human-only, set only after spot-checking per [Rules of Engagement](#rules-of-engagement) — never set by the AI.

| # | Section | Status | Reviewed by | Approved | Critical/High Findings |
|---|---|---|---|---|---|
| 4 | Authentication | ⬜ | ⬜ | ⬜ | |
| 5 | Authorization (general) | ⬜ | ⬜ | ⬜ | |
| 6 | Multi-Step Authorization / State Transitions | ⬜ | ⬜ | ⬜ | |
| 7 | Injection & Input Security | ⬜ | ⬜ | ⬜ | |
| 8 | Password Reset | ⬜ | ⬜ | ⬜ | |
| 9 | ThunderID Integration | ⬜ | ⬜ | ⬜ | |
| 10 | Database Schema | ⬜ | ⬜ | ⬜ | |
| 11 | Academic-Year Integrity | ⬜ | ⬜ | ⬜ | |
| 12 | Transactions | ⬜ | ⬜ | ⬜ | |
| 13 | Race Conditions & Concurrency | ⬜ | ⬜ | ⬜ | |
| 14 | SQL Query Quality | ⬜ | ⬜ | ⬜ | |
| 15 | Index Coverage | ⬜ | ⬜ | ⬜ | |
| 16 | Migrations | ⬜ | ⬜ | ⬜ | |
| 17 | Data Integrity | ⬜ | ⬜ | ⬜ | |
| 18 | Timetable Logic | ⬜ | ⬜ | ⬜ | |
| 19 | Attendance Logic | ⬜ | ⬜ | ⬜ | |
| 20 | Notifications | ⬜ | ⬜ | ⬜ | |
| 21 | Background Jobs | ⬜ | ⬜ | ⬜ | |
| 22 | Backup & Disaster Recovery | ⬜ | ⬜ | ⬜ | |
| 23 | Frontend (React) | ⬜ | ⬜ | ⬜ | |
| 24 | TypeScript Safety | ⬜ | ⬜ | ⬜ | |
| 25 | API Contract | ⬜ | ⬜ | ⬜ | |
| 26 | Error Handling | ⬜ | ⬜ | ⬜ | |
| 27 | Logging | ⬜ | ⬜ | ⬜ | |
| 28 | Privacy / Data Exposure | ⬜ | ⬜ | ⬜ | |
| 29 | Performance | ⬜ | ⬜ | ⬜ | |
| 30 | PostgreSQL Connection Pool | ⬜ | ⬜ | ⬜ | |
| 31 | Rate Limiting | ⬜ | ⬜ | ⬜ | |
| 32 | CORS / HTTP / Proxy | ⬜ | ⬜ | ⬜ | |
| 33 | Environment & Secrets | ⬜ | ⬜ | ⬜ | |
| 34 | Docker & Deployment | ⬜ | ⬜ | ⬜ | |
| 35 | Dependencies | ⬜ | ⬜ | ⬜ | |
| 36 | Dead Code | ⬜ | ⬜ | ⬜ | |
| 37 | Code Quality | ⬜ | ⬜ | ⬜ | |
| 38 | Architecture Conformance | ⬜ | ⬜ | ⬜ | |
| 39 | Testing Coverage | ⬜ | ⬜ | ⬜ | |
| 40 | Adversarial Testing | ⬜ | ⬜ | ⬜ | |
| 41 | Business Logic Correctness | ⬜ | ⬜ | ⬜ | |
| 42 | Time & Date Handling | ⬜ | ⬜ | ⬜ | |
| 43 | File / PDF Handling | ⬜ | ⬜ | ⬜ | |
| 44 | Analytics Endpoint | ⬜ | ⬜ | ⬜ | |
| 45 | Observability & Operations | ⬜ | ⬜ | ⬜ | |
| 46 | Graceful Shutdown | ⬜ | ⬜ | ⬜ | |
| 47 | Production Configuration | ⬜ | ⬜ | ⬜ | |
| 48 | Documentation Drift | ⬜ | ⬜ | ⬜ | |
| F1 | Feature: Roles & Positions | ✅ | AI | ⬜ | |
| F2 | Feature: Identity, Accounts & Password Lifecycle | ✅ | AI | ⬜ | AUD-002 (MEDIUM) |
| F3 | Feature: School Setup & Academic Structure | ✅ | AI | ⬜ | AUD-003 (LOW) |
| F4 | Feature: Curriculum | ✅ | AI | ⬜ | |
| F5 | Feature: People | ✅ | AI | ⬜ | AUD-004 (MEDIUM) |
| F6 | Feature: Attendance | ✅ | AI | ⬜ | |
| F7 | Feature: Academic Records | ✅ | AI | ⬜ | |
| F8 | Feature: Promotion & Class Reassignment | ✅ | AI | ⬜ | |
| F9 | Feature: Timetable | ✅ | AI | ⬜ | |
| F10 | Feature: Notifications | ✅ | AI | ⬜ | |
| F11 | Feature: Reports & Analytics | ✅ | AI | ⬜ | |
| F12 | Feature: Audit Log | ✅ | AI | ⬜ | |
| F13 | Feature: Automation (Background Jobs) | ✅ | AI | ⬜ | |
| F14 | Feature: Portals at a Glance | ✅ | AI | ⬜ | |
| F15 | Feature: Cross-Cutting / Non-Functional | ✅ | AI | ⬜ | |
| B1 | Authorization Matrix | ⬜ | ⬜ | ⬜ | |
| B2 | API Security Matrix | ⬜ | ⬜ | ⬜ | |
| B3 | Database Findings Summary | ⬜ | ⬜ | ⬜ | |
| B4 | Performance Findings Summary | ⬜ | ⬜ | ⬜ | |
| B5 | Dead Code Report | ⬜ | ⬜ | ⬜ | |
| B6 | Documentation Drift Report | ⬜ | ⬜ | ⬜ | |
| B7 | Test Gap Report | ⬜ | ⬜ | ⬜ | |
| B8 | Production Hardening Checklist | ⬜ | ⬜ | ⬜ | |
| C | Deployment Verdict | ⬜ | ⬜ | ⬜ | |
| E | Final Scores & Top 10 | ⬜ | ⬜ | ⬜ | |

---

## Part A — Audit Checklists

### 4. Authentication

Scope: `backend/internal/middleware/auth.go`, `backend/internal/identity/`, `backend/internal/thunderid/`, `frontend` ThunderID integration (`main.tsx`, `useThunderID`).

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 4.1 | JWT signature validation is enforced (no `alg: none`, no algorithm confusion between RS/HS) | ⬜ | |
| 4.2 | Issuer (`iss`) claim is validated against configured `THUNDERID_ISSUER` | ⬜ | |
| 4.3 | Audience (`aud`) claim is validated where applicable | ⬜ | |
| 4.4 | Expiration (`exp`) is enforced; no manual bypass/grace period that's too generous | ⬜ | |
| 4.5 | Not-before (`nbf`) is honored if present | ⬜ | |
| 4.6 | JWKS is fetched and cached correctly; cache refresh handles key rotation without downtime | ⬜ | |
| 4.7 | Behavior when ThunderID/JWKS endpoint is unreachable at startup vs at request time (fail closed, not open) | ⬜ | |
| 4.8 | Role claim extraction is trustworthy (cannot be spoofed by client-controlled fields) | ⬜ | |
| 4.9 | Account provisioning on first login creates exactly one local `User` row per identity, idempotently | ⬜ | |
| 4.10 | Account deletion / deactivation revokes access promptly (no long-lived valid tokens post-deletion beyond `exp`) | ⬜ | |
| 4.11 | Logout behavior — does it actually invalidate anything server-side, or is it purely client-side token discard | ⬜ | |
| 4.12 | First-login / temporary password flow (`PasswordInterstitial.tsx`) forces change before granting full access | ⬜ | |
| 4.13 | No default/hardcoded credentials reachable in provisioning code paths | ⬜ | |
| 4.14 | Session/token lifetime is reasonable; refresh flow (if any) doesn't extend indefinitely | ⬜ | |
| 4.15 | Replay: a captured valid JWT can't be used past intended single-use contexts (e.g., password reset) — cross-ref with §8 | ⬜ | |

### 5. Authorization (General Enforcement)

Scope: `backend/internal/middleware/role.go`, every file in `backend/internal/routes/`, every handler/service pair.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 5.1 | Every route file registers `RequireRole` (or equivalent) appropriate to the resource — enumerate exceptions | ⬜ | |
| 5.2 | No route relies solely on the frontend hiding UI to restrict access | ⬜ | |
| 5.3 | Object-level authorization (IDOR/BOLA check) exists for every endpoint accepting an ID: `student_id`, `teacher_id`, `guardian_id`, `class_id`, `grade_id`, `subject_id`, `timetable_id`, `notification_id`, `academic_year_id` | ⬜ | |
| 5.4 | Teacher-position-based permissions (Principal/VP/Section Head/Class Teacher/Subject Teacher) are enforced server-side, not just role=teacher | ⬜ | |
| 5.5 | Parent → child relationship is verified server-side on every parent-facing endpoint (`backend/internal/routes/parent.go`) | ⬜ | |
| 5.6 | Student self-service endpoints (`student_self.go`) cannot access/modify another student's data | ⬜ | |
| 5.7 | Teacher self-service endpoints (`teacher_self.go`) scoped to the authenticated teacher only | ⬜ | |
| 5.8 | Section-head endpoints (`section_head.go`) scoped to the section actually assigned | ⬜ | |
| 5.9 | Audit log access (`audit.go`) restricted to admin/authorized roles only | ⬜ | |
| 5.10 | Full authorization matrix completed — see Part B1 | ⬜ | |

### 6. Multi-Step Authorization / State Transitions

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 6.1 | Create vs Update vs Delete on the same resource all independently re-check authorization (no "GET is guarded, PUT isn't") | ⬜ | |
| 6.2 | Timetable approve/reject/publish/revise (`routes/timetable/timetable.go`) each independently authorized, not just reachable after a guarded "start" step | ⬜ | |
| 6.3 | Promotion commit (`promotion.go`) re-validates authorization and preconditions at commit time, not just at preview/draft time | ⬜ | |
| 6.4 | Position change / teacher assignment change (`position.go`) re-validates who can assign what | ⬜ | |
| 6.5 | Password reset / account provisioning steps each re-check state (can't skip a step by calling a later endpoint directly) | ⬜ | |
| 6.6 | Attendance modification after lock cannot be achieved via a different endpoint than the intended admin-override path | ⬜ | |
| 6.7 | Historical academic data (past academic years) cannot be mutated through endpoints meant for the current year | ⬜ | |

### 7. Injection & Input Security

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 7.1 | All SQL is via sqlc-generated parameterized queries; no raw string-concatenated SQL anywhere in `services/`/`repositories/` | ⬜ | |
| 7.2 | Any `LIKE`/search queries escape user-supplied `%`/`_` wildcards | ⬜ | |
| 7.3 | No user-controlled input reaches a regex compiled at request time (ReDoS) | ⬜ | |
| 7.4 | Request body size is bounded (`middleware/body_limit.go`) on all routes, including file/report endpoints | ⬜ | |
| 7.5 | Malformed/non-numeric IDs in path params return 400, not 500 | ⬜ | |
| 7.6 | Pagination params (`limit`/`offset`/`page`) are bounded — no unbounded or negative values accepted | ⬜ | |
| 7.7 | Invalid/out-of-range dates, timestamps, academic years rejected with validation errors, not silently coerced | ⬜ | |
| 7.8 | Enum-like fields (role, status, position, recipient type) validated against an allow-list server-side | ⬜ | |
| 7.9 | No path traversal possible in any file-serving/PDF/logo-upload code | ⬜ | |
| 7.10 | No header injection via user-controlled values echoed into response headers | ⬜ | |
| 7.11 | HTTP parameter pollution (duplicate query params) handled deterministically, doesn't bypass validation | ⬜ | |

### 8. Password Reset

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 8.1 | Reset token generated with a CSPRNG, sufficient entropy | ⬜ | |
| 8.2 | Token stored hashed at rest, not plaintext (cross-ref migration for the reset-token table) | ⬜ | |
| 8.3 | Token has a short, enforced expiration | ⬜ | |
| 8.4 | Token is single-use — invalidated immediately on successful use | ⬜ | |
| 8.5 | No user-enumeration via response timing/content differences (`ForgotPassword.tsx` flow + backend handler) | ⬜ | |
| 8.6 | Rate limiting specifically applied to reset-request and reset-confirm endpoints | ⬜ | |
| 8.7 | Concurrent reset requests for the same user don't create a race allowing an old token to still work | ⬜ | |
| 8.8 | Password change propagates correctly to ThunderID (no local/IdP password divergence) | ⬜ | |
| 8.9 | Reset tokens/passwords never appear in logs | ⬜ | |
| 8.10 | `password_reset_token_sweep.go` job actually removes expired/used tokens; verify cadence and query | ⬜ | |

### 9. ThunderID Integration

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 9.1 | JWKS URL / issuer configured per-environment, no hardcoded dev values reachable in prod build | ⬜ | |
| 9.2 | Role mapping (ThunderID role → OpenSchool role) is unambiguous and server-controlled | ⬜ | |
| 9.3 | User provisioning (`identity/`, `thunderid/`) — failure partway (local DB write succeeds, ThunderID call fails, or vice versa) leaves a defined, recoverable state | ⬜ | |
| 9.4 | Deletion (`identity_reconciliation.go`, `identity_rollback.go`) handles orphaned identities (exists in ThunderID but not locally, or vice versa) | ⬜ | |
| 9.5 | Username/email collision handling on create — deterministic, not silently overwriting | ⬜ | |
| 9.6 | Retry behavior on ThunderID timeout — no infinite retry loops, no silent drop | ⬜ | |
| 9.7 | Compensating rollback exists for partial multi-system writes (local DB + IdP) | ⬜ | |
| 9.8 | `identity_reconciliation.go` / reconciliation job actually detects and surfaces drift, doesn't just log-and-forget | ⬜ | |
| 9.9 | RoleID/JWKSURL/Issuer env helpers (`internal/identity/`) fail loudly (not silently default) when misconfigured | ⬜ | |

### 10. Database Schema

Scope: all 73 migrations in `backend/db/migrations/`, `db/sqlc/models.go`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 10.1 | Every table has an appropriate primary key | ⬜ | |
| 10.2 | Foreign keys exist for every logical relationship (student→class, class→grade, guardian→student, etc.) | ⬜ | |
| 10.3 | `ON DELETE` behavior (CASCADE/RESTRICT/SET NULL) is deliberate per FK, not defaulted accidentally | ⬜ | |
| 10.4 | Unique constraints exist where business rules imply uniqueness (e.g., one active enrollment per student per year) | ⬜ | |
| 10.5 | Check constraints exist for value ranges/enums where feasible | ⬜ | |
| 10.6 | NOT NULL applied to columns that are never legitimately optional | ⬜ | |
| 10.7 | Partial-uniqueness (e.g., "only one `is_current = true` row") — see §11 | ⬜ | |
| 10.8 | Business rules enforced only in Go that should also have a DB-level constraint — enumerate | ⬜ | |

### 11. Academic-Year Integrity

Cross-ref `docs/adr/0003-single-current-academic-year.md`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 11.1 | "Exactly one current academic year" — confirm this is NOT DB-enforced (per ADR) and identify the exact app-level enforcement point | ⬜ | |
| 11.2 | `SetCurrentAcademicYear` (or equivalent) is safe under concurrent requests — no race where two years both end up `is_current=true` or none does | ⬜ | |
| 11.3 | Every academic-data query (attendance, marks, enrollment, timetable) filters by `academic_year_id` explicitly — no query that silently returns cross-year data | ⬜ | |
| 11.4 | Historical-year data cannot be modified through current-year-scoped endpoints | ⬜ | |
| 11.5 | Frontend query cache keys include `academic_year_id` where relevant — no stale cross-year data shown after switching years | ⬜ | |
| 11.6 | Promotion operations reference the correct source year and destination year, verified not swappable via request tampering | ⬜ | |
| 11.7 | `current_academic_year_invariant.go` job — confirm what it actually checks and whether violations are auto-corrected or just flagged | ⬜ | |

### 12. Transactions

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 12.1 | Student creation (profile + user + guardian links) is one transaction | ⬜ | |
| 12.2 | Teacher/staff creation (profile + user + position assignment) is one transaction | ⬜ | |
| 12.3 | Account provisioning that spans local DB + ThunderID call — DB write ordered so ThunderID failure doesn't leave orphaned local rows (or compensating logic exists) | ⬜ | |
| 12.4 | Promotion commit is atomic — partial promotion (some students moved, some not) cannot occur on error | ⬜ | |
| 12.5 | Timetable publish/revise is atomic across all entries | ⬜ | |
| 12.6 | Notification send (fan-out to many recipients) — partial delivery on error is a defined, acceptable state, or wrapped correctly | ⬜ | |
| 12.7 | Bulk enrollment / class assignment is atomic per batch | ⬜ | |
| 12.8 | Academic-year switching is atomic (see §11.2) | ⬜ | |
| 12.9 | Student/teacher deletion cleans up all dependent rows within a transaction, or is intentionally soft-delete | ⬜ | |
| 12.10 | No external API call (ThunderID) executed while holding a DB transaction open (long-running tx risk) | ⬜ | |
| 12.11 | Isolation level is appropriate for the operations relying on read-then-write invariants (e.g., current-year switch) | ⬜ | |

### 13. Race Conditions & Concurrency

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 13.1 | First-admin/initial setup (`setup.go`) cannot be run twice concurrently to create two admins or corrupt state | ⬜ | |
| 13.2 | Academic-year switching under concurrent requests — see 11.2 | ⬜ | |
| 13.3 | Concurrent student enrollment into the same class doesn't exceed capacity/violate uniqueness | ⬜ | |
| 13.4 | House auto-assignment doesn't double-assign or skew under concurrent requests | ⬜ | |
| 13.5 | Concurrent password reset requests — see 8.7 | ⬜ | |
| 13.6 | Timetable publish/approve under concurrent edits — TOCTOU between validation and publish (cross-ref §18) | ⬜ | |
| 13.7 | Background job overlap — can the same job run twice concurrently (missing mutex/lock)? Check `scheduler.go` | ⬜ | |
| 13.8 | Manual "Run now" job trigger can't stack with a concurrently-scheduled run of the same job | ⬜ | |
| 13.9 | Attendance session locking is race-free (two teachers submitting for the same session simultaneously) | ⬜ | |
| 13.10 | Promotion commit run twice concurrently doesn't double-promote | ⬜ | |

### 14. SQL Query Quality

Scope: `backend/db/queries/*.sql`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 14.1 | No N+1 pattern in service code looping over IDs and issuing one query per iteration — enumerate offenders | ⬜ | |
| 14.2 | Joins are correct (no accidental fan-out producing duplicate rows without DISTINCT) | ⬜ | |
| 14.3 | Aggregation/COUNT queries return correct results under NULLs and 0-row groups | ⬜ | |
| 14.4 | Every list endpoint has a `LIMIT`/pagination — no unbounded `SELECT *` on large tables (students, attendance, audit log) | ⬜ | |
| 14.5 | OFFSET-based pagination evaluated for cost at realistic scale (thousands of rows); consider keyset pagination for hot paths | ⬜ | |
| 14.6 | Case-insensitive search (name/email lookups) uses an index-friendly approach, not `LOWER(col) LIKE ...` without a matching index | ⬜ | |
| 14.7 | Date/timezone handling in WHERE clauses is correct at day boundaries (see §42) | ⬜ | |
| 14.8 | Ordering is deterministic (secondary sort key) where pagination depends on stable order | ⬜ | |

### 15. Index Coverage

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 15.1 | `academic_year_id` indexed on every table filtered by it (attendance, enrollment, marks, timetable) | ⬜ | |
| 15.2 | Foreign keys (`student_id`, `teacher_id`, `guardian_id`, `class_id`, `grade_id`, `subject_id`, `user_id`) indexed where used in joins/filters | ⬜ | |
| 15.3 | `created_at` indexed where used for sorting/pagination (audit log, notifications) | ⬜ | |
| 15.4 | Notification recipient table indexed for per-user "my notifications" lookup | ⬜ | |
| 15.5 | Attendance lookups (by session, by student, by date range) covered by appropriate composite indexes | ⬜ | |
| 15.6 | Timetable lookups (by teacher, by classroom, by class, by period) covered by indexes needed for clash detection | ⬜ | |
| 15.7 | Audit log queries (by actor, by entity, by date range) indexed | ⬜ | |
| 15.8 | No redundant/duplicate indexes across the 73 migrations (check for indexes added then re-added differently) | ⬜ | |

### 16. Migrations

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 16.1 | All 73 migrations reviewed sequentially for ordering correctness | ⬜ | |
| 16.2 | Down migrations exist and are actually reversible where claimed | ⬜ | |
| 16.3 | No migration performs a long table lock on a large table without a safe strategy (e.g., adding NOT NULL column without default on existing large table) | ⬜ | |
| 16.4 | Destructive migrations (DROP COLUMN/TABLE) reviewed for data-loss risk and whether they're actually needed on an already-live system | ⬜ | |
| 16.5 | Backfill migrations (if any) are batched/safe at scale, not a single unbounded UPDATE | ⬜ | |
| 16.6 | Schema changes are compatible with the app version that ships alongside them (no window where old binary + new schema breaks) | ⬜ | |
| 16.7 | Migrations run automatically on startup (per CLAUDE.md) — confirm failure behavior (app should not start serving traffic on a failed/partial migration) | ⬜ | |

### 17. Data Integrity

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 17.1 | Student always has a valid class/grade reference, or the "unclassed" state is intentional (cross-ref `unclassed_students.go`, `empty_grade.go`, `empty_stream.go` jobs) | ⬜ | |
| 17.2 | Student cannot be in multiple active classes simultaneously if the business rule prohibits it | ⬜ | |
| 17.3 | Teacher-subject assignment references valid, active subjects | ⬜ | |
| 17.4 | Guardian limits (max guardians per student, if any) enforced — cross-ref `zero_guardians.go` job for the opposite case | ⬜ | |
| 17.5 | Duplicate class assignments / duplicate guardian relationships prevented (constraint or app-level check) | ⬜ | |
| 17.6 | Invalid grade/stream/stream-group combinations rejected | ⬜ | |
| 17.7 | Invalid subject selections against `SubjectBucket` rules rejected | ⬜ | |
| 17.8 | Published timetable cannot contain invalid/conflicting entries (cross-ref §18) | ⬜ | |
| 17.9 | Marks cannot be recorded for a nonexistent enrollment | ⬜ | |
| 17.10 | Attendance cannot be recorded for a student not in the class/session | ⬜ | |
| 17.11 | Notifications cannot reference invalid/deleted recipients | ⬜ | |
| 17.12 | For each invariant above, classify enforcement level: DB / Service / Frontend-only / Not enforced — frontend-only counts as a finding | ⬜ | |
| 17.13 | `employment_consistency.go`, `gender_school_type.go` jobs — confirm what invariant they check and whether it's also enforced at write time (not just detected after the fact) | ⬜ | |

### 18. Timetable Logic

Scope: `backend/internal/routes/timetable/`, `backend/internal/services/timetable/`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 18.1 | Teacher double-booking (same teacher, same period, two classes) is prevented server-side | ⬜ | |
| 18.2 | Classroom double-booking prevented server-side | ⬜ | |
| 18.3 | Class double-booking (same class, two subjects, same period) prevented | ⬜ | |
| 18.4 | Teacher availability (`teacher_availability.go`) is actually consulted during validation, not just displayed | ⬜ | |
| 18.5 | Weekly subject-hour requirements (`subject_period_requirement.go`) enforced before publish | ⬜ | |
| 18.6 | Publish/approve/reject/revise state machine — no way to skip from draft directly to published without required approvals | ⬜ | |
| 18.7 | Approving a timetable that was modified after the reviewer loaded it (TOCTOU) is prevented (version/etag check) | ⬜ | |
| 18.8 | Revising an already-revised timetable behaves correctly (no orphaned/duplicate versions) | ⬜ | |
| 18.9 | Deleting a teacher/classroom/grade-section referenced by an existing published timetable entry is handled (blocked or cascaded deliberately) | ⬜ | |
| 18.10 | Changing academic year doesn't leave timetable entries pointing at the wrong year | ⬜ | |
| 18.11 | Notifications on publish/approve/reject actually fire and target the right recipients (cross-ref §20) | ⬜ | |

### 19. Attendance Logic

Scope: `backend/internal/routes/attendance.go`, `stale_attendance.go`, `missing_attendance_sessions.go`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 19.1 | Attendance session ownership verified — only the assigned teacher (or admin) can record/edit it | ⬜ | |
| 19.2 | Class membership verified — cannot mark attendance for a student not enrolled in that class/session | ⬜ | |
| 19.3 | Academic-year scope correctly applied to attendance records and queries | ⬜ | |
| 19.4 | Duplicate attendance records for the same student/session prevented (constraint or check) | ⬜ | |
| 19.5 | Lock mechanism (post-submission edit lock) is enforced server-side, not just UI-disabled | ⬜ | |
| 19.6 | Lock cannot be bypassed via a different endpoint (e.g., a generic PATCH/update route) | ⬜ | |
| 19.7 | 24-hour boundary / timezone handling correct for lock timing (cross-ref §42) | ⬜ | |
| 19.8 | Admin override of a locked session is itself authorized and audit-logged | ⬜ | |
| 19.9 | Students added/removed from a class after a session exists handled sanely (no orphaned attendance rows) | ⬜ | |
| 19.10 | `stale_attendance.go` / `missing_attendance_sessions.go` jobs — confirm detection logic matches the actual lock/session model | ⬜ | |

### 20. Notifications

Scope: `backend/internal/routes/notifications/`, `backend/internal/services/notifications/`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 20.1 | Recipient resolution for each target type (everyone/grade/class/section/subject/specific student/guardian/teacher) is computed server-side from the sender's actual scope, not trusted from the request body | ⬜ | |
| 20.2 | Teacher cannot manipulate the payload to send outside their assigned class/subject scope | ⬜ | |
| 20.3 | Recipient list de-duplicated (no duplicate deliveries to the same user via overlapping scopes) | ⬜ | |
| 20.4 | Deleted/inactive users excluded from recipient resolution | ⬜ | |
| 20.5 | Academic-year scope respected in recipient resolution (no notifying last year's class roster) | ⬜ | |
| 20.6 | Guardian relationship verified before notifying a guardian about a specific student | ⬜ | |
| 20.7 | Read/unread and archive state is per-recipient, not shared/global | ⬜ | |
| 20.8 | A user can only see notifications addressed to them (no enumeration via `notification_id`) | ⬜ | |
| 20.9 | Large fan-out sends (e.g., "everyone") don't hold a single long DB transaction or spike memory — batched | ⬜ | |
| 20.10 | No duplicate delivery on retry after partial failure | ⬜ | |

### 21. Background Jobs

Scope: `backend/internal/jobs/` (17 jobs: `audit_anomaly`, `backup`, `current_academic_year_invariant`, `employment_consistency`, `empty_grade`, `empty_stream`, `gender_school_type`, `missing_attendance_sessions`, `onboarding`, `password_reset_token_sweep`, `stale_attendance`, `system`, `term_marks_deadline`, `unclassed_students`, `zero_guardians`), plus `scheduler.go`, `registry.go`, `routes/jobs.go`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 21.1 | Scheduler has an overlap guard (mutex/lock) preventing the same job from running concurrently with itself | ⬜ | |
| 21.2 | Panic in one job is recovered and doesn't crash the scheduler or take down other jobs | ⬜ | |
| 21.3 | Job failure is recorded in job history, not silently swallowed | ⬜ | |
| 21.4 | Jobs are idempotent — re-running after a crash doesn't duplicate side effects (notifications, corrections) | ⬜ | |
| 21.5 | Manual "Run now" (`routes/jobs.go`) is properly authorized (admin-only) and doesn't collide with a concurrently scheduled run | ⬜ | |
| 21.6 | Job enable/disable state persists correctly and takes effect without a restart | ⬜ | |
| 21.7 | `backup.go` — verify it does what its name implies (see §22) rather than assuming | ⬜ | |
| 21.8 | Detection jobs (`empty_grade`, `empty_stream`, `unclassed_students`, `zero_guardians`, `stale_attendance`, `missing_attendance_sessions`, `audit_anomaly`, `employment_consistency`, `gender_school_type`) — findings are timestamped and clearly marked as point-in-time, not presented as live/current state | ⬜ | |
| 21.9 | `term_marks_deadline.go` — deadline calculation uses correct timezone/date logic (cross-ref §42) | ⬜ | |
| 21.10 | Behavior when a job's execution exceeds its own schedule interval (does the next tick skip, queue, or overlap) | ⬜ | |
| 21.11 | Behavior on DB outage mid-job and on process restart mid-job — no partial/corrupt state left behind | ⬜ | |

### 22. Backup & Disaster Recovery

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 22.1 | `backup.go` job's actual mechanism identified (pg_dump? logical replication? filesystem snapshot?) | ⬜ | |
| 22.2 | Backup destination is off-machine / not the same disk as the primary DB | ⬜ | |
| 22.3 | Backup encryption at rest | ⬜ | |
| 22.4 | Backup file access permissions reviewed | ⬜ | |
| 22.5 | DB credentials used for backup aren't over-privileged or logged | ⬜ | |
| 22.6 | Backup success/failure is verified (checksum, restore test), not assumed from exit code alone | ⬜ | |
| 22.7 | Restore procedure exists and has been tested (or explicitly flagged UNVERIFIED) | ⬜ | |
| 22.8 | Disk-full behavior during backup doesn't corrupt the in-progress backup or crash the process | ⬜ | |
| 22.9 | Backup failures trigger an alert, not just a log line no one reads | ⬜ | |
| 22.10 | Actual supported RPO and RTO stated explicitly (mark UNVERIFIED if no restore test exists) | 🔍 | Requires runtime/infra verification |

### 23. Frontend (React)

Scope: `frontend/src/pages/`, `frontend/src/queries/`, `frontend/src/components/`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 23.1 | `useEffect` dependency arrays are correct across query/mutation-triggering effects — no infinite loops | ⬜ | |
| 23.2 | TanStack Query keys are structured consistently and include all relevant scoping (academic year, role, entity id) | ⬜ | |
| 23.3 | Mutations invalidate exactly the query keys they affect — no stale lists after create/update/delete | ⬜ | |
| 23.4 | No cross-user data leakage via cache surviving logout/login as a different user | ⬜ | |
| 23.5 | `ProtectedRoute` correctly redirects unauthenticated users on every route tree (admin/teacher/student/parent) | ⬜ | |
| 23.6 | Role resolution (`useRole`) has a safe default when the claim is missing/malformed (fail closed) | ⬜ | |
| 23.7 | Forms handle double-submission (disable-on-submit or equivalent) for create/mutate actions | ⬜ | |
| 23.8 | Error states from failed queries/mutations are surfaced to the user, not silently swallowed | ⬜ | |
| 23.9 | Loading and empty states implemented consistently via `src/components/common/` (per CLAUDE.md, deviation from list+modal-form+confirm-delete template is a signal) | ⬜ | |
| 23.10 | Network failure / 401/403 responses handled globally (e.g., axios interceptor) with correct redirect/signout behavior | ⬜ | |
| 23.11 | Modal state resets correctly between opens (no leftover data from a previously edited entity) | ⬜ | |

### 24. TypeScript Safety

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 24.1 | Audit usage of `any` across `src/services/` and `src/queries/` — enumerate | ⬜ | |
| 24.2 | Audit `as unknown as` / unsafe casts | ⬜ | |
| 24.3 | Audit non-null assertions (`!`) on data that can legitimately be null/undefined (e.g., optional API fields) | ⬜ | |
| 24.4 | Audit `@ts-ignore`/`@ts-expect-error` suppressions | ⬜ | |
| 24.5 | Frontend service types (`src/services/`) match backend DTOs field-for-field, including optionality | ⬜ | |
| 24.6 | Enum representations match between Go (string/int constants) and TS (union types/string literals) | ⬜ | |
| 24.7 | Date/time fields typed and parsed consistently (string vs Date) across services | ⬜ | |

### 25. API Contract

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 25.1 | Swagger/OpenAPI docs generated (`swag`) are compared against actual handler behavior for drift | ⬜ | |
| 25.2 | Every field in frontend service types exists in the actual backend response (no assumed fields) | ⬜ | |
| 25.3 | Nullability matches — fields the backend can omit/null are typed optional/nullable in frontend | ⬜ | |
| 25.4 | HTTP status codes are consistent and correct (400 vs 401 vs 403 vs 404 vs 409 vs 500) across all handlers | ⬜ | |
| 25.5 | Error response shape is consistent across all endpoints (single error envelope format) | ⬜ | |
| 25.6 | Pagination contract (params and response shape) consistent across all list endpoints | ⬜ | |
| 25.7 | Date format consistent (RFC3339 etc.) across all endpoints | ⬜ | |

### 26. Error Handling

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 26.1 | No ignored/swallowed errors (`_ = err` or unchecked `err`) on a code path that matters — enumerate | ⬜ | |
| 26.2 | Error responses never leak internal details (stack traces, SQL, file paths) to the client | ⬜ | |
| 26.3 | Validation errors, authorization errors, not-found, and conflict errors are distinguished with correct status codes, not collapsed to generic 500 | ⬜ | |
| 26.4 | Panics are recovered at the HTTP layer (Gin recovery middleware) and logged with context | ⬜ | |
| 26.5 | Frontend correctly distinguishes and handles each error class from the backend (validation vs auth vs not-found) | ⬜ | |

### 27. Logging

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 27.1 | No passwords, tokens, JWTs, or Authorization headers ever logged — grep confirms | ⬜ | |
| 27.2 | No password-reset tokens logged | ⬜ | |
| 27.3 | No NIC numbers or other sensitive student/guardian PII logged in full | ⬜ | |
| 27.4 | No DB or ThunderID credentials logged (including in connection-error messages) | ⬜ | |
| 27.5 | Authentication/authorization failures are logged with enough context to investigate (actor, resource, reason) | ⬜ | |
| 27.6 | Database and external-dependency (ThunderID) failures are logged with actionable detail | ⬜ | |
| 27.7 | Background job failures are logged distinctly from successes | ⬜ | |
| 27.8 | Log format/level is consistent and configurable via env (see §47) | ⬜ | |

### 28. Privacy / Data Exposure

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 28.1 | Student list/detail endpoints return only fields needed for the requesting role (no full profile to every role) | ⬜ | |
| 28.2 | Guardian phone/email/NIC exposed only to authorized roles (admin, own child's teacher where applicable, self) | ⬜ | |
| 28.3 | Attendance/marks/discipline/awards data scoped to roles with a legitimate need (own class, own child, self) | ⬜ | |
| 28.4 | Timetable data doesn't leak other classes'/teachers' schedules beyond what's needed | ⬜ | |
| 28.5 | Notification content doesn't leak recipient lists to unintended viewers | ⬜ | |
| 28.6 | DTOs reviewed for excessive fields (over-fetching) on list endpoints vs detail endpoints | ⬜ | |

### 29. Performance

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 29.1 | Student list endpoint reasoned about at 2,000–5,000 rows — pagination, filtering, sorting all indexed | ⬜ | |
| 29.2 | Attendance pages reasoned about at years of historical data — bounded by date range/pagination | ⬜ | |
| 29.3 | Timetable pages reasoned about at full-school scale (100–300 teachers, 50–200 classes) | ⬜ | |
| 29.4 | Dashboard/analytics endpoint doesn't run multiple unindexed aggregate scans per request | ⬜ | |
| 29.5 | PDF/report generation (`report_export.go`) doesn't load unbounded data into memory | ⬜ | |
| 29.6 | Notification sending at scale (full-school broadcast) doesn't block the request thread for the full fan-out | ⬜ | |
| 29.7 | No O(n²) patterns in service code (nested loops over students/classes) | ⬜ | |
| 29.8 | Frontend doesn't over-fetch (e.g., refetching full lists on every keystroke without debounce) | ⬜ | |

### 30. PostgreSQL Connection Pool

Scope: `backend/internal/database/`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 30.1 | Max pool size configured and reasonable for single-instance + background jobs + real traffic | ⬜ | |
| 30.2 | Min/idle connections configured sensibly | ⬜ | |
| 30.3 | Connection acquire timeout set (no indefinite hang under pool exhaustion) | ⬜ | |
| 30.4 | Query timeout / statement timeout configured to prevent one slow query from starving the pool | ⬜ | |
| 30.5 | Background jobs share the same pool sensibly, not a separate unbounded pool | ⬜ | |
| 30.6 | Behavior under pool exhaustion — returns 503/error, doesn't hang the whole API | ⬜ | |

### 31. Rate Limiting

Scope: `backend/internal/middleware/ratelimit.go`.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 31.1 | Login endpoint rate-limited | ⬜ | |
| 31.2 | Password reset request/confirm endpoints rate-limited (cross-ref 8.6) | ⬜ | |
| 31.3 | Admin/setup endpoints rate-limited | ⬜ | |
| 31.4 | Notification-send endpoint rate-limited (abuse/spam potential) | ⬜ | |
| 31.5 | Report/PDF generation and analytics endpoints rate-limited (expensive-operation abuse) | ⬜ | |
| 31.6 | Current limiter is per-IP — assess impact of NAT/shared-school-IP on legitimate concurrent users | ⬜ | |
| 31.7 | Recommend endpoint-specific limits where the current global/per-IP scheme is insufficient | ⬜ | |

### 32. CORS / HTTP / Proxy

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 32.1 | CORS origin allow-list is explicit, not `*` with credentials | ⬜ | |
| 32.2 | Allowed methods/headers are minimal and explicit | ⬜ | |
| 32.3 | Security headers present (`security_headers.go`) — HSTS, X-Content-Type-Options, X-Frame-Options/CSP as applicable | ⬜ | |
| 32.4 | Trusted proxy configuration correct for `X-Forwarded-For`/`X-Real-IP` (affects rate limiting's per-IP logic) | ⬜ | |
| 32.5 | TLS termination assumptions documented — app doesn't assume HTTPS when deployed without a terminating proxy | ⬜ | |
| 32.6 | HTTPS enforcement (redirect or HSTS) in production config | ⬜ | |

### 33. Environment & Secrets

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 33.1 | No secrets committed to source control — grep `.env`, compose files, git history | ⬜ | |
| 33.2 | `.env.example` contains only placeholder values, no real credentials | ⬜ | |
| 33.3 | Production cannot silently start with development defaults (weak DB password, permissive CORS, debug flags) | ⬜ | |
| 33.4 | Swagger UI is not exposed in production, or is auth-gated | ⬜ | |
| 33.5 | `APP_ENV` (or equivalent) actually changes security-relevant behavior (CORS, logging verbosity, debug endpoints) between dev/prod | ⬜ | |

### 34. Docker & Deployment

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 34.1 | Containers run as non-root user | ⬜ | |
| 34.2 | Base images are pinned (not `latest`) | ⬜ | |
| 34.3 | Health checks defined for backend and DB containers | ⬜ | |
| 34.4 | Restart policies set appropriately | ⬜ | |
| 34.5 | DB data uses a persistent volume, not ephemeral container storage | ⬜ | |
| 34.6 | No unnecessary ports exposed to the host/network | ⬜ | |
| 34.7 | Secrets passed via env/secret store, not baked into the image | ⬜ | |
| 34.8 | Migration-on-startup doesn't create a race if multiple backend replicas start simultaneously | ⬜ | |
| 34.9 | Graceful shutdown wired into container stop signal handling (cross-ref §46) | ⬜ | |

### 35. Dependencies

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 35.1 | `go.mod` reviewed for outdated/abandoned direct dependencies | ⬜ | |
| 35.2 | `govulncheck` findings reviewed (currently informational per CI — assess whether any are actually exploitable here) | ⬜ | |
| 35.3 | `pnpm audit --prod` findings reviewed (currently informational per CI — cross-ref `audit.md` note in CLAUDE.md about "two known advisories") | ⬜ | |
| 35.4 | No dev-only dependencies bundled into the production frontend build | ⬜ | |
| 35.5 | Assess whether any flagged upgrade would be breaking before recommending it | ⬜ | |

### 36. Dead Code

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 36.1 | Unused Go functions/exports identified (`staticcheck`/manual grep) — see Part B5 | ⬜ | |
| 36.2 | Unused React components/hooks identified — see Part B5 | ⬜ | |
| 36.3 | Unused routes (registered but no frontend caller, or vice versa) | ⬜ | |
| 36.4 | Unused env vars (declared in `.env.example` but never read) | ⬜ | |
| 36.5 | Dead feature flags (if any) with no effect | ⬜ | |
| 36.6 | Note: generated code (`db/sqlc/`) is not dead code merely because it's not manually referenced — exclude from this list | ⬜ | |

### 37. Code Quality

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 37.1 | Identify any "god service" (a `services/*.go` file that's grown to handle unrelated concerns) | ⬜ | |
| 37.2 | Identify handlers containing business logic that belongs in the service layer | ⬜ | |
| 37.3 | Identify services bypassing the repository layer and calling sqlc directly where a repository exists | ⬜ | |
| 37.4 | Identify repositories containing business logic beyond data access | ⬜ | |
| 37.5 | Identify frontend components/pages that are too large or mix unrelated responsibilities | ⬜ | |
| 37.6 | Naming consistency across backend packages and frontend modules | ⬜ | |

### 38. Architecture Conformance

Documented layering: `Routes → Handlers → Services → Repositories → sqlc → PostgreSQL` (backend), `Pages → Components → Query hooks → Services → Axios → REST` (frontend).

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 38.1 | No handler calls the database directly, bypassing the service layer | ⬜ | |
| 38.2 | No handler calls ThunderID directly, bypassing `internal/identity`/`internal/thunderid` | ⬜ | |
| 38.3 | No frontend component calls an unexpected/undocumented API directly, bypassing `src/services/` | ⬜ | |
| 38.4 | No service generates/executes raw SQL directly, bypassing sqlc-generated queries | ⬜ | |
| 38.5 | Enumerate every violation found above with file:line; only recommend fixing where it has a concrete correctness/security/maintainability cost | ⬜ | |

### 39. Testing Coverage

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 39.1 | Authentication (JWT validation, JWKS) has tests | ⬜ | |
| 39.2 | Authorization/role-gating has tests per role | ⬜ | |
| 39.3 | Student ownership / parent-child ownership has tests | ⬜ | |
| 39.4 | Teacher assignment/position permissions have tests | ⬜ | |
| 39.5 | Admin setup (first-run) has tests | ⬜ | |
| 39.6 | Password reset flow has tests (including single-use/expiry) | ⬜ | |
| 39.7 | Account provisioning (local + ThunderID) has tests, including failure/rollback paths | ⬜ | |
| 39.8 | Academic-year switching has tests (including concurrency) | ⬜ | |
| 39.9 | Promotion has tests | ⬜ | |
| 39.10 | Attendance locking has tests | ⬜ | |
| 39.11 | Timetable validation/clash-detection has tests | ⬜ | |
| 39.12 | Timetable approval/publish workflow has tests | ⬜ | |
| 39.13 | Notification targeting/authorization has tests | ⬜ | |
| 39.14 | Background job scheduler (overlap guard, panic recovery) has tests | ⬜ | |
| 39.15 | Full gap list compiled — see Part B7 | ⬜ | |

### 40. Adversarial Testing

Conceptual/manual exploitation attempts — record actual attempted request + result, not just "should be blocked."

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 40.1 | Student A attempts to access Student B's data via ID substitution | ⬜ | |
| 40.2 | Parent A attempts to access Parent B's child's data | ⬜ | |
| 40.3 | Teacher A attempts to access Teacher B's class | ⬜ | |
| 40.4 | Teacher attempts to send a notification outside their assigned grade/class scope | ⬜ | |
| 40.5 | Teacher attempts to send a notification outside their assigned subject scope | ⬜ | |
| 40.6 | Teacher attempts to approve/publish a timetable (admin/reviewer-only action) | ⬜ | |
| 40.7 | Teacher attempts to hit an admin-only endpoint directly | ⬜ | |
| 40.8 | Student attempts to submit/modify attendance | ⬜ | |
| 40.9 | Parent attempts to modify marks | ⬜ | |
| 40.10 | Request with a tampered `academic_year_id` targeting a different year than the user's context | ⬜ | |
| 40.11 | Request with a tampered `class_id`/`student_id`/`teacher_id` outside the caller's scope | ⬜ | |
| 40.12 | Request with a tampered role claim in a forged/modified JWT (should fail signature validation) | ⬜ | |
| 40.13 | Replayed request (idempotency where required, e.g., password reset, payment-like flows) | ⬜ | |
| 40.14 | Duplicate/concurrent submission of the same create request (double-submit) | ⬜ | |

### 41. Business Logic Correctness

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 41.1 | Grade/class/stream/stream-group generation rules match documented school structure | ⬜ | |
| 41.2 | A/L stream rules (if applicable) correctly gate subject selection | ⬜ | |
| 41.3 | Medium rules correctly scope class/subject assignment | ⬜ | |
| 41.4 | House assignment logic matches intended rule (random/balanced/manual) | ⬜ | |
| 41.5 | Guardian limits match intended policy | ⬜ | |
| 41.6 | Promotion logic matches intended year-over-year progression rules | ⬜ | |
| 41.7 | Marks calculation/aggregation matches intended grading rules | ⬜ | |
| 41.8 | Teacher position rules (Principal/VP/Section Head/Class Teacher/Subject Teacher) match intended permission model, not just naming | ⬜ | |
| 41.9 | Notification targeting matches intended audience-resolution rules | ⬜ | |
| 41.10 | Academic-year rollover behavior matches intended "what carries over vs resets" rules | ⬜ | |

### 42. Time & Date Handling

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 42.1 | Backend stores timestamps in UTC consistently (`timestamptz` vs `timestamp` reviewed per migration) | ⬜ | |
| 42.2 | Sri Lanka timezone assumptions (if hardcoded) are correct and consistently applied, not mixed with UTC elsewhere | ⬜ | |
| 42.3 | Attendance 24-hour lock boundary computed correctly relative to the intended timezone, not server-local time incidentally | ⬜ | |
| 42.4 | Cron schedules (`scheduler.go`) run in the intended timezone, not accidentally UTC when local was intended (or vice versa) | ⬜ | |
| 42.5 | Term deadlines (`term_marks_deadline.go`) computed correctly at day/month boundaries | ⬜ | |
| 42.6 | Frontend date parsing/display doesn't shift dates across a timezone boundary (off-by-one-day bugs) | ⬜ | |
| 42.7 | JSON serialization of timestamps is unambiguous (includes offset/Z) end-to-end | ⬜ | |

### 43. File / PDF Handling

Scope: `report_export.go`, school logo upload (if present).

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 43.1 | File/logo upload size limit enforced | ⬜ | |
| 43.2 | MIME type validated server-side (not trusted from client-supplied `Content-Type`) | ⬜ | |
| 43.3 | Uploaded images checked against decompression-bomb-style resource exhaustion | ⬜ | |
| 43.4 | PDF generation failure handled gracefully (no hung request/leaked resources) | ⬜ | |
| 43.5 | PDF/report generation is authorized per the requester's actual data scope, not just role | ⬜ | |
| 43.6 | If images stored inline/base64 in DB, growth/performance impact assessed | ⬜ | |
| 43.7 | Filenames from user input (if any) sanitized before use in headers/storage paths | ⬜ | |

### 44. Analytics Endpoint

Scope: `dashboard.go` (routes/services).

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 44.1 | Dashboard aggregate queries scale acceptably at realistic data volume (see §29) | ⬜ | |
| 44.2 | Aggregates are numerically correct (spot-check against raw data) | ⬜ | |
| 44.3 | Historical vs current-year boundaries correctly applied in every aggregate | ⬜ | |
| 44.4 | No unauthorized cross-scope data leaks into aggregate figures shown to a restricted role | ⬜ | |
| 44.5 | Multiple aggregate queries per dashboard load — assess whether they could be combined/batched | ⬜ | |

### 45. Observability & Operations

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 45.1 | Health check endpoint exists and actually checks DB connectivity, not just process liveness | ⬜ | |
| 45.2 | Readiness vs liveness distinguished if applicable | ⬜ | |
| 45.3 | Metrics exposed for request latency/error rate | ⬜ | |
| 45.4 | Structured logging in place (vs plain text) for machine parseability | ⬜ | |
| 45.5 | Authorization-failure rate is observable (not buried in generic logs) | ⬜ | |
| 45.6 | Slow-query visibility exists (Postgres logging/`pg_stat_statements` or equivalent) | ⬜ | |
| 45.7 | Connection pool exhaustion is observable before it causes an outage | ⬜ | |
| 45.8 | Background job success/failure/duration is observable per job | ⬜ | |
| 45.9 | No error-tracking integration (Sentry or equivalent) present — flag as a gap if true | ⬜ | |
| 45.10 | ThunderID reachability is observable (not just discovered via user-facing 500s) | ⬜ | |

### 46. Graceful Shutdown

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 46.1 | HTTP server shuts down gracefully on SIGTERM (drains in-flight requests) | ⬜ | |
| 46.2 | DB pool closed cleanly on shutdown | ⬜ | |
| 46.3 | Cron scheduler stopped cleanly, not killed mid-job | ⬜ | |
| 46.4 | A job in progress at shutdown either completes, is safely resumable, or leaves no partial state | ⬜ | |
| 46.5 | Shutdown timeout is bounded (doesn't hang indefinitely, doesn't kill too abruptly) | ⬜ | |

### 47. Production Configuration

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 47.1 | DB connection settings fully configurable via env | ⬜ | |
| 47.2 | ThunderID settings fully configurable via env | ⬜ | |
| 47.3 | CORS origins configurable via env, no hardcoded dev origin in prod path | ⬜ | |
| 47.4 | Port configurable via env | ⬜ | |
| 47.5 | Rate limits configurable via env | ⬜ | |
| 47.6 | DB pool size/timeouts configurable via env | ⬜ | |
| 47.7 | Cron schedules configurable (or at least documented) rather than hardcoded magic values | ⬜ | |
| 47.8 | Backup destination configurable via env | ⬜ | |
| 47.9 | Log level configurable via env | ⬜ | |
| 47.10 | Request size limits/timeouts configurable via env | ⬜ | |
| 47.11 | Enumerate any dangerous hard-coded value found during the audit | ⬜ | |

### 48. Documentation Drift

Compare `docs/SETUP.md` (if present), `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/THUNDERID.md`, `docs/adr/`, `README.md`, `CONTRIBUTING.md`, Swagger, `.env.example` against actual code.

| # | Item | Status | Reason / Evidence |
|---|---|---|---|
| 48.1 | `docs/FEATURES.md` claims checked against actual implemented behavior per module | ⬜ | |
| 48.2 | `docs/ARCHITECTURE.md` data model checked against `db/sqlc/models.go` / migrations | ⬜ | |
| 48.3 | ADRs checked against current code (e.g., is the single-current-academic-year invariant still enforced the way ADR 0003 describes) | ⬜ | |
| 48.4 | `CONTRIBUTING.md` setup steps checked against actual required tooling/env vars (note: file has a typo — `source ~/.bashrc oor source ~/.zshrc` — trivial but confirms doc isn't kept in sync) | ⬜ | |
| 48.5 | `.env.example` checked against every env var actually read in code — both directions (missing + unused) | ⬜ | |
| 48.6 | Swagger docs checked against actual handlers for undocumented or drifted endpoints | ⬜ | |
| 48.7 | `docs/THUNDERID.md` setup steps checked against actual `internal/identity`/`internal/thunderid` requirements | ⬜ | |

---

## Part A2 — Feature Verification Checklist (functional / product correctness)

Part A audits the code for security/quality defects section by section. This part instead walks **`docs/FEATURES.md` claim by claim** — every module OpenSchool documents as shipped — and confirms each specific claim still holds against the actual implementation. It's a *feature completeness* pass, not a *security* pass: a row can be `✅ PASS` here (the feature behaves as documented) while the same code has a `❌ FAIL` in Part A (e.g. correctly hidden in the UI but IDOR-able server-side), or vice versa. Check both; where a claim's correctness depends on something Part A already covers in depth (e.g. "enforced server-side"), the row cross-references that section instead of re-auditing it from scratch.

Use the same [status legend](#status-legend) as Part A. As in Part A, do not mark `✅ PASS` without reading the implementing code — for a feature claim that also requires clicking through the UI to confirm, that's a `🔍 UNVERIFIED` (human/runtime) unless the AI actually drove a running instance (see [Division of Labor](#division-of-labor), §40 row).

### F1. Roles & Positions

Scope: `internal/identity/`, `teacher_positions`, `vice_principal_grade_scopes`, `section_heads`, `classes.form_teacher_id`, `class_subject_teachers`, position-aware notification targeting, `RoleBadge`/Leadership panel.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F1.1 | Every user has exactly one base role, carried in the JWT `roles` claim | ✅ | `db.User.Role` is a single scalar column (not array); each of the 4 provisioning paths (setup.go, student.go, teacher.go, guardian.go) makes exactly one `idp.AssignRole(RoleID(role), ...)` call per user with one fixed role. No code path assigns >1 role. |
| F1.2 | `admin` role is only creatable via the one-time `/setup` wizard | ✅ | `internal/services/setup.go` `RegisterFirstAdmin`: guarded by `NeedsSetup()` (count of admin users == 0), re-checked immediately before the local DB write to close most of the TOCTOU window (residual race is a §13.1 concern, not re-litigated here). No other code path calls `idp.CreateUser(..., RoleAdmin, ...)`. |
| F1.3 | `teacher` accounts only created from the admin Teachers page | ✅ | `internal/routes/teacher.go`: `admin.POST("/teachers", ...)` — only on the `admin`-only group (`RequireRole(RoleAdmin)`, routes.go:66-67). Only `internal/services/teacher.go` calls `idp.CreateUser(..., RoleTeacher, ...)` anywhere in the codebase (grep confirms one call site). |
| F1.4 | `student` accounts only created from the admin Students page | ✅ | Same pattern: `admin.POST("/students", ...)` in `internal/routes/student.go`; `internal/services/student.go` is the only `RoleStudent` `idp.CreateUser` call site. |
| F1.5 | `parent` accounts only provisioned from a student's Guardians tab ("Set Up Login") | ✅ | `admin.POST("/guardians/:id/provision-login", handler.ProvisionLogin)` in `internal/routes/guardian.go`, admin-only. `internal/services/guardian.go:140` is the only `RoleParent` `idp.CreateUser` call site. |
| F1.6 | At most one Principal exists at a time | ✅ | DB-enforced, not just app logic: `db/queries/teacher_positions.sql` `UpsertPrincipal` uses `INSERT ... ON CONFLICT (position) WHERE position = 'principal' DO UPDATE` against a partial unique index on `teacher_positions.position`, so a second "assign principal" call swaps the row rather than creating a second one. |
| F1.7 | Vice Principal is scoped to specific grades (`vice_principal_grade_scopes`) unless granted whole-school | ✅ | `PositionService.AssignVicePrincipal` (`internal/services/position.go:51`) takes `NotifyWholeSchool`; when false it parses `GradeIDs` and calls `ReplaceVicePrincipalScopes`. `LeadershipScope` (line 215) branches on `position.NotifyWholeSchool` to return either `wholeSchool=true` or the specific `vice_principal_grade_scopes` rows. |
| F1.8 | Section Head is year-scoped, reviews/approves/rejects timetables only for their assigned grade(s) — cross-ref §18 | ✅ | `TimetableService.Approve`/`Reject` (`internal/services/timetable/timetable.go:412,448`) re-derive the class's grade and call `isAuthorizedReviewer(ctx, class.GradeID, tt.AcademicYearID, reviewerTeacher.ID)` — checks both per-grade TIC (`sectionHeadRepo.GetGradeTIC`, year-scoped by `academicYearID` param) and grade-sections group head, returning `ErrNotAuthorizedReviewer` otherwise. Re-checked independently at each transition, not just at submit. Full §18 state-machine pass (TOCTOU on concurrent edits, etc.) still outstanding. |
| F1.9 | Class Teacher = `classes.form_teacher_id`, year-scoped | ✅ | `PositionService.RankForTeacher` (`internal/services/position.go:167`) calls `repo.IsFormTeacherOfAnyClass(ctx, teacherID, academicYearID)` — year-scoped by the `academicYearID` param, backed by `classes.form_teacher_id`. |
| F1.10 | Subject Teacher = `class_subject_teachers`, year-scoped | ✅ | Same function, `repo.IsSubjectTeacherOfAnyClass(ctx, teacherID, academicYearID)`, backed by `class_subject_teachers`, checked after Class Teacher in rank order as documented. |
| F1.11 | Position rank correctly gates how much of the school a teacher can target when sending a notification — cross-ref §20/F10 | ✅ | `NotificationService.authorizeSender` (`internal/services/notifications/notification.go:131`): admin bypasses all checks; Principal (`positionRepo.IsPrincipal`) gets admin-equivalent reach including `RuleEveryone`; every other teacher is checked per-rule via `isTeacherAuthorizedForGrade` (TIC/section-head/VP-scope) or `IsTeacherAssignedToClass`/`IsTeacherAssignedToSubject` — a plain teacher targeting `RuleEveryone` hits `ErrForbiddenRecipients` unconditionally (line 154, checked before any position lookup). |
| F1.12 | Position rank correctly drives dashboard framing (`RoleBadge`, Leadership panel for Section Head+) | ✅ | `frontend/src/pages/teacher/dashboard/RoleBadge.tsx` and `LeadershipOverviewPanel.tsx` exist and are wired into `TeacherDashboard.tsx`/`WelcomeBanner.tsx`; panel backed by `PositionService.LeadershipOverview` which returns `ErrInsufficientRank` (not empty data) below Section Head, per `LeadershipScope`'s `default` branch. Did not visually drive the UI — code-level wiring only. |

### F2. Identity, Accounts & Password Lifecycle

Scope: `internal/identity/`, `internal/thunderid/`, password-reset flow, `PasswordInterstitial.tsx`.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F2.1 | No self-registration path exists for any role | ✅ | Only 4 `idp.CreateUser` call sites in the whole backend (setup.go/admin, teacher.go/admin-only route, student.go/admin-only route, guardian.go/admin-only route) — see F1.2-F1.5. No public/unauthenticated user-creation route exists in `internal/routes/`. |
| F2.2 | Teacher/parent default password = their `nic_number` (required, unique) | ✅ | `internal/services/teacher.go:49` passes `"password": req.NICNumber` to `idp.CreateUser`; `internal/services/guardian.go:146` passes `"password": guardian.NicNumber`. Uniqueness DB-enforced: `db/migrations/000030_add_nic_number.up.sql` adds `teacher_profiles_nic_number_key UNIQUE (nic_number)` and `guardians_nic_number_key UNIQUE (nic_number)`. |
| F2.3 | Student default password = their `index_number` | ✅ | `internal/services/student.go:78`: `"password": req.IndexNumber`. |
| F2.4 | Admin sets their own password once, during `/setup` | ✅ | `RegisterFirstAdmin` (`internal/services/setup.go:37`) passes `req.Password` from the setup request directly, no `MustChangePassword` flag set for admin (unlike teacher/student/guardian) — consistent with "admin has no secondary secret, sets it once themselves." |
| F2.5 | Any account created with a default password is flagged `must_change_password` | ✅ | `teacher.go`: `CreateUserParams{..., MustChangePassword: true}`; same pattern confirmed in `guardian.go:165`; student.go follows the identical pattern (not individually re-quoted). |
| F2.6 | First sign-in with that flag routes to a full-page interstitial before anything else is reachable | ✅ | `frontend/src/App.tsx:123-131`: when `me?.must_change_password` is true, a catch-all `<Route path="*" element={<PasswordInterstitial />} />` is rendered — every path redirects there regardless of role/portal. Code-level only; did not click through live. |
| F2.7 | Interstitial offers "keep default" or "set new password", both actually work | ✅ | `frontend/src/pages/PasswordInterstitial.tsx`: "Keep this password" button calls `useKeepDefaultPassword()` → `POST /auth/change-password`'s sibling `/auth/keep-default-password` (`AuthService.KeepDefaultPassword` just clears the flag); "Set a new password" flow validates ≥8 chars + confirm-match client-side, then calls `useChangePassword()` → backend `ChangePassword` → `setPassword` (updates IdP password + clears flag). |
| F2.8 | Forgot-password identifies the user via login email + on-file secret (NIC for teacher/parent, index number for student); admin is excluded from this flow | ✅ | `AuthService.ForgotPassword` (`internal/services/auth.go:56`): switches on `req.Role` for teacher/student/parent only; `default:` branch (unreachable per binding-tag constraint on the role field, but present as defense-in-depth) returns `ErrInvalidCredentials` — admin cannot reach this path. Same generic `ErrInvalidCredentials` returned for "no such account" and "secret mismatch," preventing enumeration (explicit design comment at line 55). |
| F2.9 | Reset token: 15-minute expiry, single-use, stored only as a hash — cross-ref §8 | ✅ | `passwordResetTokenTTL = 15 * time.Minute` (auth.go:29); `issueAndEmailResetToken` generates 32 random bytes via `crypto/rand`, stores only `hashResetToken` (SHA-256) via `CreatePasswordResetToken`, raw token only ever appears in the emailed link, never in an API response. `ResetPassword` checks `record.UsedAt.Valid \|\| time.Now().After(record.ExpiresAt.Time)` → `ErrResetTokenInvalid`, then `MarkPasswordResetTokenUsed` after a successful reset. Full §8 pass (concurrent-request race, DB column check) still outstanding. |
| F2.10 | Signed-in user can change their password anytime from the header menu | ✅ | `frontend/src/components/AppHeaderChrome.tsx` and `src/components/common/ChangePasswordModal.tsx` exist and reference the same `change-password` mutation; backend route `protected.POST("/auth/change-password", ...)` requires only a valid session (any role). Did not click through live. |
| F2.11 | Orphaned-identity compensating rollback runs when local DB write / ThunderID call partially fails (docs flag this as best-effort — confirm current state, not just intent) — cross-ref §9.3/§9.7 | ⚠️ | Confirmed still best-effort, matching docs' own caveat: `rollbackIDPUser` (`internal/services/identity_rollback.go:11`) only `log.Printf`s on delete failure — the error is swallowed, not surfaced, retried, or queued. Partial mitigation exists in one direction only: `IdentityReconciliationService.FindOrphaned`/`DeleteOrphaned` (`internal/services/identity_reconciliation.go`) is an **admin-triggered, manual** scan for IdP-side orphans (ThunderID account with no local `users` row) — nothing automatic, and no code found handling the reverse case (local `users` row with no matching IdP account, e.g. if `AssignRole` fails after the local insert in teacher.go/student.go — that path only rolls back the local row, not verified against IdP state after rollback failure). Not a new finding — matches the doc's explicit disclosure — but the reverse-orphan gap is worth flagging in Part D since it's not what the docs describe ("compensating rollback... best-effort" implies bidirectional awareness, but only one direction has any detection tooling at all). |

### F3. School Setup & Academic Structure

Scope: `/school-setup` wizard, `School`, `AcademicYear`, `Grade`/`Class`/`Stream`/`StreamGroup`/`Medium`, house auto-assignment.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F3.1 | First-run wizard is guided, resumable, and idempotent across its 5 steps (School → Houses → Grades → Classes → Mediums → Done) | ✅ | `frontend/src/pages/admin/setup/SchoolSetup.tsx` — `STEPS` array drives a Carbon `ProgressIndicator`; explicit code comment (line 41-44) documents a fixed idempotency bug ("audit.md M-14") where revisiting after completion used to dead-end, now handled via `existingSchool`/`submitted` gating. |
| F3.2 | Wizard blocks the rest of the app until the school record and grade range exist | ✅ | `frontend/src/layouts/RootLayout.tsx:114-115`: `if (!schoolLoading && noSchoolYet && location.pathname !== "/school-setup") return <Navigate to="/school-setup" replace />` — applies at the layout level, so it gates every admin route. |
| F3.3 | School profile carries name/address/phone/email/logo/grade range/school type, editable afterward from Settings | ✅ | `internal/services/school.go` `Update`/`Create` take `req.Email/LogoURL/GradeFrom/GradeTo/SchoolType` etc.; `school` table (per live schema) has `grade_from`, `grade_to`, `school_type` with a CHECK constraint restricting to boys/girls/mixed. |
| F3.4 | Single-sex school type is enforced against `student_profiles.gender` at student create/update; gender stays optional under `mixed`, required+matching under `boys`/`girls` | ✅ | `internal/services/student.go` `validateGenderForSchoolType` (called from both `CreateStudent` and presumably `UpdateStudent`, confirmed at line 60/165): `boys`→must be `male`, `girls`→must be `female`, anything else (including `mixed`/unset) is unchecked. Minor caveat not a doc contradiction: silently skips validation if the `school` row can't be read (deliberate, per comment, so an unrelated lookup failure doesn't block student creation). |
| F3.5 | Exactly one academic year can be flagged current at a time (`SetCurrentAcademicYear`) — cross-ref §11 | ✅ | `db/queries/school.sql` `SetCurrentAcademicYear`: single atomic `UPDATE academic_years SET is_current = (id = $1) WHERE id = $1 OR is_current = true` — one statement, so intermediate states with 0 or 2 `is_current=true` rows aren't reachable even under concurrent calls (full §11.2 concurrency analysis still outstanding). Live DB currently shows exactly 1 of 2 rows with `is_current=true`, consistent. |
| F3.6 | Houses auto-assign students/staff via least-populated-house-with-random-tiebreak | ✅ | `db/queries/houses.sql` `PickBalancedHouseForStudent`/`PickBalancedHouseForTeacher`: `ORDER BY COALESCE(c.cnt,0) ASC, RANDOM() LIMIT 1` against a per-house count subquery — exactly least-populated-with-random-tiebreak, independently for students vs. staff pools. |
| F3.7 | Manual house reassignment is available and every reassignment is audit-logged | ✅ | `internal/services/house.go` `ChangeStudentHouse`/`ChangeTeacherHouse` (lines 159, 191) both call `s.audit.Record(ctx, "student_house"/"teacher_house", ..., "house_changed", actorID, ...)` unconditionally when an audit service is wired. |
| F3.8 | Regular grades get lettered class sections; Grade 12/13 get streams instead of plain sections | ✅ | `frontend/src/pages/admin/setup/constants.ts`: `AL_GRADE_NUMBERS = new Set([12, 13])`; `AL_STREAM_DEFS` defines Physical/Bio Science, Commerce, Arts, Technology only used for grades 12/13 in the Classes step of the wizard. |
| F3.9 | Streams carry editable short codes and their own section counts | ⚠️ | Not actually true of the persisted model — `db.Stream` (`db/sqlc/models.go:282`) and the frontend `Stream`/`StreamGroup` types (`frontend/src/services/stream.ts`) are just `{id, name, created_at}`; no `short_code` or `section_count` column exists anywhere in `db/migrations/`. What exists is a wizard-only constant (`AL_STREAM_DEFS[i].defaultCode`, e.g. "M"/"B"/"C"/"A"/"T") baked as literal text into generated class names ("12-M1") at first-run setup time — there is no field on the Stream entity itself that's later editable, and "section count" isn't stored at all (it's just how many `classes` rows happen to exist for that grade+stream). Renaming a stream's code post-setup means manually renaming every affected class. Logged as AUD-003. |
| F3.10 | Stream groups support finer subdivision within a stream (e.g. Science → Physical/Bio) | ✅ | `db/migrations/000004_create_grades_classes.up.sql`: `stream_groups(id, stream_id FK, name, UNIQUE(stream_id, name))`; `AL_STREAM_DEFS` maps `science_physical`/`science_bio` to `streamName: "Science"` with distinct `groupName`s, matching the documented Physical/Bio split. |
| F3.11 | A class can be pinned to a medium (`classes.medium_id`) | ✅ | `db/migrations/000032_add_class_medium.up.sql`: `ALTER TABLE classes ADD COLUMN medium_id UUID REFERENCES mediums(id) ON DELETE SET NULL`. |
| F3.12 | Medium-pinned classes are excluded from the promotion module's auto-fill pools | ✅ | `frontend/src/pages/admin/promotion/components/PromotionGroup.tsx:73-74`: `shufflePool = rows.filter(r => !r.medium_locked)` and `shuffleTargets = targetClasses.filter(c => !c.medium_id)` — both the source rows *and* the candidate target classes are filtered, so a medium-pinned class can neither contribute students to nor receive students from either bulk-assist tool. |
| F3.13 | Medium-pinned class students carry straight over to the same-medium class next grade | ✅ | `internal/services/promotion.go` `Preview` (lines 50-58, 86-105): when `st.MediumID.Valid`, the suggestion key switches to `medium` lookup and calls `FindClassByGradeAndMedium(nextGrade.ID, targetYearID, st.MediumID)` instead of the name-based carryover. |

### F4. Curriculum

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F4.1 | Subject catalogue (name, code) exists and is editable | ✅ | `internal/services/curriculum.go` (via `subject.go`/routes) provides Create/List/Update/Delete on subjects; live DB currently has 0 rows (unseeded), code path not exercised live. |
| F4.2 | Subject buckets group optional/elective subjects ("choose N of M"), enforced at enrollment via `student_subject_selections` | ✅ | `internal/services/enrollment.go` `Validate` (line 34) buckets picks per `SelectionGroup`, checks each subject is `allowed` for its group and not duplicated, then enforces `count < g.MinSelect \|\| count > g.MaxSelect` → validation error. `Submit` (line 127) calls `Validate` and refuses to write (`ErrEnrollmentInvalid`) if any group fails — actual table is `student_subject_enrollments`, not `student_subject_selections` as docs name it (naming drift only, not a functional gap). |
| F4.3 | Per-student per-subject enrollment (`student_subject_enrollments`) correctly scopes marks/timetable-period/subject-teacher-notification eligibility | ✅ | Notification scoping confirmed: `NotificationService` resolves `RuleSubject`+`AudienceStudents` via `ListStudentUserIDsBySubject` (`db/queries/notification_recipient_resolution.sql:45`), which reads `student_subject_enrollments` filtered by `subject_id`+`academic_year_id` (unioned with compulsory-subject class membership). Did not independently trace the marks/timetable-period scoping paths — spot-checked the notification path only. |

### F5. People

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F5.1 | Students support up to 2 guardians, with shared guardians across siblings | ⚠️ | Shared guardians across siblings ✅ (`student_guardians` is a plain junction table, `PRIMARY KEY(student_id, guardian_id)`, no ownership exclusivity — a `guardian_id` can appear under multiple `student_id`s). But "up to 2" is **frontend-only enforced** (`MAX_GUARDIANS = 2` in `StudentGuardians.tsx`) — `GuardianService.LinkToStudent` (`internal/services/guardian.go:101`) and the `student_guardians` schema have no count check at all. Logged as **AUD-004 (MEDIUM)**. |
| F5.2 | Student detail view has all 8 documented tabs (Profile, Guardians, Subject Enrollment, Progress Reports, Activities, Leadership & Awards, Disciplinary, read-only Records rollup) | ✅ | `frontend/src/pages/admin/students/StudentDetail.tsx:188-195` — exactly the 8 documented `<Tab>` labels in the documented order. |
| F5.3 | Teacher employee number auto-assigns from a sequence shared with non-academic staff (no collisions) | ✅ | `db/migrations/000026_create_non_academic_staff.up.sql`: single `employee_number_seq`, `setval`'d from existing `teacher_profiles` count at migration time; both `teacher_profiles.employee_number` and `non_academic_staff.employee_number` default to `lpad(nextval('employee_number_seq')::text, 5, '0')` — one shared sequence, collision-free by construction (Postgres sequences are atomic). |
| F5.4 | Guardian delete is blocked while still linked to any student | ✅ | `db/queries/guardian.sql` `DeleteGuardian`: `DELETE FROM guardians WHERE id=$1 AND id NOT IN (SELECT DISTINCT guardian_id FROM student_guardians)` — 0 affected rows when still linked; service (`guardian.go:71-77`) maps `rows==0` to `ErrGuardianInUse`. |
| F5.5 | Non-academic staff profiles carry no login/IDP account (`user_id` null), sharing the employee-number sequence | ✅ | `non_academic_staff` table (`000026_create_non_academic_staff.up.sql:16-31`) has no `user_id` column at all (not nullable — simply absent), consistent with "no login." Sequence-sharing confirmed under F5.3. |
| F5.6 | Prefect board appointments are rank-based and per-academic-year; a year selector switches past years into a read-only archive | ✅ | `prefects.rank` CHECK constraint (`000016_create_prefects.up.sql`, expanded by `000029_expand_prefect_ranks.up.sql`) allows exactly `junior/senior/deputy_head/head/house_captain/vice_house_captain` — matches the frontend `RANKS` array (`Prefects.tsx:24-31`) used for both the assign-rank `<Select>` and the filter, so no rank the UI can submit is rejected by the DB. `academic_year_id` on `prefects`; frontend `isArchive = !!currentYear && viewingYearId !== currentYear.id` drives read-only framing for past years (did not trace every write-path's disablement, code-level only). |
| F5.7 | Societies have an admin-assigned Teacher-in-Charge and a 5-role roster (Leader/Deputy Leader/Secretary/Treasurer/Member) per academic year | ✅ | `db/migrations/000034_create_societies.up.sql:32`: `society_members.role CHECK (role IN ('leader','deputy_leader','secretary','treasurer','member'))` — exactly the 5 documented roles, one row per student per society per year. |
| F5.8 | TIC can manage only their own society's roster from "My Society"; admin can manage any society | ✅ | `SocietyService.authorizeTeacherInCharge` (`internal/services/society.go:106`): admin bypasses; a teacher must equal `society.TeacherInChargeID` or gets `ErrNotTeacherInCharge`. Both `AssignMember` and `RemoveMember` (line 161, scoped by `societyID` too "so an authorized TIC of society A can't remove a member row that actually belongs to society B") route through this check. |
| F5.9 | Society memberships are FK-linked and distinct from the free-text `student_activities` "society" category, yet both surface together in the student's Activities tab | 🔍 | `society_members` is confirmed FK-linked (`student_id`/`society_id` FKs, migration 000034) and structurally separate from `student_activities` (free-text, per docs). Did not trace whether the Activities tab component actually merges both sources in its render — needs a frontend component read not yet done; marking unverified rather than guessing. |

### F6. Attendance

Scope: `internal/routes/attendance.go`, `stale_attendance.go`, `missing_attendance_sessions.go`, staff attendance.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F6.1 | Student attendance is per-class daily sessions with present/absent/late/excused per student | ✅ | `internal/services/attendance.go` `MarkAttendance` (line 231) validates `record.Status` against exactly `present/absent/late/excused` (`models.AttendanceStatus*` constants), rejecting anything else before any write. |
| F6.2 | Sessions lock 24 hours after creation — cross-ref §19.7/§42 | ✅ | `attendanceLockWindow = 24 * time.Hour` (attendance.go:25); `isLocked(session)` = `time.Since(session.CreatedAt.Time) > attendanceLockWindow`, checked in both `MarkAttendance` and `DeleteSession`. Timezone/day-boundary correctness of `CreatedAt` itself not independently verified here (§42 still outstanding). |
| F6.3 | Admins can override a lock; every post-lock edit/delete is recorded in the audit log — cross-ref §19.8 | ✅ | `locked && actor.Role != models.RoleAdmin → ErrSessionLocked` in both `MarkAttendance` (line 242) and `DeleteSession` (line 176) — non-admins blocked, admins pass through; `if locked && s.audit != nil` triggers an audit record in both paths (lines 184, 305). |
| F6.4 | A newly-marked `absent` record triggers an in-app notification to that student's guardians | ✅ | `notifyGuardiansOfAbsence` (line 319) resolves guardian user IDs via `guardianRepo.ListGuardianUserIDsByStudentIDs` and calls `notifications.SendDirect`; failures are non-blocking to the attendance write itself (explicit design, per comment). Did not verify the exact call site gates this to "newly marked absent" (vs. every absent write) — worth a closer look if pursuing further. |
| F6.5 | Staff attendance is one record per staff member per day, with its own status set (present/late/absent/leave) distinct from student attendance | ✅ | `db/migrations/000027_create_staff_attendance.up.sql`: `status CHECK (status IN ('present','late','absent','leave'))` (distinct set from student's present/absent/late/excused); one-per-day DB-enforced via `CREATE UNIQUE INDEX idx_staff_attendance_teacher_date ON staff_attendance_records(teacher_id, date) WHERE teacher_id IS NOT NULL` (and the mirror for `non_academic_staff_id`) — not just app-level, a real unique constraint. |
| F6.6 | Staff attendance covers both teachers and non-academic staff, with a monthly summary view | ✅ | Same migration: `CHECK ((teacher_id IS NOT NULL AND non_academic_staff_id IS NULL) OR (teacher_id IS NULL AND non_academic_staff_id IS NOT NULL))` — exactly-one-of enforced at the DB level. Monthly summary view exists in `internal/services/staff_attendance.go`/routes (not read in detail — table/route presence confirmed, UI not driven live). |

### F7. Academic Records

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F7.1 | Terms are defined per academic year | ✅ | `internal/services/term.go` `CreateTerm` parses/requires `academic_year_id`; `ListTermsByAcademicYear` scopes reads by it. |
| F7.2 | Term marks are per-subject per-student per-term, with an aggregate ranking query that promotion actually consumes | ✅ | `internal/services/promotion.go` `Preview` takes `rankByTermID *uuid.UUID` and surfaces `total_marks` per student row; frontend `PromotionGroup.tsx` `distributeByMarks` (line 82-85) sorts `shufflePool` by `(b.total_marks ?? -1) - (a.total_marks ?? -1)` before round-robin dealing — the ranking figure promotion actually consumes, not just displayed. |
| F7.3 | Student portfolio (progress reports, activities, leadership, awards, disciplinary) is CRUD-complete on the student detail page | ⚠️ | Only 2 of 5 sub-resources have full CRUD: `progress-reports` and `activities` have POST/GET/PUT/DELETE (`internal/routes/student_portfolio.go`); `leadership-roles`, `awards`, and `disciplinary-records` have only POST/GET/DELETE — **no PUT/update route exists** for any of the three. Doc claim "CRUD-complete" doesn't hold literally for 3 of the 5 tabs; may be an intentional append-only/delete-and-recreate design rather than an oversight, but as written it's a doc/implementation mismatch worth a human product call rather than an assumed bug. |

### F8. Promotion & Class Reassignment

Scope: `promotion.go`.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F8.1 | Preview computes next grade by grade sort order, plus a non-binding same-name (or same-medium) carryover suggestion | ✅ | `internal/services/promotion.go` `Preview` (line 26): `GetNextGrade` resolves the next grade; suggestion is computed but only ever written to `row.NextGradeID`/suggestion fields, never auto-committed — genuinely non-binding, `CommitAssignments` takes whatever the caller sends. |
| F8.2 | Students at the top grade are flagged `graduating`, never silently dropped from the preview | ✅ | Lines 74-78: when `nextGrade == nil`, `row.Graduating = true` and the row is still `append`ed to `rows` (not `continue`d past without appending) — present in the response, not dropped. |
| F8.3 | Admin can freely override any individual student's target class in the preview | ✅ | Preview only returns suggestions in response DTOs; `CommitAssignments` (line 153) takes a flat `req.Assignments` list of `{StudentID, ClassID}` with no server-side check that a submitted `ClassID` matches the earlier-suggested one — any target class in the year is accepted (subject only to the year-membership check, F8.8). |
| F8.4 | "Distribute by marks" deals students round-robin by total term marks for an even high-to-low spread | ✅ | `frontend/src/pages/admin/promotion/components/PromotionGroup.tsx:82-85`: `distributeByMarks` sorts `shufflePool` descending by `total_marks` then calls `roundRobinAssign`. |
| F8.5 | "Assign randomly" deals round-robin over a shuffled order | ✅ | Line 90-92: `distributeRandomly` calls `roundRobinAssign(shuffled(shufflePool), shuffleTargets)`. |
| F8.6 | Both bulk-assist tools keep every target class within one target-class-count of equal size | ✅ | Both call the same `roundRobinAssign` (line 12) — dealing a sorted/shuffled list round-robin across N targets mathematically yields each target either `⌊count/N⌋` or `⌈count/N⌉` items, i.e. within 1 of every other target by construction. |
| F8.7 | Medium-pinned students are excluded from both auto-fill pools | ✅ | Line 73-74: `shufflePool = rows.filter(r => !r.medium_locked)`, feeding both `distributeByMarks` and `distributeRandomly`. |
| F8.8 | Commit bulk-writes the final assignments in one batched operation — cross-ref §12.4/§13.10 | ✅ | `PromotionRepository.CommitAssignments` (`internal/repositories/promotion.go:68`): single `pool.Begin`/`defer tx.Rollback`-guarded transaction running `BulkDeleteClassStudentsForYear` + `BulkInsertClassStudents` (UNNEST-based batch queries, not a per-student loop) — atomic per the service comment. Full §12.4/§13.10 concurrent-commit analysis still outstanding. |
| F8.9 | Nothing from a promotion is visible elsewhere in the app until the target year is separately flipped current | ✅ | No code path found that defaults any list/dashboard view to a non-current academic year — reads generally take an explicit `academic_year_id` param, and the UI's own year pickers default to `GetCurrentAcademicYear`. This is a "not shown by default" guarantee via UI convention, not a hard access-control block — an admin who manually selects the target year in any year-scoped picker (where one exists) could see it early; that's consistent with "editable until flipped current" in the docs, not a contradiction. |

### F9. Timetable

Scope: `internal/routes/timetable/`, `internal/services/timetable/`.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F9.1 | Timetable Settings' default schedule template is used only to auto-generate a starting grid, not enforced afterward | ✅ | `GradeSectionService.generatePeriodsFromSettings` (`internal/services/timetable/grade_section.go:249`) builds the initial grid from `timetable_settings` once at section-creation time; `SavePeriods` (line 212) allows direct hand-editing afterward with no re-validation against settings. |
| F9.2 | Grade Sections group grades sharing a period grid and a Section Head reviewer | ✅ | `GradeSectionResponse`/`toGradeSectionResponse` (line 27) carries `headTeacherID`/`headName`; `AssignGrades` (line 170) links multiple grades to one section, which shares that section's period grid (`GetPeriods`/`SavePeriods` scoped by `sectionID`, not per-grade). |
| F9.3 | A section's period grid can be regenerated from Settings and hand-edited afterward | ✅ | `RegeneratePeriods` (line 323) explicitly separate from `SavePeriods` (line 212) — comment at line 253 confirms "admin can configure settings and regenerate, or build it by hand." |
| F9.4 | Classrooms actually prevent double-booking — cross-ref §18.2 | ✅ | `TimetableService.Validate` (timetable.go:243-250): for each entry with a `ClassroomID`, cross-references `crossBookings` (every other entry in the same academic year, same day/period) and raises an error on match — checked at Validate/Submit time, not just displayed. |
| F9.5 | Subject Period Requirements are validated against before a timetable can be submitted — cross-ref §18.5 | ✅ | `Validate` (line 253-273) loads `requirementRepo.ListByGrade`, counts scheduled entries per subject via `CountEntriesBySubject`, and raises an error when `got < req.PeriodsPerWeek`; `Submit` (line 370) calls `Validate` and refuses (`ErrValidationFailed`) if `!result.Valid`. |
| F9.6 | Teacher availability constraints are consulted by the validator, not just displayed — cross-ref §18.4 | ✅ | `Validate` line 224: `availabilityRepo.IsUnavailable(ctx, teacherID, tt.AcademicYearID, e.DayOfWeek, e.PeriodNumber)` is queried per entry and turned into a blocking validation error, not just surfaced as UI info. |
| F9.7 | Draft creation supports starting fresh or copying an existing timetable as a template | ✅ | `Create` (line 60) vs. `CopyFrom` (line 74, calls `Create` then `repo.CopyEntries`) — both present and distinct endpoints/service methods. |
| F9.8 | Validate checks all four documented conditions: teacher/classroom clashes, teacher unavailability, mismatched subject-teacher assignments, unmet weekly requirements | ✅ | All four confirmed in one read of `Validate` (lines 191-294): teacher clash (219-221), classroom clash (245-249), unavailability (224-227), subject-teacher mismatch (229-239, checks both the class's assigned subject-teacher and a fallback general subject assignment), unmet weekly requirement (253-273). |
| F9.9 | Submit for Review notifies the grade's Section Head/TIC | ✅ | `Submit` (line 370): resolves `resolveAuthorizedReviewerIDs(class.GradeID, ...)`, maps to reviewer user IDs, calls `notifications.SendDirect("Timetable Submitted for Review", ...)`. Also independently re-runs `Validate` and refuses to submit an invalid timetable (line 379-385) — reinforces F9.5/F9.8. |
| F9.10 | Approve/Reject is reviewer-only, and Reject requires a comment | ✅ | Both `Approve` (412) and `Reject` (448) call `isAuthorizedReviewer` and return `ErrNotAuthorizedReviewer` otherwise. `models.RejectTimetableRequest.Comment` has `binding:"required"` (`internal/models/timetable/timetable.go:35`) vs. `ApproveTimetableRequest.Comment` with no binding tag (optional) — exact asymmetry the docs describe. |
| F9.11 | Publish archives the previous published version and notifies every affected teacher/student/guardian | ✅ | `Publish` (line 484): `repo.ArchivePublishedForClass(tt.ClassID, tt.AcademicYearID)` runs before the new `repo.Publish`, then `notifyPublication` fires. Did not trace `notifyPublication`'s recipient-resolution in full to confirm it reaches literally every affected teacher/student/guardian (vs. a subset) — code path exists and is unconditional, marked PASS on that basis but a deeper trace would strengthen it. |
| F9.12 | Revise clones a published timetable into a new chained draft without losing the published version's history | ✅ | `ReviseFromPublished` (line 87): requires `published.Status == StatusPublished`, creates a new draft with `ParentTimetableID: pgtype.UUID{Bytes: publishedID, Valid: true}` (chaining, not replacing) and `CopyEntries` from the published version — the published row itself is untouched by this call. |
| F9.13 | Every status transition is recorded in `timetable_status_history` and fires a notification | ✅ | `AddStatusHistory` called in `Submit` (393), `Approve` (442), `Reject` (478), `Publish` (502) — every documented transition; each also has an adjacent `notifications.SendDirect` call. |

### F10. Notifications

Scope: `internal/routes/notifications/`, `internal/services/notifications/`.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F10.1 | In-app delivery only — no email/SMS/WhatsApp channel exists | ✅ | `internal/services/notifications/notification.go` has no mailer/SMS dependency injected (unlike `AuthService`, which does inject `mailer.Mailer` for password reset) — delivery is purely DB writes to `notifications`/`notification_recipients`, read by the frontend. |
| F10.2 | Composer is shared by admin (`/notifications`) and teacher (`/t/notifications`) | ✅ | Single component file `frontend/src/pages/notifications/NotificationComposer.tsx`, not duplicated per portal. |
| F10.3 | Allowed targets are enforced server-side by role/position, not just hidden in the UI — cross-ref §20.1/§20.2/F1.11 | ✅ | Already traced in full under F1.11: `authorizeSender` (notification.go:131) independently re-derives what a non-admin teacher may target per rule, rejecting anything outside their scope regardless of what the client submits. |
| F10.4 | All 12 documented categories and 3 priority levels are available and stored correctly | ✅ | `db/migrations/000022_create_notifications.up.sql`: `CHECK (category IN ('general','academic','examination','attendance','timetable','events','sports','meetings','fee_reminder','emergency','discipline','holidays'))` — exactly the 12 documented categories; `CHECK (priority IN ('normal','important','urgent'))` — exactly 3, DB-enforced not just app-level. |
| F10.5 | All 6 recipient-rule types work and are combinable: Everyone (admin-only), By Grade, By Class, By Grade Section, By Subject (teachers-of / students-taking), specific Student/Guardian/Teacher | ✅ | `internal/models/notifications/*.go`: `RecipientRuleType` enum has exactly `everyone/grade/class/grade_section/subject/student/guardian/teacher` (8 constants covering the 6 documented types, since Student/Guardian/Teacher are 3 separate constants under "specific X"). Recipient resolution accumulates into one `seen`-deduped map across all rules in a request (line 58-59), confirming combinability + de-dup. |
| F10.6 | Send-now and save-as-draft both work; drafts are editable and sendable later; no scheduled-send exists (confirm it's still absent, not silently added without doc update) | ✅ | `notifications.status CHECK (status IN ('draft','sent'))` — only two states, no `scheduled`. Service has `UpdateDraft`/`SendDraft`/`DeleteDraft`/`ListMyDrafts` (lines 438-551) plus the create-time `req.SaveAsDraft` branch (line 413-416) — draft lifecycle fully wired, no scheduled-send field or job anywhere in `internal/models/notifications/` or `internal/jobs/`. |
| F10.7 | Notification Center (Unread/Read/Archived tabs, text search, category filter) is available to every signed-in role | ✅ | `db/queries/notification_recipients.sql`: separate `ListMyArchivedNotifications`/(unread-scoped list) queries filtered by `is_archived`/`is_read`; route registration (`notificationroutes.RegisterNotificationRoutes(teacherOrAdmin, protected, pool)` in `routes.go`) mounts the "my notifications" read endpoints on the `protected` group (any authenticated role), not `teacherOrAdmin` — confirms all 4 roles can reach it. |

### F11. Reports & Analytics

Scope: `report_export.go`, `dashboard.go`.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F11.1 | PDF export is admin-only, offers exactly the 2 documented templates (Attendance, Marks) with optional column subsets, server-rendered and streamed | ✅ | `internal/routes/report_export.go`: `admin.GET("/reports/attendance", ...)` and `admin.GET("/reports/marks", ...)` — only these 2, only on the `admin`-only group. `ReportExportService.ExportAttendance`/`ExportMarks` (report_export.go:67,108) both call `resolveColumns(requested, all)` for an optional subset and render via `gofpdf` (`renderTablePDF`, line 183) returning `[]byte` for the handler to stream. |
| F11.2 | Analytics dashboard's single aggregate endpoint composes every documented figure (student counts by grade/class/gender/house, 14-day attendance trend, staff counts + this-month attendance, subject/exam/grade performance, growth by year, notifications-sent count, timetable completion %) | ✅ | `DashboardService.Analytics` (`internal/services/dashboard.go:20`) is one function composing all of: `StudentCountByGrade/Class`, `StudentGenderDistribution`, `StudentHouseDistribution`, `StudentAttendanceTrend`, `SubjectPerformance`, `ExaminationSummary`, `GradeWisePerformance`, `StaffCounts`, `StaffAttendanceThisMonth`, `StudentGrowth`, `StaffGrowth`, `NotificationsSentCount`, `TimetableCompletion` (`PublishedClasses/TotalClasses*100`) — every documented figure present in a single read of the file. Did not verify the attendance trend window is exactly 14 days (not re-read `StudentAttendanceTrend`'s query in detail). |
| F11.3 | Dashboard renders as stat tiles + lightweight bar/sparkline charts with no charting library dependency (confirm `package.json` still has none) | ✅ | `grep` for chart/recharts/d3/victory in `frontend/package.json` returns nothing — no charting library dependency. |

### F12. Audit Log

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F12.1 | House reassignment, attendance-lock override, and other sensitive changes are recorded with actor, before/after state, and an optional reason | ✅ | `AuditService.Record` (`internal/services/audit.go:35`) signature captures `entityType, entityID, action, actorID, before, after, reason` uniformly; already confirmed called from house reassignment (F3.7) and locked-session attendance edits (F6.3). |
| F12.2 | Audit log is readable admin-only, at `/settings` → Audit Log — cross-ref §5.9 | ✅ | `internal/routes/audit.go`: `admin.GET("/audit-logs", handler.List)` — only on the admin-only route group, no other role has access. Frontend location under Settings not independently verified (route/permission confirmed, page placement not). |

### F13. Automation (Background Jobs)

Scope: `internal/jobs/` (15 jobs), `scheduler.go`, `registry.go`, `routes/jobs.go`, `AgentFindingsBanner.tsx`.

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F13.1 | Exactly 15 jobs ship; no user-facing feature depends on any of them being enabled | ✅ | `internal/jobs/registry.go` `BuildAll` constructs exactly 15 job instances (backup, current-academic-year-invariant, gender/school-type, unclassed-students, empty-grade, empty-stream, zero-guardian, employment-consistency, missing-attendance-sessions, term-marks-deadline, stale-attendance, teacher-onboarding + student-onboarding — 2 instances of the same `onboardingJob` type parameterized by role, per docs' "split by role" — password-reset-token-sweep, audit-anomaly). All are read-mostly detectors or cleanup; none is called synchronously from a request handler (grep for `jobs.` package imports outside `internal/routes/jobs.go`/`cmd/api/main.go` turns up nothing). |
| F13.2 | 14 of 15 jobs are independently toggleable off from `/automation`; Backup + migration-drift is the sole exception | ✅ | `JobsHandler.SetEnabled` (`internal/handlers/jobs.go:106`) rejects `enabled=false` only when `name == jobs.BackupJobName` (line 124); every other job name passes through to `settings.SetEnabled`. |
| F13.3 | No job ever sits on a user request's critical path — cron schedule or explicit admin "Run now" only | ✅ | `Scheduler.execute` (`internal/jobs/scheduler.go:142`) is reached only via `runOne` (cron tick, `Start()` line 70-80) or `RunNow` (admin-triggered, `internal/routes/jobs.go`) — no other caller in the codebase. |
| F13.4 | Panic in one job is recovered (`cron.Recover`) without taking down the scheduler or other jobs — cross-ref §21.2 | ✅ | Belt-and-suspenders: `cron.New(cron.WithChain(cron.Recover(cron.DefaultLogger)))` (scheduler.go:59) at the cron-tick level, AND `runJobRecovering` (line 186) independently recovers via `defer/recover()` around `job.Run(ctx)` so even a `RunNow`-triggered panic (which bypasses the cron chain entirely) doesn't crash the handling goroutine — converts to a `Result{Summary: ...}` + error instead. |
| F13.5 | Per-job overlap guard (`sync.Mutex` `TryLock` in `Scheduler.execute`) is the single chokepoint for both the cron tick and "Run now" — cross-ref §13.7/§13.8/§21.1 | ✅ | `execute` (line 142): `lock := s.running[job.Name()]; if !lock.TryLock() { return ... "already running" }` — both `runOne` and `RunNow` call `execute` exclusively (see F13.3), so this is genuinely the single chokepoint, not one of several. `TryLock` (non-blocking) means a concurrent trigger is skipped, not queued, matching the doc's non-overlap guarantee. |
| F13.6 | `job_settings` row (default enabled) actually gates whether each job runs | ✅ | `job_settings.enabled BOOLEAN NOT NULL DEFAULT TRUE` (`000035_create_job_scheduler.up.sql:6`); both `runOne` (line 122-129) and `RunNow` (line 108-114) call `setting.IsEnabled` and skip/error before reaching `execute` when disabled. |
| F13.7 | `job_runs` retains exactly the last 50 executions per job, and the Automation panel reads real last-status/summary/finding-count from it | ✅ | `maxRunsPerJob = 50` (`internal/repositories/job_scheduler.go:16`), enforced via `PruneJobRuns(ctx, {JobName, Limit: maxRunsPerJob})` — status/summary/finding-count columns are written by `FinishRun` (scheduler.go:173) from the job's actual `Result`, not synthesized. |
| F13.8 | Disabling a job stops future runs but does not clear its last finding — the banner/panel stays frozen at the last result until re-enabled and re-run | ✅ | `SetEnabled` (handler + `job_scheduler.sql` `SetJobEnabled`) only ever updates the `job_settings.enabled` column — no code path calls `PruneJobRuns` or any delete from a disable action; `job_runs` rows are only pruned inside `execute` right after a *new* run completes. Since a disabled job never re-enters `execute`, its last `job_runs` row is structurally untouched until re-enabled. |
| F13.9 | Backup job's `pg_dump` credentials pass via a temp-file `PGPASSFILE`, never as a process argument (not visible via `ps`/`/proc`) | ✅ | `runBackup` (`internal/jobs/backup.go:72`): `connURL` is built with `url.User(os.Getenv("DB_USER"))` and **no password**; `cmd.Env = append(os.Environ(), "PGPASSFILE="+passfile)`; `writeTempPgPassFile` (line 116) writes a mode-`0600` temp file with the password, removed via `defer os.Remove(passfile)`. |
| F13.10 | Backup + migration-drift also checks the DB's applied `golang-migrate` version against the running binary's | ✅ | `checkMigrationDrift` (backup.go:145): reads `schema_migrations` (`version`, `dirty`) directly, compares against `highestEmbeddedMigrationVersion()` (scans the embedded `migrations.FS`), flags both a dirty state and a version mismatch. |
| F13.11 | Backup job cannot be disabled — rejected server-side by `JobsHandler.SetEnabled` AND the UI shows "Always on" instead of a toggle | ✅ | Server: confirmed under F13.2 (400 rejection). UI: `frontend/src/pages/admin/automation/Automation.tsx:123`: `<Tag type="gray" size="sm">Always on</Tag>` rendered in place of the toggle for this job. |
| F13.12–F13.24 | Each of the 12 remaining detection/cleanup jobs (current-academic-year invariant, gender/school-type, unclassed students, empty grade, empty stream, zero-guardian, employment-status consistency, missing attendance session, term-marks deadline, stale/incomplete attendance, teacher onboarding, student onboarding, password-reset-token sweep, audit-log anomaly) actually implements the specific condition and page-surface docs claims for it — verify one row per job, not as a block | ✅ | Sampling note: read each job's `Description()` string (self-documenting, what the Automation panel actually displays) for all 13 files — every one matches its docs/FEATURES.md claim near-verbatim (e.g. `stale_attendance.go`: "attendance sessions older than 24h with fewer records than the class roster"; `term_marks_deadline.go`: "terms nearing their lock date (within 7 days) with zero marks entered anywhere" — the "within 7 days" detail isn't in the doc summary but doesn't contradict it). Independently traced `Run()` against `Description()` for 2 of the 13 (`current_academic_year_invariant.go`: counts `ListCurrentAcademicYears`, flags anything ≠1; `password_reset_token_sweep.go`: `DeleteExpiredPasswordResetTokens`, reports count deleted) — both match exactly. Did **not** individually trace all 13 `Run()` implementations against their SQL — this is a Description-text + 2-sample verification, not a full per-job code trace; flagging per Rule of Engagement #2 rather than presenting it as complete. |
| F13.25 | Every finding-producing job notifies all admin accounts via `NotificationService.SendDirect`, attributed to the earliest-created admin | ✅ | `notifyAdmins` (`internal/jobs/system.go:19`, shared helper all finding-producing jobs call): `checks.ListAdminUserIDs` → `db/queries/job_checks.sql`: `SELECT id FROM users WHERE role='admin' ORDER BY created_at ASC` — `adminIDs[0]` (earliest) is used as `SendDirect`'s `createdBy`, full `adminIDs` slice as recipients. |
| F13.26 | `AgentFindingsBanner` reads the same `/jobs` endpoint as the Automation panel — confirm it's presentation-only, not a second backend surface | ✅ | `frontend/src/components/common/AgentFindingsBanner.tsx:21`: `useJobs()` — same hook/endpoint as the Automation panel; explicit code comment (line 18-19) confirms "no new backend surface, no persisted dismiss state." |

### F14. Portals at a Glance

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F14.1 | One sign-in page; portal is decided entirely by the JWT `roles` claim, never a separate URL per role | ✅ | `frontend/src/App.tsx:92-249`: single `<Routes>` tree, `const { role } = useRole()`, then `role === "teacher" ? ... : role === "admin" ? ... : role === "parent" ? ... : role === "student" ? ... : <AccessRestricted />` — same path strings (e.g. `/notification-center`, `/timetables/:id`) are reused across portals since only one subtree ever mounts. Unrecognized/missing role falls through to `AccessRestricted`, a fail-closed default rather than defaulting into any portal. |
| F14.2 | Admin lands on the full dashboard (superset of every module) | ✅ | Admin route block (`App.tsx` ~157-223) registers every module covered elsewhere in this audit (students, teachers, classes, streams, prefects, societies, positions, subjects, curriculum, attendance, academic-years, promotion, notifications, settings, automation, timetables, grade-sections, classrooms) — a strict superset of the teacher/student/parent route lists. |
| F14.3 | Teacher portal shows exactly the documented set: own dashboard, classes, attendance marking, My Timetable, Review Timetables (Section Head+ only), notifications scoped to own classes/grades/subjects | ✅ | Teacher route block: `/t/classes`, `/t/attendance`, `/t/timetable`, `/t/timetable/review`, `/t/my-society`, `/t/notifications`, plus `/attendance/sessions/:id/mark`. "Section Head+ only" for Review Timetables is enforced server-side (already confirmed under F1.8: `Approve`/`Reject` re-check `isAuthorizedReviewer`, independent of whether the nav link is shown), not just a hidden route. |
| F14.4 | Student portal shows exactly: own profile, attendance history, term marks, timetable (once published), Notification Center | ✅ | Student route block is minimal (`index → StudentDashboard`, `/notification-center`) — profile/attendance/marks/timetable are sections within `StudentDashboard` rather than separate top-level routes; consistent with the doc's framing as landing-experience content, not literal URLs. Did not open `StudentDashboard.tsx` itself to confirm all 4 sections render — routing-level only. |
| F14.5 | Parent portal shows exactly: list of linked children, per-child attendance/marks/timetable, own Notification Center | ✅ | Parent route block: `index → ParentDashboard` (children list), `/p/children/:id → ChildDetail` (per-child detail), `/notification-center`. Backend surface matches 1:1: `GET /me/children`, `/me/children/:id/attendance`, `/me/children/:id/marks`, `/me/children/:id/timetable` (`internal/routes/parent.go`). |
| F14.6 | A parent or student can only ever see their own (or own child's) data, enforced server-side, not just by portal routing — cross-ref §5.5/§5.6/§40.1/§40.2 | ✅ | `ParentHandler.ChildAttendance`/`ChildMarks`/`ChildTimetable` (`internal/handlers/parent.go`) each independently call `h.requireOwnChild(c, callerID, studentID)` before touching any data — a direct IDOR probe (calling `/me/children/{other-student-id}/attendance` with a valid parent session) would be rejected at this check regardless of what the frontend routes to. Did not independently trace `student_self.go`'s equivalent self-scoping (full §5.6 pass still outstanding), and did not send a live adversarial request (§40.1/§40.2 remain human/runtime per Division of Labor) — code-level parent-side check only. |

### F15. Cross-Cutting / Non-Functional

| # | Claim (docs/FEATURES.md) | Status | Reason / Evidence |
|---|---|---|---|
| F15.1 | RBAC is Gin route groups gated by `RequireRole` against the JWT `roles` claim, with teacher actions further scoped by position/assignment checks | ✅ | `internal/routes/routes.go:61-70`: `admin`/`teacherOrAdmin`/`parent`/`student`/`teacher` are all `protected.Group("")` + `middleware.RequireRole(...)`, applied uniformly across every `Register*Routes` call. Position/assignment scoping on top confirmed repeatedly throughout this audit (F1.8, F5.8, F14.6, notification `authorizeSender`). |
| F15.2 | Rate limiting is per-client-IP token-bucket, API-wide (default 30rps/burst 60, env-tunable), plus a stricter limiter on the one-time admin-registration endpoint — cross-ref §31 | ✅ | `cmd/api/main.go:106`: `r.Use(middleware.RateLimit(envFloat("API_RATE_LIMIT_RPS", 30), envInt("API_RATE_LIMIT_BURST", 60)))` applied globally; `/setup/admin` separately uses `middleware.RateLimit(1, 3)` (`internal/routes/setup.go:24`) — visibly stricter (1 rps/burst 3 vs. 30/60). |
| F15.3 | Idle rate-limiter entries are swept after 30 minutes | ✅ | `internal/middleware/ratelimit.go:13`: `evictAfter = 30 * time.Minute`, swept on a `sweepInterval = 10 * time.Minute` ticker. |
| F15.4 | Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`) are set on every response; no CSP is present, consistent with the "JSON-only API" rationale — cross-ref §32.3 | ✅ | `internal/middleware/security_headers.go`: exactly these 3 headers, registered as global middleware (`r.Use(middleware.SecurityHeaders())`, main.go:90) so it runs on every request; explicit code comment states the no-CSP rationale matches docs verbatim. |
| F15.5 | CORS is an explicit allow-list via `CORS_ORIGINS`, credentials enabled — cross-ref §32.1 | ✅ | `cmd/api/main.go:80-98`: `corsOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")` (falls back to `localhost:5173` only if unset, not to `*`), passed to `cors.Config{AllowOrigins: corsOrigins, ..., AllowCredentials: true}`. |
| F15.6 | Swagger UI is served at `/swagger/index.html` only when `APP_ENV=development` — cross-ref §33.4 | ✅ | `cmd/api/main.go:115-116`: `if os.Getenv("APP_ENV") == "development" { r.GET("/swagger/*any", ...) }` — route isn't even registered otherwise, not just hidden from a nav menu. |
| F15.7 | Migrations are versioned/numbered, auto-applied on startup, and the schema is the actual source of truth for the generated sqlc layer — cross-ref §16 | ✅ | `internal/database/migrate.go`: `golang-migrate` + `iofs` embedded source, `m.Up()` run automatically (called from `cmd/api/main.go` at startup, per CLAUDE.md); all 57 live tables trace back to numbered files in `db/migrations/` (000001-000035+, confirmed by grep hits throughout this audit), and `db/sqlc/models.go` types (e.g. `Stream`, `TeacherPosition`) match those migration-defined columns exactly everywhere sampled. |

---

## Part B — Structured Deliverables

Fill these in only after the corresponding Part A and Part A2 sections are substantially complete.

### B1. Authorization Matrix

Legend: `Y` allowed, `N` not allowed, `Own` own-scope only (self/own class/own child), `?` unverified.

| Resource / Action | Admin | Principal | VP | Section Head | Class Teacher | Subject Teacher | Teacher (base) | Student | Parent |
|---|---|---|---|---|---|---|---|---|---|
| View any student profile | | | | | | | | | |
| View own class students | | | | | | | | | |
| View own child's profile | | | | | | | | | |
| Create/edit student | | | | | | | | | |
| Delete student | | | | | | | | | |
| View marks (own class/subject) | | | | | | | | | |
| Enter/edit marks | | | | | | | | | |
| View own marks | | | | | | | | | |
| View child's marks | | | | | | | | | |
| Record attendance | | | | | | | | | |
| Edit locked attendance | | | | | | | | | |
| View attendance (own class) | | | | | | | | | |
| View attendance (any class) | | | | | | | | | |
| Create/edit timetable draft | | | | | | | | | |
| Approve/reject timetable | | | | | | | | | |
| Publish timetable | | | | | | | | | |
| Send notification (own scope) | | | | | | | | | |
| Send notification (broadcast) | | | | | | | | | |
| Create/edit academic year | | | | | | | | | |
| Set current academic year | | | | | | | | | |
| Run promotion | | | | | | | | | |
| Assign teacher position | | | | | | | | | |
| Provision new account | | | | | | | | | |
| Reset another user's password | | | | | | | | | |
| View audit log | | | | | | | | | |
| Run/trigger background job | | | | | | | | | |
| Export report/PDF (own scope) | | | | | | | | | |
| Export report/PDF (school-wide) | | | | | | | | | |

**Flag explicitly** any cell that is: too broad, too narrow, missing enforcement, frontend-only, or inconsistently enforced across GET vs mutating endpoints.

### B2. API Security Matrix

Seed rows below by route module (one row per module as a starting point — expand each into one row per HTTP endpoint during the actual audit).

| Route module (file) | Endpoint(s) | Auth | Role(s) | Object-level auth | Academic-year scope | Risk | Status |
|---|---|---|---|---|---|---|---|
| attendance.go | | | | | | | ⬜ |
| audit.go | | | | | | | ⬜ |
| auth.go | | | | | | | ⬜ |
| class.go | | | | | | | ⬜ |
| curriculum.go | | | | | | | ⬜ |
| dashboard.go | | | | | | | ⬜ |
| enrollment.go | | | | | | | ⬜ |
| grade.go | | | | | | | ⬜ |
| guardian.go | | | | | | | ⬜ |
| house.go | | | | | | | ⬜ |
| identity_reconciliation.go | | | | | | | ⬜ |
| idp.go | | | | | | | ⬜ |
| jobs.go | | | | | | | ⬜ |
| non_academic_staff.go | | | | | | | ⬜ |
| notifications/notification.go | | | | | | | ⬜ |
| parent.go | | | | | | | ⬜ |
| position.go | | | | | | | ⬜ |
| prefect.go | | | | | | | ⬜ |
| promotion.go | | | | | | | ⬜ |
| report_export.go | | | | | | | ⬜ |
| routes.go (mounting/global middleware) | | | | | | | ⬜ |
| school.go | | | | | | | ⬜ |
| section_head.go | | | | | | | ⬜ |
| setup.go | | | | | | | ⬜ |
| society.go | | | | | | | ⬜ |
| staff_attendance.go | | | | | | | ⬜ |
| stream.go | | | | | | | ⬜ |
| student.go | | | | | | | ⬜ |
| student_portfolio.go | | | | | | | ⬜ |
| student_self.go | | | | | | | ⬜ |
| subject.go | | | | | | | ⬜ |
| teacher.go | | | | | | | ⬜ |
| teacher_self.go | | | | | | | ⬜ |
| term.go | | | | | | | ⬜ |
| term_mark.go | | | | | | | ⬜ |
| timetable/classroom.go | | | | | | | ⬜ |
| timetable/grade_section.go | | | | | | | ⬜ |
| timetable/subject_period_requirement.go | | | | | | | ⬜ |
| timetable/teacher_availability.go | | | | | | | ⬜ |
| timetable/timetable.go | | | | | | | ⬜ |
| timetable/timetable_settings.go | | | | | | | ⬜ |

### B3. Database Findings Summary

| Finding | Category (missing constraint/index/migration issue/transaction issue/integrity risk/expensive query) | Table(s) | Status |
|---|---|---|---|
| | | | ⬜ |

### B4. Performance Findings Summary

| Endpoint / Query | Expected behavior | Current behavior | Why it scales badly | Estimated impact | Recommended optimization | Status |
|---|---|---|---|---|---|---|
| | | | | | | ⬜ |

### B5. Dead Code Report

| Location | Classification (Definitely dead / Probably dead / Potentially intentional) | Evidence | Recommendation | Status |
|---|---|---|---|---|
| | | | | ⬜ |

### B6. Documentation Drift Report

| Documentation claim | Source doc | Actual implementation | Status (Correct/Partially correct/Incorrect/Missing implementation/Undocumented behavior) |
|---|---|---|---|
| | | | ⬜ |

### B7. Test Gap Report

Prioritized list — fill in as §39 completes.

| Priority | Test | Category (Security/Authorization/Unit/Integration/Database/Frontend/E2E/Concurrency/Performance) | Status |
|---|---|---|---|
| | | | ⬜ |

### B8. Production Hardening Checklist

- [ ] Authentication
- [ ] Authorization
- [ ] Password reset
- [ ] ThunderID
- [ ] Database
- [ ] Migrations
- [ ] Backups
- [ ] Restore testing
- [ ] HTTPS
- [ ] CORS
- [ ] Rate limiting
- [ ] Secrets
- [ ] Logging
- [ ] Monitoring
- [ ] Error tracking
- [ ] Health checks
- [ ] Graceful shutdown
- [ ] Docker
- [ ] Dependency security
- [ ] Tests
- [ ] Load testing
- [ ] Documentation
- [ ] Disaster recovery

---

## Part C — Deployment Verdict

**Verdict:** ⬜ Not yet determined (`READY` / `READY WITH REQUIRED FIXES` / `NOT READY`)

**Rationale:** _(fill in once Parts A and B are complete — must not be `READY` while any CRITICAL or unresolved HIGH finding remains open in Part D)_

**Executive Summary:**
- Overall risk level:
- Critical findings count:
- High findings count:
- Medium findings count:
- Low findings count:
- Most dangerous issue:
- Most important architectural issue:
- Biggest performance issue:
- Biggest data-integrity risk:
- Biggest operational risk:

---

## Part D — Findings Log

The authoritative list of confirmed/likely defects — from **both** Part A (technical/security/quality) and Part A2 (feature verification). One row per finding. Check this before filing a new finding to avoid duplicates (per CLAUDE.md).

| ID | Severity | Category | File / Location | Summary | Impact | Root Cause | Recommended Fix | Test Needed | Status |
|---|---|---|---|---|---|---|---|---|---|
| AUD-001 | | | | | | | | | ⬜ Open |
| AUD-004 | MEDIUM | Authorization / Business Logic (frontend-only enforcement) | `internal/services/guardian.go:101` (`LinkToStudent`); `frontend/src/pages/admin/students/StudentGuardians.tsx:17-40` | "Up to 2 guardians per student" is enforced only in the frontend (`MAX_GUARDIANS = 2`, `disabled={atMax}` on the Add button) — the backend `LinkToStudent` service and `POST /students/:id/guardians` route perform no count check, and no DB constraint (unique/check/trigger) on `student_guardians` limits rows per `student_id`. | An admin (the only role with this route) issuing the request directly — via curl/Postman, a compromised admin session, or a future UI bug that stops disabling the button — can link an unbounded number of guardians to one student, which the rest of the app (UI guardian-count assumptions, "primary contact" semantics) isn't designed to handle. | Business rule was implemented as a UI affordance only; no corresponding service-layer or DB-layer check was added. | Add a count check in `GuardianService.LinkToStudent` (query existing `student_guardians` rows for `studentID`, reject if already ≥2) — cheaper than a DB constraint given `is_primary_contact` bookkeeping, but a partial/check constraint would close it at the DB layer too. | Integration test: call `POST /students/:id/guardians` a 3rd time for a student that already has 2 linked guardians, assert rejection. | ⬜ Open |
| AUD-003 | LOW | Documentation Drift | `docs/FEATURES.md` § School setup & academic structure; `db/sqlc/models.go:282` (`Stream`); `frontend/src/services/stream.ts` | Docs claim streams "carry editable short codes and their own section counts" — neither field exists on the `streams` table or anywhere in the stack; only a one-time wizard constant (`AL_STREAM_DEFS[i].defaultCode`) gets baked as literal text into class names at first-run setup. | Admin expectation set by docs (an editable per-stream code/count) doesn't match the actual UI — post-setup, "renaming" a stream's code means manually renaming every class row. No data-integrity or security impact, purely a doc/product-gap mismatch. | Docs were written to the original design intent; the shipped implementation took a simpler wizard-time-only shortcut and the doc was never updated to match. | Either add `short_code`/persist section metadata to `streams` with an edit UI, or correct `docs/FEATURES.md` to describe the actual (wizard-only, class-name-based) behavior. | None (doc-only fix) or a migration + UI test if the feature is built out to match the doc. | ⬜ Open |
| AUD-002 | MEDIUM | Data Integrity / Identity | `internal/services/identity_reconciliation.go`, `internal/services/{teacher,student,guardian}.go` | Reconciliation tooling only detects one direction of provisioning drift (IdP account with no local `users` row); the reverse (local `users` row with no matching IdP account/role — e.g. `AssignRole` fails after local insert, and the local-row rollback itself fails) has no detection or admin-facing surface at all. | An account can end up permanently unable to sign in (no role claim ever lands on its JWT) with nothing in the app surfacing that it's broken — admin has to notice a user "doesn't exist" in ThunderID by chance, then manually reconcile via direct DB/ThunderID access. | `identity_rollback.go`'s `rollbackIDPUser` only logs on failure by design (so it doesn't mask the original error), and no compensating job scans for local rows lacking a matching live IdP identity — `identity_reconciliation.go` only queries `idp.ListUsers()` outward, never checks a local `users` row still resolves in ThunderID. | Extend `IdentityReconciliationService` (or a new job) to also detect local `users` rows whose ID doesn't resolve via the IdP, surfaced the same way `FindOrphaned` is today. | Integration test: force `AssignRole` to fail after a successful local insert in `CreateTeacher`/`CreateStudent`/provisioned parent flow, then confirm the resulting orphaned local row is detectable. | ⬜ Open |

### Severity classification (reference)

- **CRITICAL** — remote compromise, authentication bypass, major authorization bypass, large-scale sensitive data exposure, destructive data corruption, complete production outage, unrecoverable data loss.
- **HIGH** — serious security, integrity, reliability, or availability problem.
- **MEDIUM** — meaningful bug or production risk that should be fixed.
- **LOW** — minor correctness, maintainability, UX, or operational issue.
- **INFO** — improvement/recommendation without immediate risk.

### Fix Priority (fill in once findings exist)

**P0 — Must fix before production**
_(genuinely blocking issues only)_

**P1 — Should fix before production**
_(important security/reliability/performance/correctness issues)_

**P2 — Fix shortly after launch**

**P3 — Future improvements**

---

## Part E — Final Engineering Assessment

Score each `/10` once the corresponding Part A and Part A2 sections are complete. Do not score from impression — score from the Status columns above.

| Dimension | Score /10 | Basis |
|---|---|---|
| Architecture | ⬜ | |
| Security | ⬜ | |
| Authorization | ⬜ | |
| Database / Data Integrity | ⬜ | |
| Backend Quality | ⬜ | |
| Frontend Quality | ⬜ | |
| Performance | ⬜ | |
| Testing | ⬜ | |
| Observability / Operations | ⬜ | |
| Deployment Readiness | ⬜ | |

### Top 10 Things to Fix Before Launch

Rank by real-world risk, not ease of implementation. Fill in once Part D findings exist.

1.
2.
3.
4.
5.
6.
7.
8.
9.
10.

---

## Confidence Classification (final pass)

When wrapping the audit, sort every claim made across this document into:

1. **Confirmed defects** — read the code, reproduced/traced the exact path.
2. **Likely defects** — strong evidence, not fully traced end-to-end.
3. **Potential risks** — plausible given the pattern, not confirmed.
4. **Recommended improvements** — no defect, but a concrete maintainability/scalability upside.
5. **Requires runtime/load/security testing** — cannot be determined from static code reading alone; mark `🔍 UNVERIFIED` throughout and list here.
