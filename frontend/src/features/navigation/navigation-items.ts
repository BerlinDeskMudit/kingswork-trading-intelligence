import {
  BarChart3,
  Bitcoin,
  CreditCard,
  Filter,
  Globe2,
  Newspaper,
  PenLine,
  Settings,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { dashboardSections, type DashboardSectionId } from "@/routes/paths"

const metadata: Record<DashboardSectionId, { icon: LucideIcon; shortcut: string }> = {
  overview: { icon: BarChart3, shortcut: "O" },
  screener: { icon: Filter, shortcut: "R" },
  news: { icon: Newspaper, shortcut: "N" },
  crypto: { icon: Bitcoin, shortcut: "C" },
  leaderboard: { icon: Trophy, shortcut: "L" },
  journal: { icon: PenLine, shortcut: "J" },
  predict: { icon: TrendingUp, shortcut: "P" },
  analytics: { icon: BarChart3, shortcut: "A" },
  portfolio: { icon: Wallet, shortcut: "F" },
  wallet: { icon: CreditCard, shortcut: "W" },
  settings: { icon: Settings, shortcut: "S" },
  marketplace: { icon: Sparkles, shortcut: "M" },
  social: { icon: Globe2, shortcut: "I" },
}

export const dashboardNavigationItems = dashboardSections.map((section) => ({
  ...section,
  ...metadata[section.id],
}))

export function findNavigationShortcut(key: string) {
  return dashboardNavigationItems.find((item) => item.shortcut.toLowerCase() === key.toLowerCase())
}
