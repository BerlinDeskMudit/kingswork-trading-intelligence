import { useEffect, useState } from "react"
import { Flame, Gift, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { claimStreakBonus, getStreak } from "@/services/api.ts"

interface StreakData {
  current_streak: number
  longest_streak: number
  total_logins: number
  bonus_claimed_today: boolean
}

interface NavbarStreakProps {
  fallback?: Partial<StreakData> | null
  refreshKey?: number
  onBonusClaimed?: (amount: number) => void
}

export default function NavbarStreak({
  fallback,
  refreshKey = 0,
  onBonusClaimed,
}: NavbarStreakProps) {
  const [streak, setStreak] = useState<StreakData | null>(() => (
    fallback?.current_streak
      ? {
          current_streak: fallback.current_streak,
          longest_streak: fallback.longest_streak || fallback.current_streak,
          total_logins: fallback.total_logins || fallback.current_streak,
          bonus_claimed_today: fallback.bonus_claimed_today || false,
        }
      : null
  ))
  const [loading, setLoading] = useState(!streak)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState(false)

  const loadStreak = async () => {
    setLoading(true)
    setError(false)
    try {
      setStreak(await getStreak())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStreak()
  }, [refreshKey])

  const handleClaim = async () => {
    setClaiming(true)
    setError(false)
    try {
      const result = await claimStreakBonus()
      setStreak((current) => current ? { ...current, bonus_claimed_today: true } : current)
      onBonusClaimed?.(result.bonus)
    } catch {
      setError(true)
    } finally {
      setClaiming(false)
    }
  }

  if (!streak && loading) {
    return (
      <div className="ml-auto flex h-10 min-w-[190px] items-center justify-center rounded-md border border-white/10 bg-card/70">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!streak) {
    return (
      <Button className="ml-auto" size="sm" variant="outline" onClick={loadStreak}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Load streak
      </Button>
    )
  }

  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 rounded-md border border-orange-500/25 bg-orange-500/5 px-3 py-1.5">
      <Flame className="h-5 w-5 shrink-0 text-orange-400" fill="currentColor" fillOpacity={0.2} />
      <div className="min-w-0 leading-tight">
        <p className="whitespace-nowrap text-sm font-semibold">{streak.current_streak} day streak</p>
        <p className="whitespace-nowrap text-[11px] text-muted-foreground">
          Best: {streak.longest_streak} days &middot; Total logins: {streak.total_logins}
        </p>
      </div>
      {!streak.bonus_claimed_today ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-orange-300 hover:text-orange-200"
          onClick={handleClaim}
          disabled={claiming}
          title="Claim daily streak bonus"
          aria-label="Claim daily streak bonus"
        >
          {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
        </Button>
      ) : null}
      {error ? (
        <button
          type="button"
          onClick={loadStreak}
          className="shrink-0 text-destructive"
          title="Retry streak request"
          aria-label="Retry streak request"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
