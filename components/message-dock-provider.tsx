"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { MessageChatDock } from "./message-chat-dock"

type MessageDockContextValue = {
  openInbox: () => void
  openMessageDock: (peerUsername: string) => void
  closeMessageDock: () => void
  isOpen: boolean
  /** `null` when the dock is showing the inbox list */
  peerUsername: string | null
}

const MessageDockContext = createContext<MessageDockContextValue | undefined>(undefined)

export function MessageDockProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const selfUsername = session?.user?.githubUsername ?? null
  const [peerUsername, setPeerUsername] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!selfUsername) {
      setOpen(false)
      setPeerUsername(null)
    }
  }, [selfUsername])

  const openInbox = useCallback(() => {
    setPeerUsername(null)
    setOpen(true)
  }, [])

  const openMessageDock = useCallback((peer: string) => {
    setPeerUsername(peer)
    setOpen(true)
  }, [])

  const closeMessageDock = useCallback(() => {
    setOpen(false)
    setPeerUsername(null)
  }, [])

  const value: MessageDockContextValue = {
    openInbox,
    openMessageDock,
    closeMessageDock,
    isOpen: open,
    peerUsername,
  }

  return (
    <MessageDockContext.Provider value={value}>
      {children}
      {open && selfUsername ? (
        <MessageChatDock
          open={open}
          onClose={closeMessageDock}
          peerUsername={peerUsername}
          onOpenPeer={setPeerUsername}
          onBackToInbox={() => setPeerUsername(null)}
          selfUsername={selfUsername}
        />
      ) : null}
    </MessageDockContext.Provider>
  )
}

export function useMessageDock() {
  const ctx = useContext(MessageDockContext)
  if (!ctx) {
    throw new Error("useMessageDock must be used within a MessageDockProvider")
  }
  return ctx
}
