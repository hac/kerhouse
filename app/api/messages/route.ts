import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listConversations, unreadCount } from "@/lib/messages"

export const dynamic = "force-dynamic"

/** GET /api/messages — the signed-in user's conversations + total unread. */
export async function GET() {
  const session = await auth()
  const self = session?.user?.githubUsername
  if (!self) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const [conversations, unread] = await Promise.all([
    listConversations(self),
    unreadCount(self),
  ])

  return NextResponse.json({ self, conversations, unread })
}
