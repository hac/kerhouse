import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Eye, Github, GitCommit, GitPullRequest, MapPin, MessageSquare, User } from "lucide-react"
import type { Developer } from "@/lib/data"
import type { ContributionKind } from "@/lib/profile-prototype"
import { ProfileMessageSidebar } from "@/components/profile-message-button"

const contributionIcon: Record<ContributionKind, LucideIcon> = {
  commit: GitCommit,
  pr: GitPullRequest,
  issue: MessageSquare,
  review: Eye,
}

const contributionLabel: Record<ContributionKind, string> = {
  commit: "Commit",
  pr: "PR",
  issue: "Issue",
  review: "Review",
}

/** Match homepage Explore tags: lowercase, hyphenated */
function reposTagHref(label: string) {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s+/g, "-")
  return `/repos?tag=${encodeURIComponent(slug)}`
}

function contributionHref(repo: string) {
  return `https://github.com/${repo}`
}

interface UserProfileViewProps {
  dev: Developer
  bio?: string
  weeklyRank?: number
  weeklyScore?: number
  skillsStrong?: string[]
  skillsAlso?: string[]
  contributions?: any[]
  scores?: {
    backend?: number
    frontend?: number
    devops?: number
    data?: number
    ai?: number
    efficiency?: number
  }
}

export function UserProfileView({ 
  dev, 
  bio, 
  weeklyRank, 
  weeklyScore, 
  skillsStrong = [],
  skillsAlso = [],
  contributions = [],
  scores
}: UserProfileViewProps) {
  return (
    <>
      <main className="layout-container py-8">
        <h1 className="text-2xl font-bold mb-1 lg:mb-2 text-highlight">{dev.name}</h1>
        <p className="text-sm text-muted-foreground mb-8 lg:mb-10">{dev.username}</p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-10">
          <section className="border-2 border-foreground p-5 sm:p-6 lg:col-span-8 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="border-2 border-foreground p-3 shrink-0 w-fit">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-highlight" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-lg sm:text-xl text-highlight">{dev.name}</div>
                <div className="text-sm text-muted-foreground">{dev.username}</div>
                {bio && <p className="text-sm mt-3 leading-relaxed max-w-prose">{bio}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {dev.country}
                  </span>
                  <span>Primary stack: {dev.language}</span>
                  <a
                    href={`https://github.com/${dev.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-highlight hover:underline underline-offset-4"
                  >
                    <Github className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    GitHub profile
                  </a>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {dev.skills.map((skill) => (
                    <Link
                      key={skill}
                      href={reposTagHref(skill)}
                      className="border border-foreground px-1.5 py-0.5 text-xs hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      {skill}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-8 lg:col-span-4 lg:row-span-2 lg:sticky lg:top-24 lg:self-start min-w-0">
            <ProfileMessageSidebar targetUsername={dev.username} />

            <section className="border-2 border-dashed border-foreground/70 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-highlight mb-3">
                Impact this week
              </h2>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold tabular-nums">#{weeklyRank || "?"}</span>
                <span className="text-muted-foreground text-sm">on the leaderboard</span>
              </div>
              <div className="mt-4 space-y-2 border-t border-dashed border-foreground/30 pt-4">
                <p className="text-sm font-bold tabular-nums flex justify-between">
                  <span>Total Score</span>
                  <span>{(weeklyScore || 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}</span>
                </p>
                {scores && (
                  <div className="space-y-1 text-xs text-muted-foreground uppercase tracking-tight">
                    {scores.backend ? (
                      <div className="flex justify-between">
                        <span>Backend</span>
                        <span>{scores.backend.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {scores.frontend ? (
                      <div className="flex justify-between">
                        <span>Frontend</span>
                        <span>{scores.frontend.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {scores.devops ? (
                      <div className="flex justify-between">
                        <span>DevOps</span>
                        <span>{scores.devops.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {scores.data ? (
                      <div className="flex justify-between">
                        <span>Data</span>
                        <span>{scores.data.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {scores.ai ? (
                      <div className="flex justify-between">
                        <span>AI</span>
                        <span>{scores.ai.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {scores.efficiency ? (
                      <div className="flex justify-between border-t border-dashed border-foreground/20 pt-1 mt-1">
                        <span>Efficiency</span>
                        <span>{scores.efficiency.toLocaleString()}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed italic">
                Ranked by total impact score across all active projects.
              </p>
            </section>

            <section className="border-2 border-dashed border-foreground/70 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-highlight mb-4">Skills</h2>
              {skillsStrong.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">Strong in</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {skillsStrong.map((s) => (
                      <Link
                        key={s}
                        href={reposTagHref(s)}
                        className="border border-foreground px-2 py-0.5 text-xs hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {skillsAlso.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">Also uses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsAlso.map((s) => (
                      <Link
                        key={s}
                        href={reposTagHref(s)}
                        className="border border-foreground px-2 py-0.5 text-xs hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </section>
          </aside>

          <section className="border-2 border-foreground lg:col-span-8 min-w-0 flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wide text-highlight px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-foreground">
              Contributions
            </h2>
            <div className="divide-y divide-foreground">
              {contributions.length === 0 && (
                <p className="px-4 sm:px-5 py-8 text-sm text-muted-foreground">
                  No public contribution data available for{" "}
                  <a
                    href={`https://github.com/${dev.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-highlight hover:underline underline-offset-4"
                  >
                    {dev.username}
                  </a>{" "}
                  yet.
                </p>
              )}
              {contributions.map((c, i) => {
                const kind = c.kind as ContributionKind
                const Icon = contributionIcon[kind] || GitCommit
                // Only link out to GitHub when we have a valid "owner/repo" slug.
                const hasValidRepo = typeof c.repo === "string" && c.repo.includes("/")
                const linkProps = hasValidRepo
                  ? {
                      href: contributionHref(c.repo),
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {}
                const Wrapper: any = hasValidRepo ? Link : "div"
                return (
                  <Wrapper
                    key={`${c.repo}-${c.title || i}-${i}`}
                    {...linkProps}
                    className="flex items-start gap-3 py-[11px] px-4 sm:px-5 hover:bg-foreground/[0.03]"
                  >
                    <div className="border border-foreground p-1.5 shrink-0 mt-0.5">
                      <Icon
                        className="w-3.5 h-3.5 text-highlight"
                        aria-hidden
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-highlight">
                          {contributionLabel[kind] || "Repo"}
                        </span>
                        <span className="text-sm font-mono break-all text-muted-foreground">
                          {c.repo}
                        </span>
                      </div>
                      <p className="text-sm mt-1 leading-snug">{c.title || "Latest activity"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {c.time || "Recent"}
                      </span>
                      {c.score !== undefined && (
                        <span className="text-[10px] font-bold bg-foreground/5 border border-foreground/10 px-1 py-0.5 rounded-sm tabular-nums">
                          {Math.round(c.score).toLocaleString()} impact
                        </span>
                      )}
                    </div>
                  </Wrapper>
                )
              })}
            </div>
          </section>
        </div>

        <p className="text-sm text-muted-foreground mt-10 lg:mt-12">
          <Link href="/devs" className="hover:underline underline-offset-4">
            ← Back to devs
          </Link>
        </p>
      </main>

      <footer className="border-t-2 border-dashed border-foreground/70 py-6">
        <div className="layout-container text-center text-sm">
          <p>
            © 2026 <span className="text-brand">hackerhou.se</span>. A home for <span className="text-highlight">human</span> programmers.
          </p>
        </div>
      </footer>
    </>
  )
}
