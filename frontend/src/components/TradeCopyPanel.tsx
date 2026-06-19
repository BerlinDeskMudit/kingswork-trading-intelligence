import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { UserMinus, UserPlus, RefreshCw } from "lucide-react"

const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("kingstop_token")
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

interface Following {
  id: number
  portfolio_id: number
  portfolio_name?: string
}

interface FeedTrade {
  id: number
  ticker: string
  side: "BUY" | "SELL"
  price: number
  quantity: number
  created_at: string
  portfolio_name?: string
}

export default function TradeCopyPanel() {
  const [following, setFollowing] = useState<Following[]>([])
  const [feed, setFeed] = useState<FeedTrade[]>([])
  const [portfolioId, setPortfolioId] = useState("")

  const loadFollowing = () => api.get("/trade-copy/following").then((r) => setFollowing(r.data)).catch(() => {})
  const loadFeed = useCallback(() => api.get("/trade-copy/feed").then((r) => setFeed(r.data)).catch(() => {}), [])

  useEffect(() => {
    loadFollowing()
    loadFeed()
    const timer = setInterval(loadFeed, 30_000)
    return () => clearInterval(timer)
  }, [loadFeed])

  const follow = async () => {
    if (!portfolioId.trim()) return
    await api.post("/trade-copy/follow", { portfolio_id: parseInt(portfolioId) }).catch(() => {})
    setPortfolioId("")
    loadFollowing()
  }

  const unfollow = async (id: number) => {
    await api.delete(`/trade-copy/${id}`).catch(() => {})
    loadFollowing()
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">Trade Copy</h2>

      {/* Following */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Following</h3>
          <div className="flex gap-2 items-center">
            <input
              className="border rounded px-2 py-1 text-xs w-28 dark:bg-gray-700 dark:border-gray-600"
              placeholder="Portfolio ID"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && follow()}
            />
            <button
              onClick={follow}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            >
              <UserPlus size={12} /> Follow
            </button>
          </div>
        </div>

        {following.length === 0 ? (
          <p className="text-xs text-gray-400">Not following anyone yet.</p>
        ) : (
          <div className="space-y-1">
            {following.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
                <span className="text-sm">{f.portfolio_name ?? `Portfolio #${f.portfolio_id}`}</span>
                <button onClick={() => unfollow(f.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                  <UserMinus size={12} /> Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trade feed */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Trade Feed</h3>
          <span className="text-xs text-gray-400">(auto-refreshes every 30s)</span>
          <button onClick={loadFeed} className="ml-auto text-gray-400 hover:text-gray-600">
            <RefreshCw size={12} />
          </button>
        </div>

        {feed.length === 0 ? (
          <p className="text-xs text-gray-400">No recent trades from followed portfolios.</p>
        ) : (
          <div className="space-y-1">
            {feed.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 text-sm">
                <span className="font-medium w-16">{t.ticker}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.side === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {t.side}
                </span>
                <span className="text-gray-500 text-xs">x{t.quantity}</span>
                <span className="text-xs font-medium">${t.price?.toFixed(2)}</span>
                {t.portfolio_name && <span className="text-xs text-gray-400 ml-auto">{t.portfolio_name}</span>}
                <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
