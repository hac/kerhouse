import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { RepoDetailView } from "@/components/repo-detail-view"
import { sql } from "@/lib/db"
import { buildPageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"

interface RepoPageProps {
  params: Promise<{ owner: string; name: string }>
}

export async function generateMetadata({ params }: RepoPageProps): Promise<Metadata> {
  const { owner, name } = await params
  const fullName = `${decodeURIComponent(owner)}/${decodeURIComponent(name)}`

  return buildPageMetadata({
    title: fullName,
    description: `Health breakdown and contribution metrics for ${fullName}.`,
    path: `/repos/${owner}/${name}`,
  })
}

export default async function RepoDetailPage({ params }: RepoPageProps) {
  const { owner: rawOwner, name: rawName } = await params
  const owner = decodeURIComponent(rawOwner)
  const name = decodeURIComponent(rawName)
  const fullName = `${owner}/${name}`

  const [healthRow] = await sql`
    SELECT
      full_name,
      owner_login,
      repo_name,
      primary_language,
      stars,
      is_archived,
      pushed_at,
      last_release_at,
      merged_pr_count,
      closed_pr_count,
      open_pr_count,
      median_first_review_hours,
      median_merge_hours,
      acceptance_rate,
      external_merged_ratio,
      merge_velocity_per_month,
      open_issues_count,
      good_first_issues,
      help_wanted_issues,
      has_contributing,
      has_code_of_conduct,
      mentionable_users,
      sample_size,
      contribution_score,
      responsiveness_score,
      throughput_score,
      acceptance_score,
      newcomer_score,
      liveness_score,
      confidence,
      gated_reason,
      scored_at
    FROM repo_health
    WHERE owner_login = ${owner} AND repo_name = ${name}
    LIMIT 1
  `

  if (!healthRow) notFound()

  const [repoRow] = await sql`
    SELECT description, forks, topics, created_at
    FROM github_repos
    WHERE full_name = ${fullName}
    LIMIT 1
  `

  const repo = {
    fullName: healthRow.full_name,
    owner: healthRow.owner_login,
    name: healthRow.repo_name,
    language: healthRow.primary_language,
    stars: healthRow.stars,
    forks: repoRow?.forks ?? null,
    description: repoRow?.description ?? null,
    topics: repoRow?.topics ?? [],
    createdAt: repoRow?.created_at ?? null,
    isArchived: healthRow.is_archived,
    pushedAt: healthRow.pushed_at,
    lastReleaseAt: healthRow.last_release_at,
    url: `https://github.com/${fullName}`,
    scores: {
      contribution: healthRow.contribution_score,
      responsiveness: healthRow.responsiveness_score,
      throughput: healthRow.throughput_score,
      acceptance: healthRow.acceptance_score,
      newcomer: healthRow.newcomer_score,
      liveness: healthRow.liveness_score,
    },
    confidence: healthRow.confidence,
    pr: {
      merged: healthRow.merged_pr_count,
      closed: healthRow.closed_pr_count,
      open: healthRow.open_pr_count,
      medianFirstReviewHours: healthRow.median_first_review_hours,
      medianMergeHours: healthRow.median_merge_hours,
      acceptanceRate: healthRow.acceptance_rate,
      externalMergedRatio: healthRow.external_merged_ratio,
      mergeVelocityPerMonth: healthRow.merge_velocity_per_month,
      sampleSize: healthRow.sample_size,
    },
    issues: {
      open: healthRow.open_issues_count,
      goodFirstIssue: healthRow.good_first_issues,
      helpWanted: healthRow.help_wanted_issues,
    },
    community: {
      hasContributing: healthRow.has_contributing,
      hasCodeOfConduct: healthRow.has_code_of_conduct,
      mentionableUsers: healthRow.mentionable_users,
    },
    scoredAt: healthRow.scored_at,
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="layout-container py-8">
        <div className="mb-6">
          <Link
            href="/repos"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Repos
          </Link>
        </div>
        <RepoDetailView repo={repo} />
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
