import { describe, expect, it } from "vitest";
import { displayName, suggestNameWithInitials } from "@/shared/lib/name";

describe("suggestNameWithInitials", () => {
  it("matches the server rule", () => {
    expect(suggestNameWithInitials("Hettiwatta Arachchige Hasitha Erandika Wickramasinghe")).toBe("H.A.H.E. Wickramasinghe");
    expect(suggestNameWithInitials("H.A. Hasitha Erandika Wickramasinghe")).toBe("H.A.H.E. Wickramasinghe");
    expect(suggestNameWithInitials("H.A.H.E. Wickramasinghe")).toBe("H.A.H.E. Wickramasinghe");
    expect(suggestNameWithInitials("  Nimali   Perera ")).toBe("N. Perera");
    expect(suggestNameWithInitials("Fathima")).toBe("Fathima");
    expect(suggestNameWithInitials("")).toBe("");
  });
});

describe("displayName", () => {
  it("prefers the name with initials and falls back to the full name", () => {
    expect(displayName({ full_name: "Nimali Perera", name_with_initials: "N. Perera" })).toBe("N. Perera");
    expect(displayName({ full_name: "Nimali Perera", name_with_initials: "" })).toBe("Nimali Perera");
  });
});
