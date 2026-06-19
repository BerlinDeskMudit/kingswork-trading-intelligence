import { describe, expect, it } from "vitest"
import { dashboardSections, isDashboardSection, paths } from "@/routes/paths"

describe("route paths", () => {
  it("defines required dashboard sections as real URLs", () => {
    const ids = dashboardSections.map((section) => section.id)

    expect(ids).toEqual(expect.arrayContaining(["news", "predict", "portfolio", "settings", "wallet"]))
    expect(paths.dashboardSection("predict")).toBe("/dashboard/predict")
    expect(paths.dashboardSection("wallet")).toBe("/dashboard/wallet")
  })

  it("rejects unknown dashboard sections", () => {
    expect(isDashboardSection("predict")).toBe(true)
    expect(isDashboardSection("does-not-exist")).toBe(false)
    expect(isDashboardSection(undefined)).toBe(false)
  })
})
