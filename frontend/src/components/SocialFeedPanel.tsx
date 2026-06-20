import { useEffect, useState } from "react"
import { Heart, MessageCircle, Send, Users } from "lucide-react"
import { getSocialIdeas, createSocialIdea, likeIdea, getIdeaComments, addIdeaComment } from "@/services/api.ts"
import { cn } from "@/lib/utils"

const demoIdeas = [
  {
    id: -101,
    ticker: "NVDA",
    direction: "LONG",
    entry: 824,
    target: 872,
    stop: 798,
    body: "Holding the breakout setup while volume stays above the 20-day average. I want a clean close over resistance before adding.",
    likes: 18,
    risk_reward: 1.85,
    author: "Test Trader",
  },
  {
    id: -102,
    ticker: "AAPL",
    direction: "LONG",
    entry: 218,
    target: 232,
    stop: 210,
    body: "Watching for a continuation move after the latest strength in mega-cap tech. Position size stays small until breadth confirms.",
    likes: 11,
    risk_reward: 1.75,
    author: "Market Desk",
  },
  {
    id: -103,
    ticker: "TSLA",
    direction: "SHORT",
    entry: 245,
    target: 228,
    stop: 253,
    body: "Short-term momentum is fading. I would only take this if the intraday lower high holds.",
    likes: 7,
    risk_reward: 2.13,
    author: "Risk First",
  },
]

const demoComments: Record<number, any[]> = {
  [-101]: [
    { id: -1, author: "Alex", body: "I like the volume confirmation requirement." },
    { id: -2, author: "Sam", body: "Keeping this one on watch for the open." },
  ],
  [-102]: [{ id: -3, author: "Maya", body: "Good level. I have 233 as the next supply area." }],
  [-103]: [{ id: -4, author: "Dev", body: "Needs discipline; this can squeeze quickly." }],
}

function normalizeIdeas(payload: any): any[] {
  const rows = Array.isArray(payload?.ideas) ? payload.ideas : Array.isArray(payload) ? payload : []
  return rows.length ? rows : demoIdeas
}

export default function SocialFeedPanel() {
  const [ideas, setIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ ticker: "", direction: "LONG", entry: "", target: "", stop: "", body: "" })
  const [showForm, setShowForm] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Record<number, any[]>>({})
  const [commentInput, setCommentInput] = useState<Record<number, string>>({})

  const refresh = () => {
    setLoading(true)
    getSocialIdeas()
      .then((d) => setIdeas(normalizeIdeas(d)))
      .catch(() => setIdeas(demoIdeas))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handlePost = async () => {
    if (!form.ticker || !form.body) return
    const payload = {
      ticker: form.ticker.toUpperCase(),
      direction: form.direction,
      entry: form.entry ? Number(form.entry) : undefined,
      target: form.target ? Number(form.target) : undefined,
      stop: form.stop ? Number(form.stop) : undefined,
      body: form.body,
    }
    const created = await createSocialIdea(payload).catch(() => null)
    if (!created) {
      setIdeas((current) => [
        {
          id: Date.now(),
          ...payload,
          likes: 0,
          risk_reward: payload.entry && payload.target && payload.stop
            ? Number((Math.abs(payload.target - payload.entry) / Math.max(Math.abs(payload.entry - payload.stop), 0.01)).toFixed(2))
            : null,
          author: "Test User",
        },
        ...current,
      ])
    }
    setForm({ ticker: "", direction: "LONG", entry: "", target: "", stop: "", body: "" })
    setShowForm(false)
    if (created) refresh()
  }

  const handleLike = async (id: number) => {
    await likeIdea(id).catch(() => {})
    setIdeas((p) => p.map((idea) => idea.id === id ? { ...idea, likes: (idea.likes || 0) + 1 } : idea))
  }

  const toggleComments = async (id: number) => {
    if (expandedComments[id]) {
      setExpandedComments((p) => { const n = { ...p }; delete n[id]; return n })
    } else {
      const d = await getIdeaComments(id).catch(() => ({ comments: [] }))
      setExpandedComments((p) => ({ ...p, [id]: (d.comments || []).length ? d.comments : (demoComments[id] || []) }))
    }
  }

  const handleComment = async (id: number) => {
    const body = commentInput[id]?.trim()
    if (!body) return
    await addIdeaComment(id, body).catch(() => {})
    setCommentInput((p) => ({ ...p, [id]: "" }))
    const d = await getIdeaComments(id).catch(() => ({ comments: [] }))
    setExpandedComments((p) => ({ ...p, [id]: d.comments || [] }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Social Feed</span>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90"
        >
          <Send className="h-3 w-3" /> Post Idea
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-white/10 bg-card/70 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.ticker} onChange={(e) => setForm((p) => ({ ...p, ticker: e.target.value }))}
              placeholder="Ticker (e.g. AAPL)" className="h-8 rounded-md border border-input bg-background px-3 text-sm outline-none" />
            <select value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm outline-none">
              <option>LONG</option><option>SHORT</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["entry", "target", "stop"].map((f) => (
              <input key={f} value={(form as any)[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                type="number" className="h-8 rounded-md border border-input bg-background px-3 text-sm outline-none" />
            ))}
          </div>
          <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder="Share your trade thesis..." rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="h-8 px-3 rounded-md border border-input text-sm hover:bg-muted">Cancel</button>
            <button onClick={handlePost} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90">Post</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading feed...</p>
      ) : ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No ideas yet. Be the first to share!</p>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-lg border border-white/10 bg-card/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{idea.ticker}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                    idea.direction === "LONG" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  )}>{idea.direction}</span>
                  {idea.risk_reward && <span className="text-xs text-muted-foreground">R/R {idea.risk_reward}x</span>}
                </div>
                <span className="text-xs text-muted-foreground">@{idea.author}</span>
              </div>

              {(idea.entry || idea.target || idea.stop) && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {idea.entry && <span>Entry: <b>${idea.entry}</b></span>}
                  {idea.target && <span>Target: <b className="text-green-400">${idea.target}</b></span>}
                  {idea.stop && <span>Stop: <b className="text-red-400">${idea.stop}</b></span>}
                </div>
              )}

              <p className="text-sm">{idea.body}</p>

              <div className="flex items-center gap-4 pt-1">
                <button onClick={() => handleLike(idea.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400">
                  <Heart className="h-3.5 w-3.5" /> {idea.likes || 0}
                </button>
                <button onClick={() => toggleComments(idea.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <MessageCircle className="h-3.5 w-3.5" /> Comments
                </button>
              </div>

              {expandedComments[idea.id] !== undefined && (
                <div className="pt-2 space-y-2 border-t border-white/10">
                  {expandedComments[idea.id].map((c: any) => (
                    <div key={c.id} className="text-xs">
                      <span className="font-medium">{c.author}:</span> {c.body}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={commentInput[idea.id] || ""}
                      onChange={(e) => setCommentInput((p) => ({ ...p, [idea.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleComment(idea.id)}
                      placeholder="Add comment..."
                      className="h-7 flex-1 rounded-md border border-input bg-background px-3 text-xs outline-none"
                    />
                    <button onClick={() => handleComment(idea.id)} className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-xs">Send</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
