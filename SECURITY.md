# Security Policy

## Supported versions

OpenSchool does not yet publish tagged releases — `main`/`development` is
the only supported line, and every deployment is expected to track it
directly. Once versioned releases begin, this section will list which
lines receive security fixes.

## Reporting a vulnerability

**Please do not open a public GitHub issue for a security vulnerability.**

Report it privately using GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
feature on this repository (**Security** tab → **Report a vulnerability**).
This opens a private advisory visible only to you and the maintainers,
where you can describe the issue and we can coordinate a fix and a
disclosure timeline before any public details are published.

If you're unable to use GitHub's private reporting for any reason, contact
a maintainer listed on the [openschool-org](https://github.com/openschool-org)
GitHub organization directly.

When reporting, please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (affected endpoint/page, request, or user action)
- The commit or version you tested against

We aim to acknowledge new reports within a few business days. As a
volunteer-maintained project we can't commit to a fixed SLA, but security
reports are prioritized over other work.

## Scope

This applies to the OpenSchool codebase itself (`backend/`, `frontend/`,
and the database migrations under `backend/db/migrations/`). It does not
cover the security of ThunderID (the identity provider OpenSchool
integrates with) or of any specific deployment's infrastructure
(reverse proxy, TLS termination, hosting environment) — those should be
reported to the relevant project or your own operations team.

## Known issues and disclosure

OpenSchool undergoes periodic internal security/code-quality review, with
findings tracked in [`audit.md`](./audit.md) at the repository root
alongside remediation status. If you find something not already listed
there, please still report it privately rather than assuming it's known —
`audit.md` reflects the state as of its last update, not necessarily the
current `main` branch.

**Operators:** before deploying an instance that will hold real student,
guardian, or staff data, review `audit.md`'s Critical and High findings —
as of this writing, at least one Critical finding affecting the
self-service password-reset flow has not yet been remediated.
