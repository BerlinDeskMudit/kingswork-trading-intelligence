import { useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"

type FirstVisitWelcomeProps = {
  onComplete: () => void
}

const WORDMARK = "KINGSTOP".split("")

export default function FirstVisitWelcome({ onComplete }: FirstVisitWelcomeProps) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const timer = window.setTimeout(onComplete, reduceMotion ? 350 : 1600)
    return () => window.clearTimeout(timer)
  }, [onComplete, reduceMotion])

  return (
    <motion.button
      type="button"
      autoFocus
      aria-label="Skip welcome and open dashboard"
      className="fixed inset-0 z-[100] flex min-h-screen w-full items-center justify-center overflow-hidden bg-background text-foreground outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      onClick={onComplete}
      onKeyDown={(event) => {
        if (event.key === "Escape") onComplete()
      }}
    >
      <span className="absolute inset-0 bg-grid opacity-[0.04]" aria-hidden="true" />
      <span className="relative flex flex-col items-center">
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, scale: 0.86, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-16 w-16 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-ink"
        >
          <img src="/kingstop-mark.svg" alt="" className="h-10 w-10" />
        </motion.span>

        <span className="mt-6 flex text-3xl font-bold sm:text-4xl" aria-label="KingStop">
          {WORDMARK.map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.2 + index * 0.035, duration: 0.28 }}
              aria-hidden="true"
            >
              {letter}
            </motion.span>
          ))}
        </span>

        <motion.span
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.5, duration: 0.3 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          Trading intelligence
        </motion.span>

        <span className="mt-7 h-px w-40 overflow-hidden bg-border" aria-hidden="true">
          <motion.span
            className="block h-full origin-left bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduceMotion ? 0.25 : 1.15, ease: "easeOut" }}
          />
        </span>
      </span>
    </motion.button>
  )
}
