# 0008. Self-service account activation with school-issued codes

**Status:** Accepted

## Context

Admins created every login by hand: about 2,500 per school, each with the
NIC or index number as the first password. Those numbers are printed on
ID cards and report cards, so they are weak secrets. Open sign-up is not
an option: anyone could register as a student or parent and see real
children's data.

## Decision

- The school still creates the **records** (in bulk, through Intake). People
  create their own **logins** by claiming a record.
- To claim, a person needs a one-time **activation code** from the school,
  plus their index number (student) or NIC number (parent), plus an email
  they prove they own through a 30-minute link. They then choose their own
  password. There is no default password.
- Codes are random (10 characters, about 49 bits), stored only as SHA-256
  hashes, single use, and expire (1 to 90 days, set by the admin). Issuing
  a new code revokes the old one. Admins can cancel a whole batch.
- Five wrong identifiers lock a code for an hour. Start is rate limited per
  IP, per code and per identifier. Responses never say which part failed.
- The code is claimed in the database before ThunderID is called, so two
  requests cannot both activate. Any later failure undoes the ThunderID
  user, the local user and the claim.
- Each role has its own switch in **Settings > Account activation**, off by
  default, with an optional opening and closing date.
- ThunderID's own self-registration stays off. Only the backend creates
  ThunderID users, so roles and profile links stay correct.

## Consequences

- Students and parents only. `teacher_profiles.user_id` is `NOT NULL`, so a
  teacher record can't exist without a login yet. Teacher activation needs
  teacher records without logins first.
- A lost printed slip plus a known index number is enough to activate. The
  admin cancels the batch and reissues; the audit log shows who activated
  and with which email.
- A parent's verified email replaces the email on their guardian record.
- Admin-created logins with default passwords still work, unchanged.
