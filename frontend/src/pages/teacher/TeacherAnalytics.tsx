// Principal/Vice Principal's Analytics view — reuses the admin Analytics
// page wholesale (same charts, same data shape), pointed at the leadership
// self-service endpoint instead of the admin one.

import Analytics from "../admin/analytics/Analytics";

export default function TeacherAnalytics() {
  return <Analytics scope="leadership" />;
}
