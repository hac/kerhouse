"use client"

import { useState, useEffect } from "react"
import {
  Star,
  GitPullRequest,
  Clock,
  CheckCircle,
  Users,
  Sprout,
  Zap,
  ExternalLink,
  MessageSquare,
  Shield,
  BookOpen,
  Loader2,
  GitFork,
} from "lucide-react"

interface RepoDetail {
  fullName: string
  owner: string
  name: string
  language: string | null
  stars: number
  forks: number | null
  description: string | null
  topics: string[]
  createdAt: string | null
  isArchived: boolean
  pushedAt: string | null
  lastReleaseAt: string | null
  url: string
  scores: {
    contribution: number
    responsiveness: number | null
    throughput: number | null
    acceptance: number | null
    newcomer: number | null
    liveness: number | null
  }
  confidence: number | null
  pr: {
    merged: number | null
    closed: number | null
    open: number | null
    medianFirstReviewHours: number | null
    medianMergeHours: number | null
    acceptanceRate: number | null
    externalMergedRatio: number | null
    mergeVelocityPerMonth: number | null
    sampleSize: number | null
  }
  issues: {
    open: number | null
    goodFirstIssue: number | null
    helpWanted: number | null
  }
  community: {
    hasContributing: boolean | null
    hasCodeOfConduct: boolean | null
    mentionableUsers: number | null
  }
  scoredAt: string | null
}

interface GitHubIssue {
  number: number
  title: string
  html_url: string
  labels: { name: string; color: string }[]
  created_at: string
  comments: number
}

function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return "—"
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${Math.round(hours / 24)}d`
}

function formatStars(stars: number): string {
  if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`
  return stars.toLocaleString()
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "unknown"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 60) return "Good"
  if (score >= 40) return "Fair"
  return "Needs Work"
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const pct = Math.min(Math.round(score), 100)
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  let color = "var(--foreground)"
  if (pct >= 80) color = "#22c55e"
  else if (pct >= 60) color = "#eab308"
  else if (pct >= 40) color = "#f97316"
  else color = "#ef4444"

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-foreground/10"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold tabular-nums">{pct}</span>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, icon }: { label: string; value: number | null; icon: React.ReactNode }) {
  if (value === null || value === undefined) return null
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-bold">{pct}</span>
      </div>
      <div className="h-2 bg-foreground/10 relative">
        <div
          className="h-full bg-foreground/60 transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number | null; sub?: string }) {
  return (
    <div className="border-2 border-foreground p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value ?? "—"}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

function IssueItem({ issue }: { issue: GitHubIssue }) {
  const timeAgo = getTimeAgo(issue.created_at)
  return (
    <a
      href={issue.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 border-b border-foreground/10 last:border-b-0 hover:bg-foreground/[0.03] group"
    >
      <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold group-hover:underline text-highlight break-all">
          #{issue.number} {issue.title}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="text-xs px-1.5 py-0.5 border border-foreground/20"
              style={{ borderColor: `#${label.color}40` }}
            >
              {label.name}
            </span>
          ))}
          {issue.comments > 0 && (
            <span className="text-xs text-muted-foreground">
              {issue.comments} comment{issue.comments !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
    </a>
  )
}

export function RepoDetailView({ repo }: { repo: RepoDetail }) {
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(true)

  useEffect(() => {
    async function fetchIssues() {
      try {
        const res = await fetch(
          `https://api.github.com/search/issues?q=repo:${repo.fullName}+is:issue+is:open+label:"good+first+issue"&sort=created&order=desc&per_page=5`
        )
        if (res.ok) {
          const data = await res.json()
          setIssues(data.items || [])
        }
      } catch {
        // silent fail - issues are optional
      } finally {
        setIssuesLoading(false)
      }
    }
    fetchIssues()
  }, [repo.fullName])

  const scoreEntries: { label: string; value: number | null; icon: React.ReactNode }[] = [
    { label: "Acceptance", value: repo.scores.acceptance, icon: <CheckCircle className="w-4 h-4" /> },
    { label: "Responsiveness", value: repo.scores.responsiveness, icon: <Clock className="w-4 h-4" /> },
    { label: "Newcomer Friendly", value: repo.scores.newcomer, icon: <Sprout className="w-4 h-4" /> },
    { label: "Liveness", value: repo.scores.liveness, icon: <Zap className="w-4 h-4" /> },
    { label: "Throughput", value: repo.scores.throughput, icon: <GitPullRequest className="w-4 h-4" /> },
  ]

  const totalPrs = (repo.pr.merged ?? 0) + (repo.pr.closed ?? 0) + (repo.pr.open ?? 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-2xl font-bold text-highlight break-all">{repo.fullName}</h1>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground mt-1"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
        {repo.description && (
          <p className="text-muted-foreground text-sm mb-3">{repo.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-foreground/60" />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {formatStars(repo.stars)}
          </span>
          {repo.forks !== null && (
            <span className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              {repo.forks.toLocaleString()}
            </span>
          )}
          {repo.community.mentionableUsers !== null && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {repo.community.mentionableUsers} contributors
            </span>
          )}
          {repo.isArchived && (
            <span className="text-xs border border-foreground/30 px-1.5 py-0.5">Archived</span>
          )}
        </div>
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {repo.topics.map((topic) => (
              <span key={topic} className="text-xs border border-foreground/20 px-1.5 py-0.5 text-muted-foreground">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Score */}
      <div className="border-2 border-foreground p-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={repo.scores.contribution} size={100} />
          <div>
            <h2 className="text-lg font-bold">Contribution Score</h2>
            <p className="text-sm text-muted-foreground">
              {getScoreLabel(repo.scores.contribution)}
              {repo.confidence !== null && repo.confidence < 1 && (
                <span className="ml-2">
                  · {Math.round(repo.confidence * 100)}% confidence
                </span>
              )}
            </p>
            {repo.scoredAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last scored {getTimeAgo(repo.scoredAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="border-2 border-foreground p-6">
        <h2 className="text-lg font-bold mb-4">Score Breakdown</h2>
        <div className="space-y-4">
          {scoreEntries.map((entry) => (
            <ScoreBar key={entry.label} label={entry.label} value={entry.value} icon={entry.icon} />
          ))}
        </div>
      </div>

      {/* PR Metrics */}
      <div className="border-2 border-foreground p-6">
        <h2 className="text-lg font-bold mb-4">Pull Request Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Merged PRs"
            value={repo.pr.merged?.toLocaleString() ?? "—"}
            sub={totalPrs > 0 ? `of ${totalPrs} total` : undefined}
          />
          <MetricCard
            label="Acceptance Rate"
            value={repo.pr.acceptanceRate !== null ? `${Math.round(repo.pr.acceptanceRate * 100)}%` : "—"}
          />
          <MetricCard
            label="Median Merge Time"
            value={formatHours(repo.pr.medianMergeHours)}
          />
          <MetricCard
            label="First Review"
            value={formatHours(repo.pr.medianFirstReviewHours)}
            sub="median time"
          />
          <MetricCard
            label="Merge Velocity"
            value={repo.pr.mergeVelocityPerMonth !== null ? `${repo.pr.mergeVelocityPerMonth.toFixed(1)}/mo` : "—"}
          />
          <MetricCard
            label="Open PRs"
            value={repo.pr.open ?? "—"}
          />
          <MetricCard
            label="Closed PRs"
            value={repo.pr.closed ?? "—"}
          />
          <MetricCard
            label="External Ratio"
            value={repo.pr.externalMergedRatio !== null ? `${Math.round(repo.pr.externalMergedRatio * 100)}%` : "—"}
            sub="community contributions"
          />
        </div>
      </div>

      {/* Issues & Community */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Issues */}
        <div className="border-2 border-foreground p-6">
          <h2 className="text-lg font-bold mb-4">Issues</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label="Open" value={repo.issues.open ?? 0} />
            <MetricCard label="Good First Issue" value={repo.issues.goodFirstIssue ?? 0} />
            <MetricCard label="Help Wanted" value={repo.issues.helpWanted ?? 0} />
          </div>

          {/* Good First Issues List */}
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Recent Good First Issues
          </h3>
          {issuesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading issues...</span>
            </div>
          ) : issues.length > 0 ? (
            <div className="border border-foreground/20">
              {issues.map((issue) => (
                <IssueItem key={issue.number} issue={issue} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              No good first issues found.
            </p>
          )}
        </div>

        {/* Community Health */}
        <div className="border-2 border-foreground p-6">
          <h2 className="text-lg font-bold mb-4">Community Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-foreground/10">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                Contributing Guide
              </span>
              <span className={`text-sm font-bold ${repo.community.hasContributing ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                {repo.community.hasContributing ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-foreground/10">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                Code of Conduct
              </span>
              <span className={`text-sm font-bold ${repo.community.hasCodeOfConduct ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                {repo.community.hasCodeOfConduct ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-foreground/10">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Contributors
              </span>
              <span className="text-sm font-bold tabular-nums">
                {repo.community.mentionableUsers?.toLocaleString() ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-foreground/10">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sprout className="w-4 h-4" />
                Newcomer Score
              </span>
              <span className="text-sm font-bold tabular-nums">
                {repo.scores.newcomer !== null ? Math.round(repo.scores.newcomer * 100) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last Activity
              </span>
              <span className="text-sm">
                {getTimeAgo(repo.pushedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
