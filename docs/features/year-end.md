# Year-end workflows and promotion

Part of the [feature guide](../FEATURES.md).

## Year-end workflows

The **Year-end** page (`/year-end`) moves the school from one academic year
to the next through guided workflows. Each workflow is declared by the
backend (`internal/modules/workflows`) with its steps, inputs and checks,
so the frontend shows whatever the backend offers.

Every workflow follows the same path:

1. **Inputs** - the admin fills in a short form (for example the year to
   copy from, or a CSV).
2. **Checks** - the backend lists what is ready and what is missing. A
   blocking check links to the page that fixes it.
3. **Proposal** - the workflow works out what it would change and shows it
   as editable tables. Nothing is saved yet. The admin can edit rows, tick
   or untick items, or discard the proposal.
4. **Apply** - the changes are written in one transaction, and a snapshot is
   kept.
5. **Revert** - an applied run can be undone from its snapshot, until later
   work depends on it (for example marks, attendance or a submitted
   timetable).

The same inputs always give the same result. No workflow calls an AI or any
outside service. Each run's steps, timings and outcome are recorded.

| Order | Workflow | What it does |
| --- | --- | --- |
| 1 | **Year rollover** | Creates next year with the same terms, classes, homerooms, capacities and timetable setup. Students are not moved here. |
| 2 | **Leavers** | Marks students who are leaving as left, with a leaving date. The final grade is ticked by default. |
| 3 | **Subject choices** | Records next year's subject choices for one curriculum level (the O/L baskets or one A/L stream), entered in the table or imported from paper forms as a CSV. Each group's rules are checked before saving. |
| 4 | **Intake** | Imports new students and guardians from a CSV (grade 6 scholarship, grade 10 or A/L intake). Duplicates are caught by index number and guardian NIC. |
| 5 | **Promotion and class formation** | Places every student in next year's class by the rule for their grade: keep the section, reshuffle, group by subject choice, or by A/L stream. New admissions are placed too, and full grades get extra sections. |
| 6 | **Teacher allocation** | Assigns a qualified teacher to every class and subject, keeping last year's teacher with the class where possible and no one over the weekly period limit. Also suggests form teachers. |
| 7 | **Timetable** | Checks the timetable setup, runs basket and A/L option subjects as option blocks at the same period across classes, and generates draft timetables for whole grade sections. Drafts then go to section-head review. |
| 8 | **Go live** | Makes the new year and its first term current, so every page switches to it, and sends one notice to the school. |

A setup tool, **Import students**, uses the same engine outside the year-end
cycle: it adds many students and guardians at once into current classes,
with a preview first and undo afterwards.

The workflows are also listed on **Settings > Automation**, with their steps
and last run. Unlike the background agents, they run only when an admin
applies them.

## Promotion & class reassignment

The manual promotion page (`/promotion`) remains for one-off moves outside
the year-end workflows. A preview-then-commit flow, run once per source→target academic year pair:

1. **Preview** computes each actively-enrolled student's next grade (by
   grade sort order) and a non-binding same-name class-carryover suggestion
   (or same-*medium* suggestion for medium-pinned classes). Students at the
   top grade are flagged `graduating`, not silently dropped.
2. The admin reviews a per-grade table of proposed assignments, freely
   overriding any individual student's target class, or using one of two
   bulk-assist buttons per grade group: **Distribute by marks** (sorts by
   total term marks, deals students round-robin across target classes for
   an even high-to-low spread) or **Assign randomly** (same round-robin
   dealing over a shuffled order). Both keep every class within one student
   of equal size and leave every assignment individually overridable.
   Medium-pinned students are excluded from both auto-fill pools.
3. **Commit** bulk-writes the final per-student class assignments for the
   target year in one batched operation. Nothing is visible to the rest of
   the app until an admin separately flips the target year to "current."
