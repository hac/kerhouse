import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { UserProfileView } from "@/components/user-profile-view"
import { sql } from "@/lib/db"
import { buildPageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username: raw } = await params
  const username = decodeURIComponent(raw)
  
  const [dev] = await sql`
    SELECT name, username FROM leaderboard WHERE username = ${username}
  `
  
  if (!dev) return buildPageMetadata({ title: "Profile", path: `/${username}` })
  
  return buildPageMetadata({
    title: `${dev.name || dev.username}`,
    description: `View ${dev.name || dev.username}'s profile on Kerhouse.`,
    path: `/${username}`,
  })
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username: raw } = await params
  const username = decodeURIComponent(raw)
  
  const [dbData] = await sql`
    SELECT
      l.*,
      a.languages_json,
      a.contribution_count,
      a.top_repos_json,
      us.contributor_efficiency,
      (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.total_score > l.total_score) as rank
    FROM leaderboard l
    LEFT JOIN analyses a ON l.username = a.username
    LEFT JOIN user_scores us ON l.username = us.username
    WHERE l.username = ${username}
  `

  if (!dbData) notFound()

  // Parse unique_skills safely (Postgres text[] -> JS array)
  let skills: string[] = []
  try {
    if (dbData.unique_skills) {
      const skillsData = Array.isArray(dbData.unique_skills)
        ? dbData.unique_skills
        : []
      if (Array.isArray(skillsData)) {
        skills = skillsData
      }
    }
  } catch (e) {
    console.error("Failed to parse skills", e)
  }

  // Fallback: when unique_skills is empty (the analysis job never synced this
  // user), derive skill tags from the repo metadata that does exist — the
  // primary language and GitHub topics of the user's scored repos, joined via
  // user_repo_scores. unique_skills is itself just a list of lowercased
  // repo topics/languages, so this mirrors how it would have been populated.
  if (skills.length === 0) {
    try {
      const tagRows = await sql`
        SELECT gr.primary_language, gr.topics
        FROM user_repo_scores urs
        JOIN github_repos gr ON gr.full_name = urs.repo_name
        WHERE urs.username = ${username}
        ORDER BY urs.repo_score DESC NULLS LAST
        LIMIT 30
      `
      const seen = new Set<string>()
      const derived: string[] = []
      const add = (raw: unknown) => {
        if (typeof raw !== "string") return
        const tag = raw.toLowerCase().trim()
        if (tag && !seen.has(tag)) {
          seen.add(tag)
          derived.push(tag)
        }
      }
      // Primary languages first (stronger signal -> shown under "Strong in"),
      // then repo topics.
      for (const row of tagRows) add(row.primary_language)
      for (const row of tagRows) {
        if (Array.isArray(row.topics)) row.topics.forEach(add)
      }
      skills = derived.slice(0, 12)
    } catch (e) {
      console.error("Failed to derive fallback skills from github_repos", e)
    }
  }

  // Split skills into strong and also
  const skillsStrong = skills.slice(0, 3)
  const skillsAlso = skills.slice(3)

  // Parse languages_json to get primary language
  // JSONB columns may be returned as already-parsed objects by Neon
  let language = "Unknown"
  try {
    if (dbData.languages_json) {
      const langs = typeof dbData.languages_json === 'string'
        ? JSON.parse(dbData.languages_json)
        : dbData.languages_json
      if (Array.isArray(langs) && langs.length > 0) {
        language = langs[0]
      } else if (typeof langs === 'object' && langs !== null) {
        language = Object.keys(langs)[0] || "Unknown"
      }
    }
  } catch (e) {
    console.error("Failed to parse languages", e)
  }

  // Parse top_repos_json into contributions
  // JSONB columns may be returned as already-parsed objects by Neon
  interface RepoData {
    full_name?: string
    fullName?: string
    ownerLogin?: string
    owner?: string
    name?: string
    userPRs?: number
    prs?: number
    stars?: number
    language?: string
    score?: number
  }
  let contributions: { kind: string; repo: string; title: string; time: string; score?: number }[] | undefined = undefined
  try {
    if (dbData.top_repos_json) {
      const repos = typeof dbData.top_repos_json === 'string'
        ? JSON.parse(dbData.top_repos_json)
        : dbData.top_repos_json
      if (Array.isArray(repos)) {
        contributions = repos.map((r: RepoData) => {
          // Resolve a full "owner/repo" slug from the many field-name variants
          // that appear across data sources. Fall back to the profile's own
          // username as the owner when only a bare repo name is available, so
          // GitHub links always point at a real repository.
          const ownerLogin = r.ownerLogin || r.owner
          const fullName = r.full_name || r.fullName
          let repoName = ""
          if (fullName && fullName.includes("/")) {
            repoName = fullName
          } else if (ownerLogin && r.name) {
            repoName = `${ownerLogin}/${r.name}`
          } else if (r.name) {
            repoName = `${username}/${r.name}`
          } else if (fullName) {
            repoName = fullName
          }
          const prCount = r.userPRs ?? r.prs ?? 0
          const stars = r.stars || 0

          return {
            kind: "commit", // Default to commit as we don't have specific types for each
            repo: repoName,
            title: `${prCount} PR${prCount !== 1 ? 's' : ''} contributed · ${stars.toLocaleString()} stars`,
            time: r.language || "Recent",
            score: r.score,
          }
        })
      }
    }
  } catch (e) {
    console.error("Failed to parse top repos", e)
  }

  // Fallback: when the analysis row has no repo list (analyses.top_repos_json
  // is empty/missing, as it is for many users whose analysis job never synced),
  // build the contributions list from user_repo_scores instead — the same
  // source family the total_score is derived from. github_repos is joined for
  // fresh star counts and the primary language.
  if (!contributions || contributions.length === 0) {
    try {
      const repoRows = await sql`
        SELECT
          urs.repo_name,
          urs.user_prs,
          COALESCE(gr.stars, urs.stars, 0) AS stars,
          gr.primary_language,
          urs.repo_score
        FROM user_repo_scores urs
        LEFT JOIN github_repos gr ON gr.full_name = urs.repo_name
        WHERE urs.username = ${username}
        ORDER BY urs.repo_score DESC NULLS LAST
        LIMIT 20
      `
      if (repoRows.length > 0) {
        contributions = repoRows.map((r) => {
          const prCount = Number(r.user_prs) || 0
          const stars = Number(r.stars) || 0
          return {
            kind: "commit",
            // urs.repo_name is already an "owner/repo" slug.
            repo: r.repo_name as string,
            title: `${prCount} PR${prCount !== 1 ? "s" : ""} contributed · ${stars.toLocaleString()} stars`,
            time: (r.primary_language as string) || "Recent",
            score: r.repo_score != null ? Number(r.repo_score) : undefined,
          }
        })
      }
    } catch (e) {
      console.error("Failed to load fallback repos from user_repo_scores", e)
    }
  }

  const dev = {
    name: dbData.name || dbData.username,
    username: dbData.username,
    skills: skills,
    repos: dbData.contribution_count || 0,
    followers: 0,
    language: language,
    country: dbData.location || "Unknown",
  }

  return (
    <div className="min-h-screen">
      <Header />
      <UserProfileView 
        dev={dev} 
        bio={dbData.bio}
        weeklyRank={Number(dbData.rank)}
        weeklyScore={dbData.total_score}
        skillsStrong={skillsStrong}
        skillsAlso={skillsAlso}
        contributions={contributions}
        scores={{
          backend: dbData.backend_score,
          frontend: dbData.frontend_score,
          devops: dbData.devops_score,
          data: dbData.data_score,
          ai: dbData.ai_score,
          efficiency: dbData.contributor_efficiency,
        }}
      />
    </div>
  )
}
