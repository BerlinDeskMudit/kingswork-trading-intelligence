import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { Bot, BrainCircuit, CheckCircle2, Loader2, RefreshCw, Send, ShieldCheck, Sparkles, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { sendLlmChat, type LlmChatMessage } from "@/services/api"

const storageKey = "kingstop_llm_chat_messages"

const starterCards = [
  {
    icon: Target,
    title: "I need one next step",
    body: "When the app feels busy, turn it into a small action.",
    prompt: "I feel unsure where to start. Ask me a few questions and choose one low-risk next step in KingStop.",
  },
  {
    icon: ShieldCheck,
    title: "Review a trade idea",
    body: "Check thesis, invalidation, risk, and emotional bias.",
    prompt: "Help me review a trade idea. Guide me through thesis, invalidation, position size, stop, target, and what could make me wrong.",
  },
  {
    icon: BrainCircuit,
    title: "Explain a screen",
    body: "Make any dashboard page easier to understand.",
    prompt: "Explain how I should use the current KingStop dashboard sections and what each one is best for.",
  },
  {
    icon: CheckCircle2,
    title: "Make a checklist",
    body: "Create a calm repeatable routine before taking action.",
    prompt: "Create a simple pre-trade checklist I can follow before placing any paper trade or prediction.",
  },
]

const promptChips = [
  "What am I missing?",
  "Make this simpler",
  "Give me a risk checklist",
  "Help me decide calmly",
]

function readStoredMessages(): LlmChatMessage[] {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((message) => message?.role && typeof message.content === "string").slice(-20)
  } catch {
    return []
  }
}

export default function LlmChatPanel() {
  const [messages, setMessages] = useState<LlmChatMessage[]>(() => readStoredMessages())
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const hasConversation = messages.length > 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)))
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const assistantTone = useMemo(() => {
    if (!hasConversation) return "Ready"
    if (loading) return "Thinking"
    return "In session"
  }, [hasConversation, loading])

  const submit = async (override?: string) => {
    const content = (override ?? draft).trim()
    if (!content || loading) return

    const nextMessages = [...messages, { role: "user" as const, content }]
    setMessages(nextMessages)
    setDraft("")
    setError("")
    setLoading(true)

    try {
      const response = await sendLlmChat(nextMessages)
      setMessages((current) => [...current, response.message])
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Chat is unavailable. Check the backend and Groq API key.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  const resetChat = () => {
    setMessages([])
    setDraft("")
    setError("")
    localStorage.removeItem(storageKey)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-[calc(100vh-116px)] min-h-[620px] flex-col overflow-hidden rounded-lg border border-white/10 bg-card/70 shadow-ink">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-background/35 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">KingStop Chat</h2>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{assistantTone}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">A calm thinking partner for decisions, risk checks, and app guidance.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetChat}
          className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-white/10 px-3 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New chat
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {!hasConversation ? (
            <section className="py-6">
              <div className="rounded-2xl border border-white/10 bg-background/60 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">What are you trying to decide?</h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Start messy. Name the uncertainty, and KingStop Chat will help turn it into a clear next step.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {starterCards.map(({ icon: Icon, title, body, prompt }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => void submit(prompt)}
                    className="group rounded-xl border border-white/10 bg-background/60 p-4 text-left transition hover:border-primary/35 hover:bg-primary/10"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{body}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {messages.map((message, index) => {
            const isUser = message.role === "user"
            return (
              <div key={`${message.role}-${index}`} className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
                {!isUser ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : null}
                <div className={cn("max-w-[82%]", isUser && "flex flex-col items-end")}>
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">{isUser ? "You" : "KingStop Chat"}</p>
                  <div
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                      isUser
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm border border-white/10 bg-background/75 text-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            )
          })}

          {loading ? (
            <div className="flex gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">KingStop Chat</p>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/10 bg-background/75 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Turning this into a useful next step
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mx-auto mb-2 w-[calc(100%-2rem)] max-w-3xl rounded-md bg-market-down/10 px-3 py-2 text-xs text-market-down">{error}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="border-t border-white/10 bg-background/45 px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {!hasConversation ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {promptChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDraft(chip)}
                  className="rounded-full border border-white/10 bg-card/70 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-background p-2 shadow-ink focus-within:border-primary/35">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start with the messy thought, trade idea, or question..."
              rows={2}
              className="min-h-12 flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading}
              className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              title="Send message"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Enter sends. Shift+Enter adds a new line.</span>
            <span>Educational guidance only. Use your own judgment before trading.</span>
          </div>
        </div>
      </form>
    </div>
  )
}
