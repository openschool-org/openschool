import { describe, expect, it } from "vitest";
import { shellClasses } from "@/layouts/shellClasses";

describe("shellClasses", () => {
  it("expanded desktop sidebar", () => {
    expect(shellClasses({ isDrawer: false, showTabs: false, rail: false, open: true })).toEqual({
      layout: "os-layout", sidebar: "os-layout__sidebar", content: "os-layout__content", hidden: undefined,
    });
  });

  it("desktop rail", () => {
    const c = shellClasses({ isDrawer: false, showTabs: false, rail: true, open: false });
    expect([c.sidebar, c.content, c.hidden]).toEqual(["os-layout__sidebar is-rail", "os-layout__content is-rail", undefined]);
  });

  it("closed drawer on a phone with tabs", () => {
    expect(shellClasses({ isDrawer: true, showTabs: true, rail: false, open: false })).toEqual({
      layout: "os-layout is-drawer has-bottom-tabs",
      sidebar: "os-layout__sidebar is-collapsed",
      content: "os-layout__content is-expanded",
      hidden: true,
    });
  });

  it("open drawer still expands the content under it", () => {
    const c = shellClasses({ isDrawer: true, showTabs: false, rail: false, open: true });
    expect([c.sidebar, c.content, c.hidden]).toEqual(["os-layout__sidebar", "os-layout__content is-expanded", undefined]);
  });
});
