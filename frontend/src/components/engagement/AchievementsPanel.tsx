import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Trophy, Lock, Flame, Crown, Crosshair, Activity, BarChart3, TrendingUp, Wallet,
  LineChart, BrainCircuit, ShieldCheck, Sparkles, LogIn, ChevronDown, ChevronUp,
  Loader2, RefreshCw, type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getAchievements } from "@/services/api.ts"
import { cn } from "@/lib/utils"

const iconMap: Record<string, LucideIcon> = {
  Trophy, Flame, Crown, Crosshair, Activity, BarChart3, TrendingUp, Wallet,
  LineChart, BrainCircuit, ShieldCheck, Sparkles, LogIn, Lock,
}

interface Achievement {
  id: number
  key: string
  name: string
  description: string
  icon: string
  category: string
  bonus_cash: number
  requirement_value: number
  progress: number
  progress_pct: number
  unlocked: boolean
  unlocked_at: string | null
}

export default function AchievementsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [totalUnlocked, setTotalUnlocked] = useState(0)
  const [total, setTotal] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadAchievements = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getAchievements()
      setAchievements(data.achievements)
      setTotalUnlocked(data.total_unlocked)
      setTotal(data.total_achievements)
    } catch {
      setError("Achievements could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAchievements()
  }, [refreshKey])

  return (
    <Card className="h-full border-white/10 bg-card/70">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            Achievements
          </span>
          <span className="flex items-center gap-1">
            <span className="mr-1 text-sm text-muted-foreground">{totalUnlocked}/{total}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={loadAchievements}
              title="Refresh achievements"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Show achievements" : "Hide achievements"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      {!collapsed && (
        <CardContent className="max-h-[390px] overflow-y-auto">
          {error ? <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}
          {loading && !achievements.length ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          {!loading && !achievements.length && !error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No achievements are configured.</p>
          ) : null}
          <div className="space-y-2">
            {achievements.map((ach, index) => {
              const Icon = iconMap[ach.icon] || Trophy
              return (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    ach.unlocked
                      ? "border-yellow-500/20 bg-yellow-500/10"
                      : "border-white/10 bg-background/50"
                  )}
                  title={`${ach.name}: ${ach.description}${ach.unlocked ? "" : " (locked)"}`}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                    ach.unlocked ? "bg-yellow-500/15 text-yellow-400" : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{ach.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {ach.unlocked
                          ? ach.bonus_cash > 0 ? `+$${ach.bonus_cash.toLocaleString()}` : "Unlocked"
                          : `${ach.progress}/${ach.requirement_value}`}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ach.description}</p>
                    <Progress value={ach.unlocked ? 100 : ach.progress_pct} className="mt-2 h-1.5" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
