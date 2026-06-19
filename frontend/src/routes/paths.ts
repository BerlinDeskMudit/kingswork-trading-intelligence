export const dashboardSections = [
  { id: "overview", label: "Overview" },
  { id: "screener", label: "Screener" },
  { id: "news", label: "News" },
  { id: "crypto", label: "Crypto" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "journal", label: "Journal" },
  { id: "predict", label: "Predict" },
  { id: "analytics", label: "Analytics" },
  { id: "portfolio", label: "Portfolio" },
  { id: "wallet", label: "Wallet" },
  { id: "settings", label: "Settings" },
  { id: "marketplace", label: "Marketplace" },
  { id: "social", label: "Social" },
] as const

export type DashboardSectionId = (typeof dashboardSections)[number]["id"]

export const dashboardSectionIds = dashboardSections.map((section) => section.id) as DashboardSectionId[]

export function isDashboardSection(value: string | undefined): value is DashboardSectionId {
  return !!value && dashboardSectionIds.includes(value as DashboardSectionId)
}

export const paths = {
  home: "/",
  docs: "/docs",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  dashboardDefault: "/dashboard/overview",
  notFound: "/404",
  dashboardSection: (section: DashboardSectionId) => `/dashboard/${section}`,
} as const
