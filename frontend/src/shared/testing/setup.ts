class ResizeObserverMock {
  // no-op: jsdom has no layout engine, so there's nothing to observe
  observe() {
    /* empty */
  }
  unobserve() {
    /* empty */
  }
  disconnect() {
    /* empty */
  }
}

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
