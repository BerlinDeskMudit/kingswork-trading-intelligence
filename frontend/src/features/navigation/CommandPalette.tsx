import { useEffect, useMemo, useRef, useState } from "react"
import { Command, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { DashboardSectionId } from "@/routes/paths"
import { dashboardNavigationItems, findNavigationShortcut } from "@/features/navigation/navigation-items"

type CommandPaletteProps = {
  enabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (section: DashboardSectionId) => void
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

function fuzzyMatch(value: string, query: string) {
  const normalizedValue = value.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  let index = 0
  for (const character of normalizedValue) {
    if (character === normalizedQuery[index]) index += 1
    if (index === normalizedQuery.length) return true
  }
  return false
}

export default function CommandPalette({ enabled, open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const goPendingUntil = useRef(0)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled || isEditableTarget(event.target)) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpenChange(true)
        return
      }
      if (event.key === "?") {
        event.preventDefault()
        onOpenChange(true)
        return
      }

      const now = Date.now()
      if (event.key.toLowerCase() === "g") {
        goPendingUntil.current = now + 900
        return
      }
      if (now <= goPendingUntil.current) {
        goPendingUntil.current = 0
        const destination = findNavigationShortcut(event.key)
        if (destination) {
          event.preventDefault()
          onNavigate(destination.id)
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled, onNavigate, onOpenChange])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = useMemo(
    () => dashboardNavigationItems.filter((item) => fuzzyMatch(`${item.label} ${item.id}`, query)),
    [query],
  )

  const navigate = (section: DashboardSectionId) => {
    onNavigate(section)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search dashboard destinations and keyboard shortcuts.</DialogDescription>
        <div className="relative border-b border-border">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search destinations"
            className="h-14 rounded-none border-0 bg-transparent pl-11 pr-12 text-base focus-visible:ring-0"
          />
          <Command className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {results.map(({ id, label, icon: Icon, shortcut }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{label}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                G {shortcut}
              </kbd>
            </button>
          ))}
          {!results.length ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching destination.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
