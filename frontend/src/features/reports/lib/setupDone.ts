const DONE_KEY = "os.setup.done";

// Remembers on this device whether setup was complete, so a finished school shows no
// placeholder while loading and the page does not jump either way.
export function wasSetupDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSetupDone(done: boolean) {
  try {
    localStorage.setItem(DONE_KEY, done ? "1" : "0");
  } catch {
    // Storage blocked: the placeholder may just show briefly.
  }
}
