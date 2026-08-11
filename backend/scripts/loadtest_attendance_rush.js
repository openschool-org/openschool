// k6 load test simulating a morning attendance rush: many teachers hitting
// their dashboard and marking attendance for their own class in a short
// window. docs/plan.md §0 — deferred until this shows a real need, so this
// script is prepared but not wired into CI; run it by hand before trusting
// the current DB-pool (25/5) and rate-limit (per-IP 30rps/burst 60, plus
// the per-account limiter) defaults for a real rollout.
//
// Auth note: ThunderID does not implement the OAuth2 "password" grant
// (confirmed against its own discovery-metadata tests — only
// authorization_code/client_credentials-style flows are supported), so this
// script can't log in as each simulated teacher itself the way a simpler
// password-grant load test would. Instead it consumes a pool of already-
// issued access tokens — get one per simulated teacher by signing in
// through the real frontend (or driving `@thunderid/react`'s flow
// headlessly) and capturing the token, since a raw HTTP grant isn't an
// option here.
//
// Usage:
//   1. Bring up the full stack (Postgres, ThunderID, backend, frontend) and
//      seed it with a realistic number of classes/teachers/students.
//   2. Create TEACHER_TOKENS.json — an array of already-issued
//      {access_token, class_id} pairs, one per virtual teacher to
//      simulate, e.g.:
//        [{"access_token": "eyJ...", "class_id": "<uuid>"}, ...]
//      Tokens are short-lived; regenerate this file right before running.
//   3. k6 run -e BASE_URL=http://localhost:8080 scripts/loadtest_attendance_rush.js

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

const teachers = new SharedArray("teachers", function () {
  return JSON.parse(open("./TEACHER_TOKENS.json"));
});

export const options = {
  scenarios: {
    morning_attendance_rush: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 }, // teachers arriving
        { duration: "1m", target: 50 }, // everyone marking attendance
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const teacher = teachers[__VU % teachers.length];
  const authHeaders = {
    headers: { Authorization: `Bearer ${teacher.access_token}` },
  };

  // "My profile" — the first thing a teacher's dashboard loads.
  const profile = http.get(`${BASE_URL}/api/v1/me/teacher`, authHeaders);
  check(profile, { "loaded profile": (r) => r.status === 200 });

  sleep(1);

  const today = new Date().toISOString().slice(0, 10);
  const createSession = http.post(
    `${BASE_URL}/api/v1/attendance/sessions`,
    JSON.stringify({ class_id: teacher.class_id, date: today }),
    { headers: { ...authHeaders.headers, "Content-Type": "application/json" } },
  );
  // A same-day session for this class may already exist from an earlier
  // iteration/VU — 400 is an expected outcome, not a failure.
  check(createSession, {
    "created or already exists": (r) => r.status === 201 || r.status === 400,
  });

  sleep(Math.random() * 2);
}
