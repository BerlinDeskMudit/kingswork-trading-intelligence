import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (v: boolean) => void
  delayDuration: number
}>({ open: false, setOpen: () => {}, delayDuration: 300 })

function TooltipProvider({ children, delayDuration = 300 }: TooltipProviderProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
      {children}
    </TooltipContext.Provider>
  )
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function TooltipTrigger({ children, asChild, ...props }: any) {
  const { setOpen, delayDuration } = React.useContext(TooltipContext)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration)
  }
  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  const child = asChild ? children : <span>{children}</span>
  return React.cloneElement(child, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ...props,
  })
}

function TooltipContent({ children, className, ...props }: any) {
  const { open } = React.useContext(TooltipContext)
  if (!open) return null
  return (
    <div
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-scale-in",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
