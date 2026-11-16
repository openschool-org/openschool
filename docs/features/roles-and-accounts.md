# Roles and accounts

Part of the [feature guide](../FEATURES.md).

## Roles & positions

Authentication and the four base roles come from **ThunderID**, the external
identity provider (see [`THUNDERID.md`](../THUNDERID.md)). Every user has
exactly one base role, carried in the `roles` claim of their JWT:

| Role | Identity source |
| --- | --- |
| `admin` | Registered once via the `/setup` wizard on a fresh instance |
| `teacher` | Created from the admin's **Teachers** page |
| `student` | Created from the admin's **Students** page, or self-activated with a school code |
| `parent` | Provisioned from a student's **Guardians** tab ("Set Up Login"), or self-activated with a school code |

On top of the base `teacher` role, an **in-app position layer** (not backed
by ThunderID - see [ADR 0002](../adr/0002-in-app-position-layer.md))
adds a hierarchy used for notification reach and dashboard framing:

`Principal → Vice Principal → Section Head → Class Teacher → Subject Teacher → Teacher`

- **Principal / Vice Principal** - permanent appointments (`teacher_positions`
  table), not renewed per academic year. At most one Principal exists at a
  time. A Vice Principal is scoped to specific grades (`vice_principal_grade_scopes`)
  or, if granted, the whole school.
- **Section Head** - a year-scoped teacher-in-charge (TIC) of a grade or
  grade+stream (`section_heads`), reviews and approves/rejects timetables for
  their grade(s).
- **Class Teacher** - the form teacher of a specific class (`classes.form_teacher_id`),
  year-scoped.
- **Subject Teacher** - a teacher assigned to teach a subject in a class
  (`class_subject_teachers`), year-scoped. Assigning one (from a class's
  "Subjects & Teachers" tab) requires the teacher already hold that subject
  as a qualification on the **Teacher Subjects** page (`teacher_subjects`,
  the single place qualifications are declared) - the teacher picker there
  is scoped to qualified teachers only, and the backend rejects an
  unqualified assignment even if attempted directly. Each row also shows
  whether the pairing is actually covered by the class's currently
  published timetable.

Rank determines two things in the UI: how much of the school a teacher can
target when sending a notification (§ Notifications), and what their own
dashboard shows them (a `RoleBadge` and, for Section Head and above, a
"Leadership" panel).

**What a teacher can reach.** The server lets a teacher open a class roster,
enrol or remove students, and write a student's portfolio (progress reports,
activities, leadership roles, awards, disciplinary records) only for classes
they teach or lead:

| Position | Classes they can reach |
| --- | --- |
| Class Teacher | Their own class |
| Subject Teacher | Every class they teach a subject in, one subject or several |
| Section Head | Every class in the grades they head |
| Vice Principal | Every class in their scoped grades, or the whole school |
| Principal | The whole school |

Admins can reach everything. NIC numbers are the first password for
teachers and guardians, so only admins see them.

## Identity, accounts & password lifecycle

- **Account provisioning** - teacher, student, and parent accounts are all
  created from inside OpenSchool (Teachers page, Students page, a student's
  Guardians tab), which provisions the matching ThunderID account
  automatically. ThunderID's own self-registration stays off for every role.
- **Self-service activation (students and parents)** - an admin issues
  one-time activation codes in bulk from **Settings > Account activation**
  (printable slips or CSV, per class or for everyone without a login). The
  person opens `/activate`, enters the code, their index or NIC number and
  an email, confirms the email through a 30-minute link and picks their own
  password. Off by default, with a switch per role and an optional date
  window. The code decides whether it is a student or parent activation,
  so choosing the wrong "I am a" option does not block a real match. If the
  email can't be sent, the page says so and asks the person to try again.
  See [ADR 0008](../adr/0008-self-service-account-activation.md).
- **Class-wise activation code sheets** - each generated batch is split by
  class (grade order, then name). Per class it prints a hand-out list for
  the class teacher (logo, school name, class, class teacher, names, index
  numbers, a signature column, and no codes) followed by cut-out slips, 10
  per A4 page, each with the logo, school name, class and class teacher.
  Print one class or all, or choose "Save as PDF" in the print window;
  Ctrl+P on that screen prints the sheets too. Parents are filed under
  their youngest child's class.
- **Reprinting codes** - Issued batches has a "View codes" action that
  reopens a batch's unused codes as class PDFs or CSV, when the server has
  an `ACTIVATION_CODE_KEY`. Each reopening is audit-logged.
- **NIC/index-number default passwords** - new accounts don't get a
  manually-typed password. A teacher's or guardian's initial password is
  their NIC number (`nic_number`, required and unique per person); a
  student's is their `index_number`. Admins are the one exception - they set
  their own password during the one-time `/setup` flow.
- **Forced first-login password change** - any account created with a
  default password is flagged `must_change_password`. On next sign-in the
  user is routed to a full-page interstitial before they can reach anything
  else, with the choice to keep the default password or set a new one.
- **Self-service password reset** - "Forgot password?" on the sign-in page
  identifies the user by login email plus their on-file secret (NIC for
  teacher/parent, index number for student - admins are excluded, since they
  have no secondary secret on file), then emails a short-lived, single-use
  reset link (15 minutes, token stored only as a hash) through the
  configured mail provider. The new password is set through ThunderID's
  credential update. Without a mail provider the link is only logged
  server-side, and production refuses to start that way. A signed-in user
  can also change their password at
  any time from the header menu. A "password changed" email follows every
  change or reset.
- **Account emails** - branded with the OpenSchool logo and the school's
  name and contacts, in HTML and plain text, with a formal greeting by name
  with initials ("Dear H.A.N. Perera,"). Sent through Resend or any SMTP
  server; `MAIL_REDIRECT_TO` sends everything to one test inbox while no
  domain is verified. Settings > Email shows the active provider, previews
  each email and sends a test to the admin. See
  [ADR 0009](../adr/0009-transactional-email.md).
- **Orphaned-identity handling** - if provisioning a ThunderID account
  succeeds but the local Postgres write fails (or vice versa), a
  compensating rollback deletes the partially-created side on its own
  deadline. A step that fails is logged and queued for the hourly
  identity-erasure retry job, and admins can clean up leftovers from
  Settings > Orphaned accounts.
