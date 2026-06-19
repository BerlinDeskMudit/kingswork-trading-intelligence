import { Link } from "react-router-dom"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { paths } from "@/routes/paths"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          This URL does not map to a KingStop workspace view.
        </p>
        <Button asChild className="mt-6">
          <Link to={paths.dashboardDefault}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </section>
    </main>
  )
}
