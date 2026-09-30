// One-time tokens travel in the URL fragment, which is never sent to a server or written to access logs.
export function tokenFromHash(): string {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash).get("token") ?? "";
}
