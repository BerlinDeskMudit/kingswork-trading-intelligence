export const dashboardSections = [
  { id: "overview", label: "Overview", path: "overview" },
  { id: "chat", label: "Chat", path: "chat" },
  { id: "screener", label: "Screener", path: "screener" },
  { id: "news", label: "News", path: "news" },
  { id: "crypto", label: "Crypto", path: "crypto" },
  { id: "leaderboard", label: "Leaderboard", path: "leaderboard" },
  { id: "journal", label: "Journal", path: "journal" },
  { id: "predict", label: "Predict", path: "predict" },
  { id: "analytics", label: "Analytics", path: "analytics" },
  { id: "portfolio", label: "Portfolio", path: "portfolio" },
  { id: "wallet", label: "Wallet", path: "wallet" },
  { id: "settings", label: "Settings", path: "settings" },
  { id: "marketplace", label: "Marketplace", path: "marketplace" },
  { id: "social", label: "Social", path: "social" },
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
