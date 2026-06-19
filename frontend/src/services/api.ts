import axios from "axios"

const API_BASE = "/api/v1"
const TOKEN_KEY = "kingstop_token"
const USER_KEY = "kingstop_user"
const LEGACY_TOKEN_KEY = "kingswork_token"
const LEGACY_USER_KEY = "kingswork_user"

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(LEGACY_TOKEN_KEY)
      localStorage.removeItem(LEGACY_USER_KEY)
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export async function loginUser(email: string, password: string) {
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)
  const res = await axios.post(`${API_BASE}/auth/login`, formData.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
  return res.data
}

export async function registerUser(email: string, password: string, name: string) {
  const res = await api.post("/auth/register", { email, password, name })
  return res.data
}

export async function getProfile() {
  const res = await api.get("/auth/me")
  return res.data
}

export async function getMarketOverview(market = "us") {
  const res = await api.get("/stocks/overview", { params: { market } })
  return res.data
}

export async function getStockData(ticker: string) {
  const res = await api.get(`/stocks/realtime/${ticker}`)
  return res.data
}

export async function getHistoricalData(ticker: string, period = "1mo") {
  const res = await api.get(`/stocks/historical/${ticker}`, { params: { period } })
  return res.data
}

export async function getPortfolios() {
  const res = await api.get("/portfolio/portfolios")
  return res.data
}

export async function getSignals(ticker: string, modelId?: string, period = "1mo") {
  const res = await api.get(`/signals/${ticker}`, {
    params: { model_id: modelId, period },
  })
  return res.data
}

export async function getAlerts() {
  const res = await api.get("/alerts/rules")
  return res.data
}

export async function getWallet() {
  const res = await api.get("/portfolio/wallet")
  return res.data
}

export async function runBacktest(ticker: string, period = "6mo", modelId?: string) {
  const res = await api.get(`/portfolio/backtest/${ticker}`, {
    params: { period, model_id: modelId },
  })
  return res.data
}

export async function getModes() {
  const res = await api.get("/modes")
  return res.data
}

export async function getTradingModels() {
  const res = await api.get("/models")
  return res.data
}

export async function updateModelPreference(mode: "live" | "backtesting", modelId: string) {
  const res = await api.put("/models/preferences", {
    mode,
    model_id: modelId,
  })
  return res.data
}

export async function getStreak() {
  const res = await api.get("/engagement/streak")
  return res.data
}

export async function claimStreakBonus() {
  const res = await api.post("/engagement/streak/claim-bonus")
  return res.data
}

export async function getAchievements() {
  const res = await api.get("/engagement/achievements")
  return res.data
}

export async function checkAchievements() {
  const res = await api.post("/engagement/achievements/check")
  return res.data
}

export async function getDailyChallenges() {
  const res = await api.get("/engagement/daily-challenges")
  return res.data
}

export async function claimChallengeReward(challengeId: number) {
  const res = await api.post(`/engagement/daily-challenges/${challengeId}/claim`)
  return res.data
}

export async function progressDailyChallenge(requirementType: string) {
  const res = await api.post(`/engagement/daily-challenges/progress?requirement_type=${requirementType}`)
  return res.data
}

export async function getScreener(market = "us", signal?: string) {
  const params: Record<string, string> = { market }
  if (signal) params.signal = signal
  const res = await api.get("/screener", { params })
  return res.data
}

export async function getNews(ticker: string) {
  const res = await api.get(`/news/${ticker}`)
  return res.data
}

export async function getJournalEntries(ticker?: string) {
  const res = await api.get("/journal", { params: ticker ? { ticker } : {} })
  return res.data
}

export async function createJournalEntry(data: {
  ticker: string
  note: string
  sentiment?: string
  entry_price?: number
  exit_price?: number
  pnl?: number
  tags?: string
}) {
  const res = await api.post("/journal", data)
  return res.data
}

export async function deleteJournalEntry(id: number) {
  const res = await api.delete(`/journal/${id}`)
  return res.data
}

export async function getLeaderboard() {
  const res = await api.get("/leaderboard")
  return res.data
}

export async function getPortfolioStats(portfolioId: number) {
  const res = await api.get(`/leaderboard/stats/${portfolioId}`)
  return res.data
}

export async function getPredictMarkets(category?: string, status?: string) {
  const params: Record<string, string> = {}
  if (category) params.category = category
  if (status) params.status = status
  const res = await api.get("/predict", { params })
  return res.data
}

export async function createPredictMarket(data: {
  question: string
  category: string
  ticker?: string
  condition?: string
  threshold?: number
  initial_probability: number
  liquidity: number
}) {
  const res = await api.post("/predict", data)
  return res.data
}

export async function getPredictMarketQuote(marketId: number, side: "YES" | "NO", cost: number) {
  const res = await api.get(`/predict/${marketId}/quote`, { params: { side, cost } })
  return res.data
}

export async function buyPredictShares(marketId: number, side: "YES" | "NO", cost: number) {
  const res = await api.post(`/predict/${marketId}/buy`, { side, cost })
  return res.data
}

export async function sellPredictShares(marketId: number, positionId: number, shares: number) {
  const res = await api.post(`/predict/${marketId}/sell`, { position_id: positionId, shares })
  return res.data
}

export async function resolveMarket(marketId: number, outcome: "YES" | "NO") {
  const res = await api.post(`/predict/${marketId}/resolve?outcome=${outcome}`)
  return res.data
}

export async function buyCash(amountUsd: number) {
  const res = await api.post("/payments/buy-cash", { amount_usd: amountUsd })
  return res.data
}

export async function subscribe(tier: string, billing: string) {
  const res = await api.post("/payments/subscribe", { tier, billing })
  return res.data
}

export async function getSubscription() {
  const res = await api.get("/payments/subscription")
  return res.data
}

export async function cancelSubscription() {
  const res = await api.post("/payments/cancel-subscription")
  return res.data
}

export async function getPaymentHistory() {
  const res = await api.get("/payments/history")
  return res.data
}

export async function getAccountSettings() {
  const res = await api.get("/account/settings")
  return res.data
}

export type OnboardingState = {
  tour: {
    completed: boolean
    dismissed: boolean
    step: number
  }
  first_action: {
    completed: boolean
    source: "dismissed" | "prediction" | "trade" | null
    completed_at: string | null
  }
}

export async function getOnboardingState() {
  const res = await api.get<OnboardingState & { status: string }>("/account/onboarding")
  return res.data
}

export async function updateOnboardingState(data: Partial<OnboardingState["tour"]>) {
  const res = await api.put<OnboardingState & { status: string }>("/account/onboarding", data)
  return res.data
}

export async function completeFirstAction(source: "dismissed" | "prediction" | "trade") {
  const res = await api.put<OnboardingState & { status: string }>("/account/first-action", { source })
  return res.data
}

export async function updateAccountPreferences(data: Record<string, boolean | number | null>) {
  const res = await api.put("/account/preferences", data)
  return res.data
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post("/account/security/password", {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return res.data
}

// ── Watchlist ─────────────────────────────────────────────────────────────
export async function getWatchlist() {
  const res = await api.get("/watchlist")
  return res.data
}
export async function addToWatchlist(ticker: string) {
  const res = await api.post(`/watchlist/${ticker}`)
  return res.data
}
export async function removeFromWatchlist(ticker: string) {
  const res = await api.delete(`/watchlist/${ticker}`)
  return res.data
}
export async function updateWatchlistTicker(ticker: string, nextTicker: string) {
  const res = await api.put(`/watchlist/${ticker}`, { ticker: nextTicker })
  return res.data
}

// ── Index Compare ─────────────────────────────────────────────────────────
export async function getIndexCompare(portfolioId: number, index = "NIFTY50") {
  const res = await api.get(`/index-compare/${portfolioId}`, { params: { index } })
  return res.data
}

// ── AI Signal Explain ─────────────────────────────────────────────────────
export async function getAIExplain(ticker: string, period = "1mo", modelId?: string) {
  const res = await api.get(`/ai-explain/${ticker}`, { params: { period, model_id: modelId } })
  return res.data
}

// ── Broker ────────────────────────────────────────────────────────────────
export async function connectBroker(broker: string, apiKey: string, apiSecret: string) {
  const res = await api.post("/broker/connect", { broker, api_key: apiKey, api_secret: apiSecret })
  return res.data
}
export async function getBrokerConnections() {
  const res = await api.get("/broker/connections")
  return res.data
}
export async function placeBrokerOrder(data: { broker: string; ticker: string; side: string; qty: number; price: number; order_type?: string }) {
  const res = await api.post("/broker/order", data)
  return res.data
}
export async function getBrokerOrders() {
  const res = await api.get("/broker/orders")
  return res.data
}

// ── Notifications ─────────────────────────────────────────────────────────
export async function getNotifications() {
  const res = await api.get("/notifications")
  return res.data
}
export async function getUnreadCount() {
  const res = await api.get("/notifications/unread-count")
  return res.data
}
export async function markNotificationRead(id: number) {
  const res = await api.post(`/notifications/${id}/read`)
  return res.data
}
export async function markAllRead() {
  const res = await api.post("/notifications/read-all")
  return res.data
}

// ── Options Chain ─────────────────────────────────────────────────────────
export async function getOptionsChain(ticker: string) {
  const res = await api.get(`/analytics/options-chain/${ticker}`)
  return res.data
}

// ── Multi-timeframe ───────────────────────────────────────────────────────
export async function getMultiTimeframe(ticker: string) {
  const res = await api.get(`/trading-tools/multitimeframe/${ticker}`)
  return res.data
}

// ── P&L History ───────────────────────────────────────────────────────────
export async function getPnLHistory(portfolioId: number) {
  const res = await api.get(`/analytics/pnl/${portfolioId}`)
  return res.data
}

// ── Social ────────────────────────────────────────────────────────────────
export async function getSocialIdeas(ticker?: string) {
  const res = await api.get("/social/ideas", { params: ticker ? { ticker } : {} })
  return res.data
}
export async function createSocialIdea(data: { ticker: string; direction: string; entry?: number; target?: number; stop?: number; body: string }) {
  const res = await api.post("/social/ideas", data)
  return res.data
}
export async function likeIdea(ideaId: number) {
  const res = await api.post(`/social/ideas/${ideaId}/like`)
  return res.data
}
export async function getIdeaComments(ideaId: number) {
  const res = await api.get(`/social/ideas/${ideaId}/comments`)
  return res.data
}
export async function addIdeaComment(ideaId: number, body: string) {
  const res = await api.post(`/social/ideas/${ideaId}/comments`, { body })
  return res.data
}
export async function getWeeklyBadges() {
  const res = await api.get("/social/weekly-badges")
  return res.data
}

// ── Referral ──────────────────────────────────────────────────────────────
export async function getMyReferralCode() {
  const res = await api.get("/referral/my-code")
  return res.data
}
export async function useReferralCode(code: string) {
  const res = await api.post("/referral/use", { code })
  return res.data
}
export async function getReferralStats() {
  const res = await api.get("/referral/stats")
  return res.data
}

// ── Marketplace ───────────────────────────────────────────────────────────
export async function getMarketplaceStrategies() {
  const res = await api.get("/marketplace")
  return res.data
}
export async function publishStrategy(data: { name: string; description: string; signal_logic: string; price_usd: number; is_free: boolean }) {
  const res = await api.post("/marketplace", data)
  return res.data
}
export async function buyStrategy(id: number) {
  const res = await api.post(`/marketplace/${id}/buy`)
  return res.data
}
export async function getMyPublished() {
  const res = await api.get("/marketplace/my/published")
  return res.data
}
export async function getMyPurchased() {
  const res = await api.get("/marketplace/my/purchased")
  return res.data
}

// ── Price Targets ─────────────────────────────────────────────────────────
export async function getPriceTargets() {
  const res = await api.get("/price-targets")
  return res.data
}
export async function createPriceTarget(data: { ticker: string; target_price: number; direction: string; note?: string }) {
  const res = await api.post("/price-targets", data)
  return res.data
}
export async function deletePriceTarget(id: number) {
  const res = await api.delete(`/price-targets/${id}`)
  return res.data
}

// ── Trade Copy ────────────────────────────────────────────────────────────
export async function getTradeCopyFollowing() {
  const res = await api.get("/trade-copy/following")
  return res.data
}
export async function followPortfolio(portfolioId: number) {
  const res = await api.post("/trade-copy/follow", { portfolio_id: portfolioId })
  return res.data
}
export async function unfollowPortfolio(id: number) {
  const res = await api.delete(`/trade-copy/${id}`)
  return res.data
}
export async function getTradeCopyFeed() {
  const res = await api.get("/trade-copy/feed")
  return res.data
}

// ── Multi-portfolio ───────────────────────────────────────────────────────
export async function createPortfolio(name: string, initialCash = 100000) {
  const res = await api.post("/portfolio/portfolios", { name, initial_cash: initialCash })
  return res.data
}
export async function getPortfolioDetail(id: number) {
  const res = await api.get(`/portfolio/portfolios/${id}`)
  return res.data
}
export async function executeTrade(portfolioId: number, data: { ticker: string; side: string; quantity: number; price: number }) {
  const res = await api.post(`/portfolio/portfolios/${portfolioId}/trade`, data)
  return res.data
}

export default api
