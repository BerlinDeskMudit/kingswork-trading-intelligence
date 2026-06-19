import { describe, expect, it } from "vitest"
import { dashboardNavigationItems, findNavigationShortcut } from "@/features/navigation/navigation-items"

describe("dashboard navigation shortcuts", () => {
  it("assigns one unique shortcut to every dashboard destination", () => {
    const shortcuts = dashboardNavigationItems.map(({ shortcut }) => shortcut)

    expect(new Set(shortcuts).size).toBe(shortcuts.length)
  })

  it("matches shortcuts without case sensitivity", () => {
    expect(findNavigationShortcut("p")?.id).toBe("predict")
    expect(findNavigationShortcut("W")?.id).toBe("wallet")
    expect(findNavigationShortcut("z")).toBeUndefined()
  })
})
