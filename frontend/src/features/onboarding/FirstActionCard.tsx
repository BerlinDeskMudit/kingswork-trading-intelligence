import { useCallback, useEffect, useState } from "react"
import { Newspaper, TrendingUp, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { DashboardSectionId } from "@/routes/paths"
import { completeFirstAction, getOnboardingState } from "@/services/api"

type FirstActionCardProps = {
  refreshKey: number
  onNavigate: (section: DashboardSectionId) => void
}

export default function FirstActionCard({ refreshKey, onNavigate }: FirstActionCardProps) {
  const [visible, setVisible] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const state = await getOnboardingState()
      setVisible(!state.first_action.completed)
    } catch {
      setVisible(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, refreshKey])

  const dismiss = async () => {
    setVisible(false)
    try {
      await completeFirstAction("dismissed")
    } catch {
      await refresh()
    }
  }

  if (!visible) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">First action</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose one low-risk next step.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 lg:hidden"
            onClick={() => void dismiss()}
            title="Dismiss first action"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <Button size="sm" onClick={() => onNavigate("predict")}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Preview prediction
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("wallet")}>
              <Wallet className="mr-2 h-4 w-4" />
              Wallet guardrails
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("news")}>
              <Newspaper className="mr-2 h-4 w-4" />
              Scan news
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 shrink-0 lg:inline-flex"
            onClick={() => void dismiss()}
            title="Dismiss first action"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
