// lib/messages.ts
// Server-side helpers for developer-to-developer direct messages.
// Backed by the `conversations` and `messages` tables. The signed-in
// GitHub identity (auth().user.githubUsername) is always the authoritative
// sender — never trust a username supplied by the client.
// (Only imported by server route handlers under app/api/messages.)
import { sql } from "@/lib/db"

export type ConversationSummary = {
  peer: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
}

export type ChatMessage = {
  id: string
  from: "self" | "peer"
  text: string
  sentAt: string
  readAt: string | null
}

/** GitHub logins are alphanumeric + single hyphens, so ":" is a safe separator. */
function isValidUsername(name: string): boolean {
  return /^[a-zA-Z0-9-]{1,39}$/.test(name)
}

/**
 * Canonical, order-independent key for a pair of users so each unordered
 * pair maps to exactly one conversation row (matches the uq_conversation_pair
 * unique index on (user_a, user_b)).
 */
function conversationKey(a: string, b: string): { id: string; userA: string; userB: string } {
  const [userA, userB] = [a, b].sort((x, y) =>
    x.toLowerCase() < y.toLowerCase() ? -1 : x.toLowerCase() > y.toLowerCase() ? 1 : 0
  )
  return { id: `${userA}:${userB}`, userA, userB }
}

/** True when the username belongs to a real developer on the leaderboard. */
export async function userExists(username: string): Promise<boolean> {
  if (!isValidUsername(username)) return false
  const rows = await sql`SELECT 1 FROM leaderboard WHERE username = ${username} LIMIT 1`
  return rows.length > 0
}

/** All conversations for the signed-in user, most-recent first. */
export async function listConversations(self: string): Promise<ConversationSummary[]> {
  const rows = await sql`
    SELECT
      CASE WHEN c.user_a = ${self} THEN c.user_b ELSE c.user_a END AS peer,
      c.last_message_at,
      CASE WHEN c.user_a = ${self} THEN c.unread_a ELSE c.unread_b END AS unread,
      (
        SELECT m.content FROM messages m
        WHERE m.conversation_id = c.id AND m.is_deleted = false
        ORDER BY m.sent_at DESC LIMIT 1
      ) AS last_message
    FROM conversations c
    WHERE c.user_a = ${self} OR c.user_b = ${self}
    ORDER BY c.last_message_at DESC NULLS LAST
  `
  return rows.map((r) => ({
    peer: r.peer as string,
    lastMessage: (r.last_message as string | null) ?? null,
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at as string).toISOString() : null,
    unread: Number(r.unread) || 0,
  }))
}

/**
 * Full message history between `self` and `peer`, oldest first.
 * Side effect: marks the peer's messages as read and clears `self`'s unread
 * counter for this conversation.
 */
export async function getThread(self: string, peer: string): Promise<ChatMessage[]> {
  const { id } = conversationKey(self, peer)

  const rows = await sql`
    SELECT id, sender_username, content, sent_at, read_at
    FROM messages
    WHERE conversation_id = ${id} AND is_deleted = false
    ORDER BY sent_at ASC
  `

  // Mark the peer's messages read and reset this user's unread badge.
  await sql`
    UPDATE messages SET read_at = NOW()
    WHERE conversation_id = ${id} AND sender_username = ${peer} AND read_at IS NULL
  `
  await sql`
    UPDATE conversations
    SET unread_a = CASE WHEN user_a = ${self} THEN 0 ELSE unread_a END,
        unread_b = CASE WHEN user_b = ${self} THEN 0 ELSE unread_b END
    WHERE id = ${id}
  `

  return rows.map((r) => ({
    id: r.id as string,
    from: r.sender_username === self ? "self" : "peer",
    text: r.content as string,
    sentAt: new Date(r.sent_at as string).toISOString(),
    readAt: r.read_at ? new Date(r.read_at as string).toISOString() : null,
  }))
}

/** Persist a message from `self` to `peer`, creating the conversation if needed. */
export async function sendMessage(self: string, peer: string, content: string): Promise<ChatMessage> {
  const text = content.trim()
  if (!text) throw new Error("Message is empty")
  if (text.length > 4000) throw new Error("Message too long")

  const { id, userA, userB } = conversationKey(self, peer)

  // Upsert the conversation and bump the recipient's (peer's) unread counter.
  await sql`
    INSERT INTO conversations (id, user_a, user_b, last_message_at, unread_a, unread_b, created_at)
    VALUES (
      ${id}, ${userA}, ${userB}, NOW(),
      ${peer === userA ? 1 : 0}, ${peer === userB ? 1 : 0}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      last_message_at = NOW(),
      unread_a = conversations.unread_a + CASE WHEN conversations.user_a = ${peer} THEN 1 ELSE 0 END,
      unread_b = conversations.unread_b + CASE WHEN conversations.user_b = ${peer} THEN 1 ELSE 0 END
  `

  const msgId = crypto.randomUUID()
  const [row] = await sql`
    INSERT INTO messages (id, conversation_id, sender_username, content, is_deleted, sent_at)
    VALUES (${msgId}, ${id}, ${self}, ${text}, false, NOW())
    RETURNING id, sent_at
  `

  return {
    id: row.id as string,
    from: "self",
    text,
    sentAt: new Date(row.sent_at as string).toISOString(),
    readAt: null,
  }
}

/** Total unread messages across all conversations (for the header badge). */
export async function unreadCount(self: string): Promise<number> {
  const [row] = await sql`
    SELECT COALESCE(SUM(
      CASE WHEN user_a = ${self} THEN unread_a
           WHEN user_b = ${self} THEN unread_b ELSE 0 END
    ), 0)::int AS total
    FROM conversations
    WHERE user_a = ${self} OR user_b = ${self}
  `
  return Number(row?.total) || 0
}
