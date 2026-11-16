// Keeps a last-good copy of small, read-mostly responses (a timetable) for when the network drops.
const PREFIX = "os-offline:";

interface Entry<T> {
  data: T;
  savedAt: number;
}

export function readOffline<T>(key: string): Entry<T> | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : undefined;
  } catch {
    return undefined;
  }
}

export function writeOffline<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the live data still shows.
  }
}

// Drops every saved copy. Called on sign-out so the next person on a shared
// lab computer cannot read the last user's timetable.
export function clearOffline() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: nothing was saved either.
  }
}
