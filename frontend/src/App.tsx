import { Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { routeConfig } from "@/routes/config"
import { LoadingScreen, ProtectedRoute, PublicRoute } from "@/routes/guards"
import { paths } from "@/routes/paths"

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  const Landing = routeConfig.root.Component
  return isAuthenticated ? <Navigate to={paths.dashboardDefault} replace /> : <Landing />
}

function DashboardIndexRedirect() {
  const location = useLocation()
  return <Navigate to={`${paths.dashboardDefault}${location.search}${location.hash}`} replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path={routeConfig.root.path} element={<RootRedirect />} />

            {routeConfig.open.map(({ id, path, Component }) => (
              <Route key={id} path={path} element={<Component />} />
            ))}

            {routeConfig.public.map(({ id, path, Component }) => (
              <Route
                key={id}
                path={path}
                element={
                  <PublicRoute>
                    <Component />
                  </PublicRoute>
                }
              />
            ))}

            <Route
              path={paths.dashboard}
              element={
                <ProtectedRoute>
                  <DashboardIndexRedirect />
                </ProtectedRoute>
              }
            />

            {routeConfig.auth.map(({ id, path, Component }) => (
              <Route
                key={id}
                path={path}
                element={
                  <ProtectedRoute>
                    <Component />
                  </ProtectedRoute>
                }
              />
            ))}

            <Route path="*" element={<Navigate to={paths.notFound} replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
