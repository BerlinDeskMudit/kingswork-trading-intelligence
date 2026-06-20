import { useEffect, useMemo, useRef, useState } from "react"
import { Command, Search, X } from "lucide-react"
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (open && event.key === "Escape") {
        event.preventDefault()
        onOpenChange(false)
        return
      }

      if (enabled && open && (event.metaKey || event.ctrlKey)) {
        const destination = findNavigationShortcut(event.key)
        if (destination) {
          event.preventDefault()
          onNavigate(destination.id)
          onOpenChange(false)
          return
        }
      }

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
  }, [enabled, onNavigate, onOpenChange, open])

  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }

    inputRef.current?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onOpenChange(false)
    }

    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [onOpenChange, open])

  const results = useMemo(
    () => dashboardNavigationItems.filter((item) => fuzzyMatch(`${item.label} ${item.id}`, query)),
    [query],
  )

  const navigate = (section: DashboardSectionId) => {
    onNavigate(section)
    onOpenChange(false)
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <section className="w-[min(380px,calc(100vw-40px))] overflow-hidden rounded-lg border border-white/10 bg-background shadow-ink">
          <div className="relative border-b border-border">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) {
                  event.preventDefault()
                  navigate(results[0].id)
                }
              }}
              placeholder="Search destinations"
              className="h-14 rounded-none border-0 bg-transparent pl-11 pr-12 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Close command palette"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[min(360px,55vh)] overflow-y-auto p-2">
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
                  Ctrl {shortcut}
                </kbd>
              </button>
            ))}
            {!results.length ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching destination.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/35 bg-primary text-primary-foreground shadow-ink transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="Open command palette"
      >
        <Command className="h-5 w-5" />
      </button>
    </div>
  )
}
