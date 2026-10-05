import type { TrendingRepo } from "@/app/api/github/repos/route"

export const PINNED_REPO_FULL_NAME = "cognizant-ai-lab/neuro-san-studio"

const [PINNED_OWNER, PINNED_NAME] = PINNED_REPO_FULL_NAME.split("/")

/**
 * Hardcoded fallback so the pinned repo renders even when it has no row in
 * repo_health. Without this the pin silently disappears on filtered or
 * empty-result queries.
 */
const FALLBACK: TrendingRepo = {
  name: PINNED_NAME,
  fullName: PINNED_REPO_FULL_NAME,
  owner: PINNED_OWNER,
  stars: 0,
  forks: null,
  language: "Python",
  description: "Neuro-SAN Studio: multi-agent AI studio.",
  url: `https://github.com/${PINNED_REPO_FULL_NAME}`,
  contributionScore: 0,
  responsivenessScore: null,
  throughputScore: null,
  acceptanceScore: null,
  newcomerScore: null,
  livenessScore: null,
  confidence: null,
  mergedPrCount: null,
  medianMergeHours: null,
  acceptanceRate: null,
  openIssuesCount: null,
  goodFirstIssues: null,
  helpWantedIssues: null,
  hasContributing: null,
  hasCodeOfConduct: null,
  mentionableUsers: null,
  isArchived: null,
  pushedAt: null,
  lastReleaseAt: null,
  mergeVelocityPerMonth: null,
  gatedReason: null,
  // Signals there is no repo_health row, so the card must link out to GitHub
  // instead of /repos/[owner]/[name], which would notFound().
  isHardcodedFallback: true,
}

export function mapRepoRow(row: Record<string, any>): TrendingRepo {
  return {
    name: row.repo_name,
    fullName: row.full_name,
    owner: row.owner_login,
    stars: row.stars,
    forks: row.forks,
    language: row.primary_language,
    description: row.description,
    url: `https://github.com/${row.full_name}`,
    contributionScore: row.contribution_score,
    responsivenessScore: row.responsiveness_score,
    throughputScore: row.throughput_score,
    acceptanceScore: row.acceptance_score,
    newcomerScore: row.newcomer_score,
    livenessScore: row.liveness_score,
    confidence: row.confidence,
    mergedPrCount: row.merged_pr_count,
    medianMergeHours: row.median_merge_hours,
    acceptanceRate: row.acceptance_rate,
    openIssuesCount: row.open_issues_count,
    goodFirstIssues: row.good_first_issues,
    helpWantedIssues: row.help_wanted_issues,
    hasContributing: row.has_contributing,
    hasCodeOfConduct: row.has_code_of_conduct,
    mentionableUsers: row.mentionable_users,
    isArchived: row.is_archived,
    pushedAt: row.pushed_at,
    lastReleaseAt: row.last_release_at,
    mergeVelocityPerMonth: row.merge_velocity_per_month,
    gatedReason: row.gated_reason,
    isHardcodedFallback: false,
  }
}

/**
 * Force the pinned repo into the first position. `pinnedRow` is the matching
 * repo_health row when one exists, otherwise null.
 */
export function pinFirstRepo(repos: TrendingRepo[], pinnedRow: Record<string, any> | null): TrendingRepo[] {
  const pinned = pinnedRow ? mapRepoRow(pinnedRow) : FALLBACK
  const rest = repos.filter((r) => r.fullName !== PINNED_REPO_FULL_NAME)
  return [pinned, ...rest]
}

/**
 * Pin, then trim back to `limit` so the page holds exactly `limit` rows.
 * Without this the client advances its offset past a row it never saw,
 * permanently skipping a repo during infinite scroll.
 */
export function pinFirstRepoCapped(repos: TrendingRepo[], pinnedRow: Record<string, any> | null, limit: number): TrendingRepo[] {
  const pinned = pinFirstRepo(repos, pinnedRow)
  return pinned.length > limit ? pinned.slice(0, limit) : pinned
}
