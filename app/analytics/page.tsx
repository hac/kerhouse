import { Header } from "@/components/header"
import { buildPageMetadata } from "@/lib/seo"
import { sql } from "@/lib/db"

export const metadata = buildPageMetadata({
  title: "Analytics",
  description: "Live database statistics for repos, profiles, and scraper health.",
  path: "/analytics",
})

export const dynamic = "force-dynamic"

interface RepoStats {
  total_repos: number
  distinct_owners: number
  forks_of_others: number
  stars_100plus: number
  scraped_24h: number
}

interface ProfileStats {
  total_profiles: number
  stale_remaining: number
  fresh: number
  refreshed_24h: number
  pct_fresh: number | null
}

interface HealthStats {
  total_scored: number
  avg_score: number | null
  top_lang: string | null
  active_repos: number
}

interface PRStats {
  total_prs: number
  merged_prs: number
  unique_contributors: number
}

async function getRepoStats(): Promise<RepoStats> {
  const [row] = await sql`
    SELECT
      COUNT(*) AS total_repos,
      COUNT(DISTINCT owner_login) AS distinct_owners,
      COUNT(*) FILTER (WHERE is_fork) AS forks_of_others,
      COUNT(*) FILTER (WHERE stars >= 100) AS stars_100plus,
      COUNT(*) FILTER (WHERE scraped_at >= NOW() - INTERVAL '24 hours') AS scraped_24h
    FROM github_repos
  `
  return row as unknown as RepoStats
}

async function getProfileStats(): Promise<ProfileStats> {
  const [row] = await sql`
    SELECT
      COUNT(*) AS total_profiles,
      COUNT(*) FILTER (
        WHERE gu.scraped_at IS NULL
           OR gu.scraped_at <= to_timestamp(0)
           OR gu.scraped_at < NOW() - INTERVAL '30 days'
      ) AS stale_remaining,
      COUNT(*) FILTER (WHERE gu.scraped_at >= NOW() - INTERVAL '30 days') AS fresh,
      COUNT(*) FILTER (WHERE gu.scraped_at >= NOW() - INTERVAL '24 hours') AS refreshed_24h,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE gu.scraped_at >= NOW() - INTERVAL '30 days')
        / NULLIF(COUNT(*), 0),
        1
      ) AS pct_fresh
    FROM leaderboard l
    LEFT JOIN github_users gu ON gu.username = l.username
  `
  return row as unknown as ProfileStats
}

async function getHealthStats(): Promise<HealthStats> {
  const [row] = await sql`
    SELECT
      COUNT(*) AS total_scored,
      ROUND(AVG(contribution_score)::numeric, 1) AS avg_score,
      (
        SELECT primary_language FROM repo_health
        WHERE gated_reason IS NULL AND primary_language IS NOT NULL
        GROUP BY primary_language ORDER BY COUNT(*) DESC LIMIT 1
      ) AS top_lang,
      COUNT(*) FILTER (WHERE pushed_at >= NOW() - INTERVAL '30 days') AS active_repos
    FROM repo_health
    WHERE gated_reason IS NULL
  `
  return row as unknown as HealthStats
}

async function getPRStats(): Promise<PRStats> {
  const [row] = await sql`
    SELECT
      COUNT(*) AS total_prs,
      COUNT(*) FILTER (WHERE merged_at IS NOT NULL) AS merged_prs,
      COUNT(DISTINCT username) AS unique_contributors
    FROM github_pull_requests
  `
  return row as unknown as PRStats
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border-2 border-foreground p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 bg-foreground/10 w-full mt-2">
      <div
        className="h-full bg-foreground/60"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export default async function AnalyticsPage() {
  const [repoStats, profileStats, healthStats, prStats] = await Promise.all([
    getRepoStats(),
    getProfileStats(),
    getHealthStats(),
    getPRStats(),
  ])

  return (
    <div className="min-h-screen">
      <Header />

      <main className="layout-container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-highlight">Analytics</h1>
          <span className="text-xs text-muted-foreground">Live data</span>
        </div>

        {/* Repos */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-highlight">Repositories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total" value={repoStats.total_repos.toLocaleString()} />
            <StatCard label="Owners" value={repoStats.distinct_owners.toLocaleString()} />
            <StatCard label="Forks" value={repoStats.forks_of_others.toLocaleString()} />
            <StatCard label="100+ Stars" value={repoStats.stars_100plus.toLocaleString()} />
            <StatCard label="Scraped 24h" value={repoStats.scraped_24h.toLocaleString()} />
          </div>
        </section>

        {/* Profiles */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-highlight">Profiles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total" value={profileStats.total_profiles.toLocaleString()} />
            <StatCard label="Fresh (30d)" value={profileStats.fresh.toLocaleString()} />
            <StatCard label="Stale" value={profileStats.stale_remaining.toLocaleString()} />
            <StatCard label="Refreshed 24h" value={profileStats.refreshed_24h.toLocaleString()} />
            <div className="border-2 border-foreground p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">% Fresh</div>
              <div className="text-2xl font-bold tabular-nums">
                {profileStats.pct_fresh ?? 0}%
              </div>
              <ProgressBar pct={profileStats.pct_fresh ?? 0} />
            </div>
          </div>
        </section>

        {/* Health */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-highlight">Repo Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Scored Repos" value={healthStats.total_scored.toLocaleString()} />
            <StatCard label="Avg Score" value={healthStats.avg_score ?? "—"} />
            <StatCard label="Top Language" value={healthStats.top_lang ?? "—"} />
            <StatCard label="Active (30d)" value={healthStats.active_repos.toLocaleString()} />
          </div>
        </section>

        {/* PRs */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-highlight">Pull Requests</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total PRs" value={prStats.total_prs.toLocaleString()} />
            <StatCard label="Merged" value={prStats.merged_prs.toLocaleString()} />
            <StatCard label="Contributors" value={prStats.unique_contributors.toLocaleString()} />
          </div>
        </section>
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
