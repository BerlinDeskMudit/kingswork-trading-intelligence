import { useEffect, useState } from "react"
import {
  Bookmark,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  updateWatchlistTicker,
} from "@/services/api.ts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function pct(value = 0) {
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`
}

export default function WatchlistPanel({ onSelectTicker }: { onSelectTicker?: (ticker: string) => void }) {
  const [items, setItems] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState("")
  const [editing, setEditing] = useState("")
  const [editInput, setEditInput] = useState("")
  const [error, setError] = useState("")

  const refresh = () => {
    setLoading(true)
    setError("")
    getWatchlist()
      .then((data) => setItems(data.watchlist || []))
      .catch(() => setError("Watchlist could not be loaded."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleAdd = async () => {
    const ticker = input.trim().toUpperCase()
    if (!ticker) return
    setSaving(ticker)
    setError("")
    try {
      await addToWatchlist(ticker)
      setInput("")
      refresh()
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "Ticker could not be added.")
    } finally {
      setSaving("")
    }
  }

  const handleRemove = async (ticker: string) => {
    setSaving(ticker)
    setError("")
    try {
      await removeFromWatchlist(ticker)
      setItems((current) => current.filter((item) => item.ticker !== ticker))
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "Ticker could not be removed.")
    } finally {
      setSaving("")
    }
  }

  const startEditing = (ticker: string) => {
    setEditing(ticker)
    setEditInput(ticker)
    setError("")
  }

  const handleUpdate = async () => {
    const nextTicker = editInput.trim().toUpperCase()
    if (!editing || !nextTicker) return
    setSaving(editing)
    setError("")
    try {
      await updateWatchlistTicker(editing, nextTicker)
      setEditing("")
      setEditInput("")
      refresh()
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "Ticker could not be updated.")
    } finally {
      setSaving("")
    }
  }

  return (
    <Card className="h-full border-white/10 bg-card/70">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            Watchlist
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={refresh} title="Refresh watchlist">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void handleAdd()}
            placeholder="Add ticker"
            aria-label="Ticker to add"
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            onClick={handleAdd}
            disabled={!input.trim() || Boolean(saving)}
            title="Add ticker"
          >
            {saving === input.trim().toUpperCase()
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}

        <div className="max-h-[300px] divide-y divide-white/10 overflow-y-auto">
          {loading && !items.length ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tickers saved yet.</p>
          ) : (
            items.map((item) => {
              const up = (item.change_pct ?? 0) >= 0
              const isEditing = editing === item.ticker
              return (
                <div key={item.ticker} className="py-2.5">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editInput}
                        onChange={(event) => setEditInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void handleUpdate()
                          if (event.key === "Escape") setEditing("")
                        }}
                        aria-label={`Rename ${item.ticker}`}
                        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleUpdate}
                        disabled={!editInput.trim() || saving === item.ticker}
                        title="Save ticker"
                      >
                        {saving === item.ticker
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditing("")}
                        title="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 hover:bg-muted/20"
                      onClick={() => onSelectTicker?.(item.ticker)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.ticker}</p>
                        <p className="text-xs text-muted-foreground">{item.signal || "--"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-mono text-sm">
                            {item.price ? `$${Number(item.price).toFixed(2)}` : "--"}
                          </p>
                          <p className={cn(
                            "flex items-center justify-end gap-1 font-mono text-xs",
                            up ? "text-market-up" : "text-market-down"
                          )}>
                            {up
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />}
                            {pct(item.change_pct)}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(event) => {
                            event.stopPropagation()
                            startEditing(item.ticker)
                          }}
                          title={`Edit ${item.ticker}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleRemove(item.ticker)
                          }}
                          disabled={saving === item.ticker}
                          title={`Remove ${item.ticker}`}
                        >
                          {saving === item.ticker
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
