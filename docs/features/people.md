# People

Part of the [feature guide](../FEATURES.md).

- **Sri Lankan names** - students, teachers and guardians have a full name
  (as on the birth certificate or NIC), a name with initials (for example
  "H.A.H.E. Wickramasinghe", filled in from the full name and editable) and
  an optional calling name. Lists, registers and printouts show the name
  with initials; search matches all three. Names are never split into a
  guessed first and last name.
- **Class labels** - a class whose name already starts with its grade number
  shows as "13-M1", not "Grade 13 - 13-M1". Grades and classes also get a
  round avatar coloured by school section: Primary (1-5) teal, Junior (6-9)
  blue, O/L (10-11) purple, A/L (12-13) magenta.
- **Bulk student import** - Students > Import students takes a CSV
  (class, index number, full name, optional name with initials and calling
  name, gender, contacts, guardian) and places each student straight into
  their class for the current year. A preview shows every row before
  anything is saved; an unknown class can be chosen in the preview; classes
  over capacity are flagged; the whole import can be undone. No logins are
  created: students and parents activate with codes afterwards.
- **Guardian checks during import** - guardians are matched by NIC
  (ignoring the case of the final V or X). An existing guardian, with or
  without a login, is linked rather than created again. A NIC that comes
  with a different name or email from the record or from an earlier row is
  blocked, because it could link a child to the wrong parent. The same
  parent under a second NIC, and an email already used by someone else, are
  flagged for review.
- **Phone numbers** - every phone field accepts 0771234567, +94771234567,
  94771234567, spaces, dashes, and a number whose leading 0 a spreadsheet
  dropped, and stores 0XXXXXXXXX.
- **Students** - profile, enrollment status (active/left), house, guardians
  (up to 2 per student, shared guardians supported for siblings), and an
  8-tab detail view: Profile, Guardians, Subject Enrollment, Progress
  Reports, Activities, Leadership & Awards, Disciplinary, and a read-only
  Records rollup (attendance history, exam results, prefect appointments).
- **Teachers** - profile (title, gender, NIC, employee number - auto-assigned
  from a shared sequence with non-academic staff), employment status
  (active/resigned/transferred), house, and position (§ Roles & positions).
- **Guardians directory** - a searchable, dedicated directory (not just
  inline on a student page) with NIC number, notification history and
  portal-login status per guardian, searchable by name, phone, email or
  NIC; delete is blocked while a guardian is still linked to
  any student, since unlinking silently from every child would be
  surprising.
- **Non-academic staff** - Lab Assistant, Librarian, Office Staff,
  Development Officer, IT Officer, Security, Minor Employee - profiles with
  no login/IDP account (no `user_id`), sharing the employee-number sequence
  with teachers.
- **Prefect board** - rank-based appointments (Head Prefect down to House
  Captain / Vice House Captain) per academic year, with a year selector that
  switches past years into a read-only archive view.
- **Societies** - clubs/societies (Science Society, Interact/Leo Club,
  Scouts, etc.), each with an admin-assigned Teacher-in-Charge and a
  five-role student roster (Leader, Deputy Leader, Secretary, Treasurer,
  Member) per academic year, with the same year-selector archive view as the
  prefect board. The Teacher-in-Charge manages their own society's roster
  from a "My Society" page in the teacher portal; admins can manage any
  society. Distinct from the free-text `student_activities` "society"
  category - memberships here are FK-linked to a real society record and
  surface in the student's Activities tab alongside it.
- **Positions** - the Principal/Vice Principal admin screen (§ Roles &
  positions).
