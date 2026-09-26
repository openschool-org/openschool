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
