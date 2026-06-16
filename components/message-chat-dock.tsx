"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronUp, Minus, Send, X } from "lucide-react"

export type ChatBubble = {
  id: string
  from: "self" | "peer"
  text: string
  time: string
}

type ConversationSummary = {
  peer: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
}

type ApiMessage = {
  id: string
  from: "self" | "peer"
  text: string
  sentAt: string
  readAt: string | null
}

const POLL_MS = 5000

function formatTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function toBubble(m: ApiMessage): ChatBubble {
  return { id: m.id, from: m.from, text: m.text, time: formatTime(m.sentAt) }
}

export function MessageChatDock({
  open,
  onClose,
  peerUsername,
  onOpenPeer,
  onBackToInbox,
  selfUsername,
}: {
  open: boolean
  onClose: () => void
  peerUsername: string | null
  onOpenPeer: (peer: string) => void
  onBackToInbox: () => void
  selfUsername: string
}) {
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [draft, setDraft] = useState("")
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isInbox = peerUsername === null

  // Load the conversation list while the inbox is visible (with light polling).
  useEffect(() => {
    if (!open || !isInbox) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/messages")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setConversations(data.conversations ?? [])
      } catch {
        /* transient network error — keep showing last data */
      }
    }
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    const interval = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [open, isInbox])

  // Load (and poll) the message history for the open peer.
  useEffect(() => {
    if (!open || !peerUsername) return
    let cancelled = false
    const load = async (withSpinner: boolean) => {
      if (withSpinner) setLoading(true)
      try {
        const res = await fetch(`/api/messages/${encodeURIComponent(peerUsername)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setMessages((data.messages ?? []).map(toBubble))
      } catch {
        /* keep last data on transient error */
      } finally {
        if (!cancelled && withSpinner) setLoading(false)
      }
    }
    setMessages([])
    setDraft("")
    setError(null)
    load(true)
    const interval = setInterval(() => load(false), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [open, peerUsername])

  useEffect(() => {
    if (!open) setCollapsed(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (peerUsername) onBackToInbox()
      else onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, peerUsername, onBackToInbox, onClose])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open, isInbox])

  const send = useCallback(async () => {
    const t = draft.trim()
    if (!t || !peerUsername || sending) return

    setSending(true)
    setError(null)
    const optimistic: ChatBubble = {
      id: `temp-${Date.now()}`,
      from: "self",
      text: t,
      time: formatTime(new Date().toISOString()),
    }
    setMessages((m) => [...m, optimistic])
    setDraft("")

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(peerUsername)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: t }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to send message")
      }
      const data = await res.json()
      // Swap the optimistic bubble for the persisted one.
      setMessages((m) =>
        m.map((b) => (b.id === optimistic.id ? toBubble(data.message) : b))
      )
    } catch (err) {
      setMessages((m) => m.filter((b) => b.id !== optimistic.id))
      setDraft(t)
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }, [draft, peerUsername, sending])

  if (!open) return null

  /** Below md: centered 90×90 modal; md+: bottom-right sheet (matches hooks/use-mobile 768px). */
  const dockCollapsed =
    "fixed z-[100] bottom-0 border-2 border-foreground bg-background/90 backdrop-blur-sm flex items-center justify-between gap-2 px-3 py-2 max-md:left-1/2 max-md:right-auto max-md:w-[min(90vw,360px)] max-md:-translate-x-1/2 md:left-auto md:right-5 md:w-[360px]"
  const dockExpanded =
    "fixed z-[100] border-2 border-foreground bg-background/90 backdrop-blur-sm flex flex-col max-md:left-1/2 max-md:top-1/2 max-md:-translate-x-1/2 max-md:-translate-y-1/2 max-md:bottom-auto max-md:right-auto max-md:w-[90vw] max-md:h-[90dvh] max-md:max-h-[90dvh] md:bottom-0 md:left-auto md:right-5 md:top-auto md:translate-x-0 md:translate-y-0 md:w-[360px] md:h-[min(100dvh,420px)] md:max-h-[min(100dvh,420px)]"

  const mobileBackdrop = (
    <div
      className="fixed inset-0 z-[99] bg-foreground/25 md:hidden"
      aria-hidden
      onClick={onClose}
    />
  )

  const headerTitle = isInbox ? "Inbox" : peerUsername
  const collapsedLabel = isInbox ? "Inbox" : peerUsername

  if (collapsed) {
    return (
      <>
        {mobileBackdrop}
        <div
          className={dockCollapsed}
          role="dialog"
          aria-label={isInbox ? "Inbox" : `Message ${peerUsername}`}
          onDoubleClick={() => setCollapsed(false)}
        >
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="min-w-0 flex-1 text-left text-sm font-bold text-highlight truncate hover:underline underline-offset-2"
            aria-expanded="false"
          >
            {collapsedLabel}
          </button>
          <div
            className="flex items-center gap-0.5 shrink-0"
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1 hover:bg-foreground/10"
              aria-label="Expand"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1 hover:bg-foreground/10" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {mobileBackdrop}
      <div
        className={dockExpanded}
        role="dialog"
        aria-label={isInbox ? "Inbox" : `Message ${peerUsername}`}
        aria-expanded="true"
      >
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-foreground shrink-0 cursor-default"
          onDoubleClick={() => setCollapsed(true)}
        >
          {isInbox ? (
            <p className="text-sm font-bold text-highlight truncate min-w-0">Inbox</p>
          ) : (
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <button
                type="button"
                onClick={onBackToInbox}
                className="p-1 shrink-0 hover:bg-foreground/10"
                aria-label="Back to inbox"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <p className="text-sm font-bold text-highlight truncate min-w-0">{headerTitle}</p>
            </div>
          )}
          <div
            className="flex items-center gap-0.5 shrink-0"
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1 hover:bg-foreground/10"
              aria-label="Collapse"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1 hover:bg-foreground/10" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isInbox ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                {loading ? "Loading…" : "No conversations yet. Open a developer's profile and hit Message to start one."}
              </p>
            ) : (
              <ul className="divide-y divide-foreground border-b border-foreground">
                {conversations.map((t) => (
                  <li key={t.peer}>
                    <button
                      type="button"
                      onClick={() => onOpenPeer(t.peer)}
                      className="group/inboxrow block w-full cursor-pointer text-left py-3 px-3 hover:bg-foreground hover:text-background"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-highlight text-sm group-hover/inboxrow:text-background flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t.peer}</span>
                          {t.unread > 0 ? (
                            <span className="shrink-0 text-[10px] font-bold bg-highlight text-background rounded-full px-1.5 py-0.5 group-hover/inboxrow:bg-background group-hover/inboxrow:text-foreground">
                              {t.unread}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0 group-hover/inboxrow:text-background/80">
                          {formatTime(t.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1 group-hover/inboxrow:text-background/80">
                        {t.lastMessage ?? "No messages yet"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-sm min-h-0">
              {loading && messages.length === 0 ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-muted-foreground">
                  No messages yet. Say hi to {peerUsername}.
                </p>
              ) : (
                messages.map((m, i) => {
                  const label = m.from === "self" ? selfUsername : peerUsername
                  const prev = messages[i - 1]
                  const next = messages[i + 1]
                  const showHeader = i === 0 || prev?.from !== m.from
                  const showTime = i === messages.length - 1 || next?.from !== m.from
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[95%] min-w-0 ${showHeader ? (i === 0 ? "" : "mt-4") : "mt-1.5"}`}
                    >
                      {showHeader ? (
                        <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
                      ) : null}
                      <p className="leading-snug text-foreground">{m.text}</p>
                      {showTime ? (
                        <p className="text-[10px] mt-1 tabular-nums text-muted-foreground">{m.time}</p>
                      ) : null}
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {error ? (
              <p className="px-3 pb-1 text-[11px] text-red-500" role="alert">
                {error}
              </p>
            ) : null}

            <div className="border-t-2 border-foreground p-2 shrink-0 flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={2}
                placeholder="Write a message…"
                className="flex-1 min-h-[40px] max-h-24 border border-foreground bg-background px-2 py-1.5 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending}
                className="shrink-0 border-2 border-foreground p-2 hover:bg-foreground hover:text-background disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
