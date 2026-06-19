import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Gift, TrendingUp, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStreak, claimStreakBonus } from "@/services/api.ts"

interface StreakBannerProps {
  onBonusClaimed?: (amount: number) => void
  refreshKey?: number
}

interface StreakBonus {
  day: number
  bonus: number
}

function dailyBonusForStreak(streak: number, schedule: StreakBonus[] = []) {
  const scheduled = schedule.find((item) => item.day === streak)?.bonus
  if (scheduled != null) return scheduled
  if (streak > 30) return 25_000 + (streak - 30) * 500
  return 500
}

function StreakFlame({ streak }: { streak: number }) {
  const size = Math.min(24 + streak * 1.5, 48)
  const colors = [
    "text-muted-foreground",
    "text-orange-300",
    "text-orange-400",
    "text-orange-500",
    "text-orange-500",
    "text-amber-500",
    "text-amber-500",
    "text-yellow-500",
    "text-yellow-500",
    "text-yellow-400",
  ]
  const color = streak >= 10 ? "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : colors[Math.min(streak, colors.length - 1)]
  return (
    <motion.div
      key={streak}
      initial={{ scale: 0.5, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 12 }}
      className="inline-flex"
    >
      <Flame
        className={color}
        style={{ width: size, height: size }}
        fill="currentColor"
        fillOpacity={0.25}
      />
    </motion.div>
  )
}

export default function StreakBanner({ onBonusClaimed, refreshKey = 0 }: StreakBannerProps) {
  const [streak, setStreak] = useState<{
    current_streak: number
    longest_streak: number
    total_logins: number
    bonus_claimed_today: boolean
    total_bonus_earned: number
    next_milestone: { day: number; bonus: number } | null
    bonus_schedule?: StreakBonus[]
  } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    getStreak().then(setStreak).catch(() => {})
  }, [refreshKey])

  const handleClaim = async () => {
    setClaiming(true)
    try {
      const result = await claimStreakBonus()
      setClaimed(true)
      setStreak((prev) => prev ? { ...prev, bonus_claimed_today: true, total_bonus_earned: result.total_bonus_earned } : prev)
      onBonusClaimed?.(result.bonus)
    } catch {
    } finally {
      setClaiming(false)
    }
  }

  if (!streak) return null

  const currentDay = streak.current_streak
  const todayBonus = dailyBonusForStreak(currentDay, streak.bonus_schedule)
  const progress = streak.next_milestone ? (currentDay % streak.next_milestone.day) / streak.next_milestone.day : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-yellow-500/5 p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StreakFlame streak={currentDay} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{currentDay}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
              {currentDay >= 7 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                  <Zap className="h-3 w-3" /> on fire
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Best: {streak.longest_streak} days &middot; Total logins: {streak.total_logins}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {streak.next_milestone && (
            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted-foreground">Next milestone</p>
              <p className="text-sm font-medium">
                <TrendingUp className="mr-1 inline h-3 w-3 text-orange-400" />
                Day {streak.next_milestone.day} &rarr; +${streak.next_milestone.bonus.toLocaleString()}
              </p>
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {claimed ? (
              <motion.div
                key="claimed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 text-sm text-market-up"
              >
                <Gift className="h-4 w-4" />
                Claimed!
              </motion.div>
            ) : streak.bonus_claimed_today ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gift className="h-4 w-4" />
                Bonus claimed
              </div>
            ) : (
              <Button
                key="claim"
                size="sm"
                onClick={handleClaim}
                disabled={claiming}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white"
              >
                <Gift className="mr-2 h-4 w-4" />
                {claiming ? "Claiming..." : `Claim +$${todayBonus.toLocaleString()}`}
              </Button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
