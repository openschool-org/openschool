# 0010. Teacher leave follows the Sri Lankan public service scheme

**Status:** Accepted

## Context

Government school teachers in Sri Lanka apply for leave on paper: the
teacher fills in the leave form, writes down who will take their periods
(the relief arrangement), and the Principal, or a Vice Principal acting
for them, signs it. The office then enters it in the leave register and
the staff attendance book. Teachers also routinely arrive at school and
need to leave before the day ends, which is short leave or a half day of
casual leave rather than a full day.

OpenSchool already had staff attendance with a `leave` status, but no way
to apply for, approve or count leave. The rules below come from the
Establishments Code (Chapter XII) and the maternity leave circulars as
they apply to teachers. They are encoded in
`backend/internal/modules/leave/rules.go`.

## Decision

**Leave types and limits**

| Type | Limit enforced | Notes |
| --- | --- | --- |
| Casual | 21 working days per calendar year | Can be a morning or afternoon (0.5 day). Does not carry forward. |
| Medical (sick) | 20 working days per calendar year | Full days only. The form reminds the teacher to hand in a medical certificate for more than 2 days; the certificate itself stays on paper. |
| Short leave | 2 per calendar month, each at most 90 minutes | Arrive late or leave early. Counted per month, not in days. |
| Duty | None | Official work away from school (paper marking, seminars, sports meets). Can be a half day. |
| Maternity | 84 working days per application | The full-pay period. The further half-pay and no-pay periods are applied for as no-pay leave. |
| No-pay | None | Recorded for the register and salary purposes. |

- The leave year is the calendar year. An application cannot cross
  31 December; the teacher applies for each year separately, so each
  application charges exactly one year's balance.
- Days are counted Monday to Friday. Public and school holidays are not
  known to the system, so a leave that spans one is charged for it.
- Pending applications count against the balance, so a teacher cannot
  queue more leave than they have left.
- A teacher cannot have two pending or approved applications that overlap.
- Leave can be applied for after the fact (medical leave is usually handed
  in on return), so there is no "must be in advance" rule.

**Who approves**

- The Principal or any Vice Principal approves or rejects a teacher's
  leave. A rejection needs a reason. Only one decision can win: the
  decision applies only while the application is still pending.
- A Vice Principal's leave is approved by the Principal.
- The Principal's leave is approved by the Zonal Director, outside the
  school. An administrator records that decision in OpenSchool. No one
  decides their own leave.
- Administrators can decide any application.
- A teacher can cancel their own application while it is still pending.
  Approved leave is not cancelled by the teacher; they speak to the
  Principal.

**Relief**

- The form lists every period the teacher would miss from the published
  timetable (for a half day, the periods before or after the interval;
  for short leave, the periods that overlap the time away), and the
  teacher names a relief teacher for each one. Candidates are teachers
  who are free in that period and not themselves away, with those doing
  the fewest relief periods that day listed first.
- A period without a relief teacher is shown to the approver as "Not
  arranged" to sort out before approving.
- Only the first 10 working days are listed. Longer leave (maternity, long
  medical leave) is covered by naming an acting teacher instead.
- The Principal's daily relief sheet lists every covered period for a date.

**On approval**

- Every working day of full-day leave is marked `leave` on the staff
  attendance register, replacing an `absent` mark if there was one.
  Half-day and short leave leave attendance as marked, since the teacher
  was at school.
- The teacher, each relief teacher and the acting teacher get an in-app
  notification. New applications notify the Principal and Vice Principals.

## Consequences

- Balances are always computed from approved applications, so there is no
  balance table to fall out of step, and the register is the single
  source of truth.
- There is no holiday calendar, carry-forward, opening balance for leave
  taken before the school started using OpenSchool, or leave for
  non-academic staff. Each is a reasonable follow-up.
- The approver cannot edit relief arrangements in OpenSchool yet; they
  reject with a note and the teacher applies again, or arrange the
  missing cover on paper.
