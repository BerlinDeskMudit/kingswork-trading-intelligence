import { useEffect, useMemo, useState } from "react"
import { BarChart3, Bell, CheckCircle2, Compass, TrendingUp, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DashboardSectionId } from "@/routes/paths"
import { getOnboardingState, updateOnboardingState } from "@/services/api"

type TourStep = {
  title: string
  body: string
  target: string
  section: DashboardSectionId
  icon: typeof Compass
  primary: string
}

type PersistedTourState = {
  completed: boolean
  dismissed: boolean
  step: number
}

const defaultTourState: PersistedTourState = {
  completed: false,
  dismissed: false,
  step: 0,
}

const steps: TourStep[] = [
  {
    title: "Use the navigation as your command center",
    body: "Each major workspace now has a real URL, so you can refresh, bookmark, or share the exact section you are using.",
    target: "nav-overview",
    section: "overview",
    icon: Compass,
    primary: "Next",
  },
  {
    title: "Make your first prediction",
    body: "Choose YES or NO, preview price impact, and place a small paper-money position before committing more exposure.",
    target: "nav-predict",
    section: "predict",
    icon: TrendingUp,
    primary: "Show funding",
  },
  {
    title: "Know where funding lives",
    body: "Wallet shows cash, Stripe checkout status, transaction history, and exposure guardrails in one place.",
    target: "nav-wallet",
    section: "wallet",
    icon: Wallet,
    primary: "Show settings",
  },
  {
    title: "Control notifications and privacy",
    body: "Settings lets you configure alerts, leaderboard visibility, profile visibility, and account security surfaces.",
    target: "nav-settings",
    section: "settings",
    icon: Bell,
    primary: "Finish tour",
  },
]

function readTourState(key: string): PersistedTourState {
  const saved = localStorage.getItem(key)
  if (!saved) return defaultTourState

  try {
    return { ...defaultTourState, ...JSON.parse(saved) }
  } catch {
    return defaultTourState
  }
}

export default function OnboardingWizard({
  userId,
  open,
  activeSection,
  onOpenChange,
  onNavigate,
  onComplete,
}: {
  userId?: number
  open: boolean
  activeSection: DashboardSectionId
  onOpenChange: (open: boolean) => void
  onNavigate: (section: DashboardSectionId) => void
  onComplete: () => void
}) {
  const storageKey = `kingstop_product_tour_${userId ?? "anonymous"}`
  const [tourState, setTourState] = useState<PersistedTourState>(() => readTourState(storageKey))
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const visible = open || (hydrated && activeSection === "overview" && !tourState.completed && !tourState.dismissed)
  const activeStep = steps[Math.min(tourState.step, steps.length - 1)]
  const Icon = activeStep.icon

  const tooltipStyle = useMemo(() => {
    if (!targetRect) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }

    const gap = 16
    const preferredLeft = targetRect.right + gap
    const maxLeft = window.innerWidth - 420
    const left = Math.max(16, Math.min(preferredLeft, maxLeft))
    const top = Math.max(16, Math.min(targetRect.top, window.innerHeight - 360))
    return { left, top }
  }, [targetRect])

  const persist = (next: PersistedTourState) => {
    localStorage.setItem(storageKey, JSON.stringify(next))
    setTourState(next)
    void updateOnboardingState(next).catch(() => undefined)
  }

  useEffect(() => {
    let active = true
    void getOnboardingState()
      .then((data) => {
        if (!active) return
        const next = { ...defaultTourState, ...data.tour }
        localStorage.setItem(storageKey, JSON.stringify(next))
        setTourState(next)
      })
      .catch(() => {
        if (!active) return
        const next = readTourState(storageKey)
        setTourState(next)
      })
      .finally(() => {
        if (active) setHydrated(true)
      })
    return () => {
      active = false
    }
  }, [storageKey])

  useEffect(() => {
    if (!visible) return
    onNavigate(activeStep.section)

    const updateRect = () => {
      const target = document.querySelector(`[data-tour-target="${activeStep.target}"]`)
      setTargetRect(target?.getBoundingClientRect() ?? null)
    }

    const frame = requestAnimationFrame(updateRect)
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [activeStep.section, activeStep.target, onNavigate, visible])

  if (!visible) return null

  const goToStep = (step: number) => {
    persist({ ...tourState, step, dismissed: false })
  }

  const skip = () => {
    persist({ ...tourState, dismissed: true })
    onOpenChange(false)
  }

  const finish = () => {
    persist({ completed: true, dismissed: false, step: steps.length - 1 })
    onOpenChange(false)
    onNavigate("predict")
    onComplete()
  }

  const next = () => {
    if (tourState.step >= steps.length - 1) {
      finish()
      return
    }
    goToStep(tourState.step + 1)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]">
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.52),0_0_28px_hsl(var(--primary)/0.45)]"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      ) : null}

      <section
        className="fixed w-[min(390px,calc(100vw-32px))] rounded-lg border border-white/10 bg-background p-5 text-foreground shadow-ink"
        style={tooltipStyle}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Product tour</p>
              <h2 className="mt-1 font-semibold leading-tight">{activeStep.title}</h2>
            </div>
          </div>
          <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground">
            Skip
          </button>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{activeStep.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <button
                key={step.title}
                onClick={() => goToStep(index)}
                className={cn("h-2 rounded-full transition-all", index === tourState.step ? "w-7 bg-primary" : "w-2 bg-muted")}
                aria-label={`Go to tour step ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {tourState.step > 0 ? (
              <Button variant="outline" size="sm" onClick={() => goToStep(tourState.step - 1)}>
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={next}>
              {tourState.step >= steps.length - 1 ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Start
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {activeStep.primary}
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
