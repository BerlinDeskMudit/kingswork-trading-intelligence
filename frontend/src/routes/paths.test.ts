import { describe, expect, it } from "vitest"
import { dashboardSections, isDashboardSection, paths } from "@/routes/paths"
import { routeConfig } from "@/routes/config"

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

  it("registers every dashboard section as a static nested child", () => {
    const configuredChildren = routeConfig.dashboard.children.map(({ id, path }) => ({ id, path }))

    expect(configuredChildren).toEqual(
      dashboardSections.map(({ id, path }) => ({ id, path })),
    )
    expect(new Set(configuredChildren.map(({ path }) => path)).size).toBe(configuredChildren.length)
  })
})
