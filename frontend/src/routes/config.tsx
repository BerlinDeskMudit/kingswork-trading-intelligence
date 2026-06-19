import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { dashboardSections, paths, type DashboardSectionId } from "@/routes/paths"

type LazyPage = LazyExoticComponent<ComponentType<object>>
type LazyDashboardPage = LazyExoticComponent<ComponentType<{ sectionId: DashboardSectionId }>>

export type AppRouteConfig = {
  id: string
  path: string
  access: "public" | "auth" | "open"
  Component: LazyPage
}

const Landing = lazy(() => import("@/pages/Landing"))
const Login = lazy(() => import("@/pages/Login"))
const Signup = lazy(() => import("@/pages/Signup"))
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const Docs = lazy(() => import("@/pages/Docs"))
const NotFound = lazy(() => import("@/pages/NotFound"))

export type DashboardRouteConfig = {
  id: DashboardSectionId
  path: DashboardSectionId
  label: string
  Component: LazyDashboardPage
}

export const routeConfig = {
  root: { id: "home", path: paths.home, access: "open", Component: Landing },
  open: [
    { id: "docs", path: paths.docs, access: "open", Component: Docs },
    { id: "not-found", path: paths.notFound, access: "open", Component: NotFound },
  ],
  public: [
    { id: "login", path: paths.login, access: "public", Component: Login },
    { id: "signup", path: paths.signup, access: "public", Component: Signup },
  ],
  dashboard: {
    id: "dashboard",
    path: paths.dashboard,
    access: "auth" as const,
    children: dashboardSections.map(({ id, label, path }) => ({
      id,
      label,
      path,
      Component: Dashboard,
    })) satisfies DashboardRouteConfig[],
  },
}
