import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/topics?q=search_term
 *
 * Searches for topics across:
 * 1. Skills table (display_name, match_topics, match_keywords)
 * 2. Repo topics from repo_topic_counts materialized view
 *
 * Returns top 20 matching topics with user counts
 *
 * Optimizations:
 * - Pre-aggregates user counts per skill using CTE instead of correlated subqueries
 * - Uses repo_topic_counts materialized view (34K rows) instead of unnesting 2.1M repos
 * - Trigram index (idx_rtc_topic_trgm) enables fast ILIKE searches (~20-30ms vs ~1500ms)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.toLowerCase().trim() || ""

  if (query.length < 1) {
    return NextResponse.json({ topics: [] })
  }

  try {
    // Search across multiple sources for matching topics
    const results = await sql`
      WITH
      -- 1. Pre-aggregate user counts per skill (only ~28 skills, very fast)
      skill_user_counts AS (
        SELECT skill_slug, COUNT(*) as user_count
        FROM user_skill_scores
        GROUP BY skill_slug
      ),
      -- 2. Match skills - small table, full scan is fine
      skill_matches AS (
        SELECT
          s.slug as topic,
          s.display_name as label,
          'skill' as source,
          COALESCE(c.user_count, 0) as user_count
        FROM skills s
        LEFT JOIN skill_user_counts c ON c.skill_slug = s.slug
        WHERE
          s.display_name ILIKE ${'%' + query + '%'}
          OR s.slug ILIKE ${'%' + query + '%'}
          OR s.match_topics::text ILIKE ${'%' + query + '%'}
          OR s.match_keywords::text ILIKE ${'%' + query + '%'}
      )
      -- Combine skill matches with repo topics from materialized view
      SELECT topic, label, source, user_count
      FROM (
        SELECT * FROM skill_matches
        UNION ALL
        SELECT
          topic,
          topic as label,
          'repo' as source,
          repo_count as user_count
        FROM repo_topic_counts
        WHERE topic ILIKE ${'%' + query + '%'}
          AND topic NOT IN (SELECT slug FROM skills)
      ) combined
      ORDER BY user_count DESC, label ASC
      LIMIT 20
    `

    interface TopicResult {
      topic: string
      label: string
      source: string
      user_count: number
    }

    const topics = (results as TopicResult[]).map((r) => ({
      value: r.topic,
      label: r.label,
      source: r.source
    }))

    return NextResponse.json({ topics })
  } catch (error) {
    console.error("Error searching topics:", error)
    return NextResponse.json({ topics: [], error: "Failed to search topics" }, { status: 500 })
  }
}
