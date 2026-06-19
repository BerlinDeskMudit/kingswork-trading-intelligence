import { motion } from "framer-motion"
import { BookOpen, LogOut, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { DashboardSectionId } from "@/routes/paths"
import { dashboardNavigationItems } from "@/features/navigation/navigation-items"

type DashboardNavigationProps = {
  activeSection: DashboardSectionId
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  onNavigate: (section: DashboardSectionId) => void
  onOpenTour: () => void
  onOpenDocs: () => void
  onLogout: () => void
}

function NavigationList({
  activeSection,
  onNavigate,
}: Pick<DashboardNavigationProps, "activeSection" | "onNavigate">) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {dashboardNavigationItems.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id
        return (
          <button
            key={id}
            type="button"
            data-tour-target={`nav-${id}`}
            onClick={() => onNavigate(id)}
            className={cn(
              "relative flex h-10 w-full items-center gap-3 overflow-hidden rounded-md px-3 text-sm font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {active ? (
              <>
                <motion.span
                  layoutId="dashboard-nav-surface"
                  className="absolute inset-0 bg-primary/10"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
                <motion.span
                  layoutId="dashboard-nav-indicator"
                  className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              </>
            ) : null}
            <Icon className="relative h-4 w-4 shrink-0" />
            <span className="relative">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function NavigationFooter({ onOpenTour, onOpenDocs, onLogout }: DashboardNavigationProps) {
  const actions = [
    { label: "Tour", icon: Sparkles, action: onOpenTour },
    { label: "Docs", icon: BookOpen, action: onOpenDocs },
    { label: "Log out", icon: LogOut, action: onLogout, destructive: true },
  ]

  return (
    <div className="space-y-0.5 border-t border-white/10 px-2 py-3">
      {actions.map(({ label, icon: Icon, action, destructive }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
            destructive && "hover:text-destructive",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
      <img src="/kingstop-mark.svg" alt="KingStop" className="h-8 w-8" />
      <div>
        <p className="text-sm font-semibold leading-none">KingStop</p>
        <p className="mt-1 text-xs text-muted-foreground">Trading intelligence</p>
      </div>
    </div>
  )
}

export default function DashboardNavigation(props: DashboardNavigationProps) {
  const navigateFromMobile = (section: DashboardSectionId) => {
    props.onNavigate(section)
    props.onMobileOpenChange(false)
  }

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-card/60 lg:flex">
        <Brand />
        <NavigationList activeSection={props.activeSection} onNavigate={props.onNavigate} />
        <NavigationFooter {...props} />
      </aside>

      <Dialog open={props.mobileOpen} onOpenChange={props.onMobileOpenChange}>
        <DialogContent className="left-0 top-0 flex h-dvh w-[min(86vw,320px)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-l-0 p-0">
          <DialogTitle className="sr-only">Dashboard navigation</DialogTitle>
          <Brand />
          <NavigationList activeSection={props.activeSection} onNavigate={navigateFromMobile} />
          <NavigationFooter
            {...props}
            onOpenTour={() => {
              props.onMobileOpenChange(false)
              props.onOpenTour()
            }}
            onOpenDocs={() => {
              props.onMobileOpenChange(false)
              props.onOpenDocs()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
