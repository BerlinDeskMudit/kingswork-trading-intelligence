import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Gift, PartyPopper, Sparkles, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStreak, claimStreakBonus } from "@/services/api.ts"

interface BonusModalProps {
  open: boolean
  onClose: () => void
  streakDay: number
  onBonusClaimed?: (amount: number) => void
}

export default function BonusModal({ open, onClose, streakDay, onBonusClaimed }: BonusModalProps) {
  const [bonus, setBonus] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    if (open) {
      getStreak().then((data) => {
        const bonusAmount = data.bonus_schedule?.find((b: { day: number; bonus: number }) => b.day === streakDay)?.bonus || 500
        setBonus(bonusAmount)
      }).catch(() => setBonus(streakDay > 7 ? 5000 : streakDay > 3 ? 2500 : 1000))
    }
  }, [open, streakDay])

  const handleClaim = async () => {
    setClaiming(true)
    try {
      const result = await claimStreakBonus()
      setBonus(result.bonus)
      onBonusClaimed?.(result.bonus)
      setClaimed(true)
      setTimeout(onClose, 2000)
    } catch {
      setClaimed(true)
      setTimeout(onClose, 2000)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-md rounded-xl border border-white/10 bg-background p-8 text-center shadow-ink"
          >
            {claimed ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="space-y-4"
              >
                <PartyPopper className="mx-auto h-16 w-16 text-yellow-400" />
                <h2 className="text-2xl font-bold">Bonus Claimed!</h2>
                <p className="text-4xl font-bold text-market-up">+${bonus.toLocaleString()}</p>
                <p className="text-muted-foreground">added to your paper wallet</p>
              </motion.div>
            ) : (
              <div className="space-y-5">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                  <Flame className="h-10 w-10 text-orange-400" fill="currentColor" fillOpacity={0.3} />
                </div>

                <div>
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                    <Sparkles className="h-3 w-3" />
                    Day {streakDay} bonus
                  </div>
                  <h2 className="text-2xl font-bold">You're on a streak!</h2>
                  <p className="mt-2 text-muted-foreground">
                    {streakDay >= 7
                      ? "Incredible consistency! Keep it going."
                      : streakDay >= 3
                        ? "Nice rhythm! Don't break the chain."
                        : "Great start! Come back tomorrow for more."}
                  </p>
                </div>

                <motion.div
                  className="py-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <p className="text-sm text-muted-foreground">Daily login reward</p>
                  <p className="text-5xl font-bold text-market-up">+${bonus.toLocaleString()}</p>
                </motion.div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-orange-400" />
                  <span>Bonus increases the longer your streak</span>
                </div>

                <Button
                  size="lg"
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-lg h-12"
                >
                  <Gift className="mr-2 h-5 w-5" />
                  {claiming ? "Claiming..." : "Claim Reward"}
                </Button>

                <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
                  Maybe later
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
