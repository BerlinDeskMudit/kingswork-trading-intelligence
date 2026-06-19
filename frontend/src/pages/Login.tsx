import { useState } from "react"
import { motion } from "framer-motion"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, TrendingUp } from "lucide-react"
import { paths } from "@/routes/paths"

const TEST_EMAIL = "test@kingstop.dev"
const TEST_PASSWORD = "KingStop@2026"
const DEMO_EMAIL = "demo@kingstop.dev"
const DEMO_PASSWORD = "demo1234"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState(TEST_EMAIL)
  const [password, setPassword] = useState(TEST_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const signIn = async (nextEmail = email, nextPassword = password) => {
    setError("")
    setLoading(true)
    try {
      await login(nextEmail, nextPassword)
      const from = (location.state as { from?: Location } | null)?.from
      const destination = from ? `${from.pathname}${from.search}${from.hash}` : paths.dashboardDefault
      navigate(destination, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn()
  }

  const handleSeedLogin = async (nextEmail: string, nextPassword: string) => {
    setEmail(nextEmail)
    setPassword(nextPassword)
    await signIn(nextEmail, nextPassword)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 bg-grid opacity-[0.05]" />
      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex flex-col justify-between border-r border-white/10 p-10 overflow-hidden">
          <Link to="/" className="flex items-center gap-3">
            <img src="/kingstop-mark.svg" alt="KingStop" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">KingStop</span>
          </Link>

          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary"
            >
              <ShieldCheck className="h-4 w-4" />
              Seeded reviewer account ready
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-5xl font-bold leading-tight tracking-tight"
            >
              Open the trading cockpit in seconds.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 text-lg text-muted-foreground"
            >
              KingStop ships with seeded SQLite users, live market fallbacks, model selection, and a guided first-run tour.
            </motion.p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ["Models", "2 preloaded"],
              ["Wallet", "$100k paper"],
              ["Data", "Live + sample"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-muted-foreground">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >
            <div className="mb-8 flex justify-center lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <img src="/kingstop-mark.svg" alt="KingStop" className="h-9 w-9" />
                <span className="text-2xl font-bold tracking-tight">KingStop</span>
              </Link>
            </div>

            <Card className="border-white/10 bg-card/95 shadow-ink">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                <CardDescription>Use the seeded reviewer account or your own account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={TEST_EMAIL}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button type="submit" className="w-full py-6" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Enter KingStop
                      </>
                    )}
                  </Button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase text-muted-foreground">Seeded access</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="h-auto justify-between border-primary/30 bg-primary/5 px-4 py-3 text-left"
                    onClick={() => handleSeedLogin(TEST_EMAIL, TEST_PASSWORD)}
                    disabled={loading}
                  >
                    <span>
                      <span className="block font-semibold">Test reviewer</span>
                      <span className="block font-mono text-xs text-muted-foreground">{TEST_EMAIL} / {TEST_PASSWORD}</span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-auto justify-between px-4 py-3 text-left"
                    onClick={() => handleSeedLogin(DEMO_EMAIL, DEMO_PASSWORD)}
                    disabled={loading}
                  >
                    <span>
                      <span className="block font-semibold">Demo trader</span>
                      <span className="block font-mono text-xs text-muted-foreground">{DEMO_EMAIL} / {DEMO_PASSWORD}</span>
                    </span>
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="justify-center pb-6">
                <p className="text-sm text-muted-foreground">
                  Need your own account?{" "}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
