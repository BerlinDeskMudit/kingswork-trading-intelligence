import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { paths } from "@/routes/paths"

type LazyPage = LazyExoticComponent<ComponentType<object>>

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
  auth: [
    { id: "dashboard-section", path: `${paths.dashboard}/:section`, access: "auth", Component: Dashboard },
  ],
} satisfies {
  root: AppRouteConfig
  open: AppRouteConfig[]
  public: AppRouteConfig[]
  auth: AppRouteConfig[]
}
