import { Header } from "@/components/header"
import { sql } from "@/lib/db"
import { DevsList, type DevRow } from "@/components/devs-list"
import { languages, countries } from "@/lib/data"
import { buildPageMetadata } from "@/lib/seo"
import {
  buildWhereClause,
  validateCondition,
  getSkillJoinClause,
  getOrderByClause,
  getSkillSelectFragment,
  buildPaginationClause,
} from "@/lib/query-builder"

export const metadata = buildPageMetadata({
  title: "Developers",
  description: "Meet the developers building the future of open source.",
  path: "/devs",
})

const ITEMS_PER_PAGE = 50

interface SkillOption {
  value: string
  label: string
}

interface SkillRow {
  slug: string
  display_name: string
  user_count: number
}

interface LeaderboardRow {
  name: string | null
  username: string
  country: string | null
  score: number | null
  skill_score?: number | null
  // JSONB columns may be returned as strings or already-parsed objects
  unique_skills_json: string | string[] | null
  languages_json: string | string[] | Record<string, unknown> | null
}


/**
 * Fetch skills list from the database
 * Only shows skills that have at least one user with a computed score
 */
async function getSkillsList(): Promise<SkillOption[]> {
  const skills = await sql`
    SELECT s.slug, s.display_name, COUNT(uss.username) as user_count
    FROM skills s
    INNER JOIN user_skill_scores uss ON s.slug = uss.skill_slug
    GROUP BY s.slug, s.display_name, s.category
    HAVING COUNT(uss.username) > 0
    ORDER BY
      CASE s.category
        WHEN 'language' THEN 1
        WHEN 'framework' THEN 2
        WHEN 'platform' THEN 3
        WHEN 'domain' THEN 4
        WHEN 'tool' THEN 5
        ELSE 6
      END,
      COUNT(uss.username) DESC
  ` as SkillRow[]
  return [
    { value: 'all', label: 'All' },
    ...skills.map((s) => ({ value: s.slug, label: `${s.display_name} (${s.user_count})` }))
  ]
}


async function getDevs(
  page: number,
  filters: { skill?: string; language?: string; country?: string; openTo?: string; username?: string; location?: string; topics?: string[] }
) {
  const offset = (page - 1) * ITEMS_PER_PAGE

  // Check if we're filtering by skill using the new scoring system
  const useSkillScoring = !!(filters.skill && filters.skill !== 'all')

  // Base conditions - all conditions use parameterized values
  const conditions: string[] = []
  const params: (string | number)[] = []

  // When filtering by skill, we JOIN on user_skill_scores
  // Note: useSkillScoring already ensures filters.skill is defined and not 'all'
  if (useSkillScoring && filters.skill) {
    const condition = `uss.skill_slug = $${params.length + 1}`
    if (validateCondition(condition)) {
      conditions.push(condition)
      params.push(filters.skill)
    }
  }

  if (filters.language && filters.language !== 'all') {
    const condition = `a.languages_json::text ILIKE $${params.length + 1}`
    if (validateCondition(condition)) {
      conditions.push(condition)
      params.push(`%${filters.language}%`)
    }
  }

  if (filters.country && filters.country !== 'all') {
    const condition = `l.location ILIKE $${params.length + 1}`
    if (validateCondition(condition)) {
      conditions.push(condition)
      params.push(`%${filters.country}%`)
    }
  }

  if (filters.location) {
    const condition = `l.location ILIKE $${params.length + 1}`
    if (validateCondition(condition)) {
      conditions.push(condition)
      params.push(`%${filters.location}%`)
    }
  }

  if (filters.topics && filters.topics.length > 0) {
    // Use EXISTS with github_repos.topics array for efficient topic filtering
    // Topics are normalized to lowercase in the database
    for (const topic of filters.topics) {
      const paramIdx = params.length + 1
      const condition = `EXISTS (
        SELECT 1 FROM user_repo_scores urs
        JOIN github_repos gr ON urs.repo_name = gr.repo_name
        WHERE urs.username = l.username
        AND $${paramIdx} = ANY(gr.topics)
      )`
      if (validateCondition(condition)) {
        conditions.push(condition)
        params.push(topic.toLowerCase()) // Normalize to lowercase
      }
    }
  }

  if (filters.username) {
    // Need separate parameter placeholders for each ILIKE comparison
    const paramIdx1 = params.length + 1
    const paramIdx2 = params.length + 2
    const condition = `(l.username ILIKE $${paramIdx1} OR l.name ILIKE $${paramIdx2})`
    if (validateCondition(condition)) {
      conditions.push(condition)
      params.push(`%${filters.username}%`)
      params.push(`%${filters.username}%`)
    }
  }

  // Use type-safe query fragments
  const whereClause = buildWhereClause(conditions)
  const skillJoin = getSkillJoinClause(useSkillScoring)
  const orderBy = getOrderByClause(useSkillScoring)
  const skillSelect = getSkillSelectFragment(useSkillScoring)
  const pagination = buildPaginationClause(ITEMS_PER_PAGE, offset)

  const [countResult, dbData] = await Promise.all([
    sql.query(
      `
      SELECT COUNT(*) as count
      FROM leaderboard l
      LEFT JOIN analyses a ON l.username = a.username
      ${skillJoin}
      ${whereClause}
      `,
      params
    ),
    sql.query(
      `
      SELECT
        l.name,
        l.username,
        l.location as country,
        ${skillSelect}
        l.total_score as score,
        l.unique_skills_json,
        a.languages_json
      FROM leaderboard l
      LEFT JOIN analyses a ON l.username = a.username
      ${skillJoin}
      ${whereClause}
      ${orderBy}
      ${pagination}
      `,
      params
    )
  ])

  const totalItems = Number(countResult[0].count)

  const devs: DevRow[] = (dbData as LeaderboardRow[]).map((row) => {
    let skills: string[] = []
    try {
      if (row.unique_skills_json) {
        // JSONB columns may be returned as already-parsed objects by Neon
        const skillsData = typeof row.unique_skills_json === 'string'
          ? JSON.parse(row.unique_skills_json)
          : row.unique_skills_json
        if (Array.isArray(skillsData)) {
          skills = skillsData
        }
      }
    } catch (e) {
      console.error("Failed to parse skills for", row.username, e)
    }

    let language = "Unknown"
    try {
      if (row.languages_json) {
        // JSONB columns may be returned as already-parsed objects by Neon
        const langs = typeof row.languages_json === 'string'
          ? JSON.parse(row.languages_json)
          : row.languages_json
        if (Array.isArray(langs) && langs.length > 0) {
          language = langs[0]
        } else if (typeof langs === 'object' && langs !== null) {
          language = Object.keys(langs)[0] || "Unknown"
        }
      }
    } catch (e) {
      console.error("Failed to parse languages for", row.username, e)
    }

    return {
      name: row.name || row.username,
      username: row.username,
      country: row.country || "Unknown",
      // When filtering by skill, show the skill-specific score
      score: row.skill_score ?? row.score ?? 0,
      skills: skills,
      language: language,
    }
  })

  return {
    devs,
    totalItems,
    totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE)
  }
}


export default async function DevsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const page = Number(resolvedParams.page) || 1
  const skill = typeof resolvedParams.skill === 'string' ? resolvedParams.skill : undefined
  const language = typeof resolvedParams.language === 'string' ? resolvedParams.language : undefined
  const country = typeof resolvedParams.country === 'string' ? resolvedParams.country : undefined
  const openTo = typeof resolvedParams.openTo === 'string' ? resolvedParams.openTo : undefined
  const username = typeof resolvedParams.username === 'string' ? resolvedParams.username : undefined
  const location = typeof resolvedParams.location === 'string' ? resolvedParams.location : undefined
  // Parse topics from comma-separated string
  const topicsParam = typeof resolvedParams.topics === 'string' ? resolvedParams.topics : undefined
  const topics = topicsParam ? topicsParam.split(',').filter(Boolean) : undefined

  // Fetch devs and skills list in parallel
  const [{ devs, totalItems, totalPages }, skillsList] = await Promise.all([
    getDevs(page, { skill, language, country, openTo, username, location, topics }),
    getSkillsList()
  ])

  return (
    <div className="min-h-screen">
      <Header />

      <main className="layout-container py-8">
        <DevsList
          initialDevs={devs}
          skillsList={skillsList}
          languages={languages}
          countries={countries}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: ITEMS_PER_PAGE
          }}
        />
      </main>

      <footer className="border-t-2 border-dashed border-foreground/70 py-6">
        <div className="layout-container text-center text-sm">
          <p>
            © 2026 <span className="text-brand">hackerhou.se</span>. A home for <span className="text-highlight">human</span> programmers.
          </p>
        </div>
      </footer>
    </div>
  )
}
