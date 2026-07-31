/**
 * Carbon's ProgressStep always renders a "Current"/"Complete"/"Incomplete"
 * status string meant to be screen-reader-only (via a `.cds--assistive-text`
 * span). In this Carbon build that class is also used — unscoped — by the
 * PasswordInput visibility tooltip, and its visible styling wins the
 * cascade, so the status text ends up shown next to every step label
 * instead of hidden. Passing this as `translateWithId` makes the text empty
 * at the source rather than fighting Carbon's own CSS.
 */
export function silentProgressStatus(): string {
  return "";
}
