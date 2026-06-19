import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Circle, Gift, Loader2, RefreshCw, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getDailyChallenges, claimChallengeReward } from "@/services/api.ts"
import { cn } from "@/lib/utils"

interface Challenge {
  id: number
  challenge_id: number
  title: string
  description: string
  progress: number
  requirement_value: number
  completed: boolean
  reward_claimed: boolean
  reward_cash: number
  reward_xp: number
}

interface DailyChallengesPanelProps {
  onRewardClaimed?: (amount: number) => void
  refreshKey?: number
}

export default function DailyChallengesPanel({ onRewardClaimed, refreshKey = 0 }: DailyChallengesPanelProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [claiming, setClaiming] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadChallenges = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getDailyChallenges()
      setChallenges(data.challenges || [])
    } catch {
      setError("Daily challenges could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadChallenges()
  }, [refreshKey])

  const handleClaim = async (challenge: Challenge) => {
    setClaiming(challenge.id)
    try {
      await claimChallengeReward(challenge.challenge_id)
      setChallenges((prev) =>
        prev.map((c) => (c.id === challenge.id ? { ...c, reward_claimed: true } : c))
      )
      onRewardClaimed?.(challenge.reward_cash)
    } catch {
      setError("Reward claim failed. Refresh and try again.")
    } finally {
      setClaiming(null)
    }
  }

  return (
    <Card className="h-full border-white/10 bg-card/70">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Daily challenges
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={loadChallenges}
            title="Refresh daily challenges"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[390px] space-y-3 overflow-y-auto">
        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}
        {loading && !challenges.length ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {!loading && !challenges.length && !error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No challenges are available today.</p>
        ) : null}
        {challenges.map((challenge, index) => {
          const pct = Math.min(Math.round((challenge.progress / challenge.requirement_value) * 100), 100)
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-lg border p-3 transition-all",
                challenge.completed
                  ? "border-market-up/20 bg-market-up/5"
                  : "border-white/10 bg-background/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {challenge.completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-market-up" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={cn("text-sm font-medium", challenge.completed && "text-market-up")}>
                      {challenge.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground ml-6">{challenge.description}</p>
                  <div className="mt-2 ml-6 flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {challenge.progress}/{challenge.requirement_value}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {challenge.reward_claimed ? (
                    <span className="text-xs text-market-up">Claimed</span>
                  ) : challenge.completed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClaim(challenge)}
                      disabled={claiming === challenge.id}
                      className="h-7 px-2 text-xs"
                    >
                      {claiming === challenge.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Gift className="mr-1 h-3 w-3" />
                          ${challenge.reward_cash.toLocaleString()}
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      +${challenge.reward_cash.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </CardContent>
    </Card>
  )
}
