import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getThread, sendMessage, userExists } from "@/lib/messages"

export const dynamic = "force-dynamic"

/** GET /api/messages/[peer] — full thread with `peer` (marks it read). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ peer: string }> }
) {
  const session = await auth()
  const self = session?.user?.githubUsername
  if (!self) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { peer: rawPeer } = await params
  const peer = decodeURIComponent(rawPeer)
  if (peer === self) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 })
  }

  const messages = await getThread(self, peer)
  return NextResponse.json({ self, peer, messages })
}

/** POST /api/messages/[peer] — send a message to `peer`. Body: { content }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ peer: string }> }
) {
  const session = await auth()
  const self = session?.user?.githubUsername
  if (!self) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { peer: rawPeer } = await params
  const peer = decodeURIComponent(rawPeer)
  if (peer === self) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 })
  }

  let body: { content?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 })
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 })
  }

  // Only allow messaging real developers on the platform.
  if (!(await userExists(peer))) {
    return NextResponse.json({ error: "Unknown developer" }, { status: 404 })
  }

  const message = await sendMessage(self, peer, content)
  return NextResponse.json({ message }, { status: 201 })
}
