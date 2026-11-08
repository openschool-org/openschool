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

// antd's responsive helpers (Table, Grid) call matchMedia, which jsdom does not implement.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
