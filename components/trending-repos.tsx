"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Star, ChevronDown, Loader2, Search, GitFork } from "lucide-react"
import type { TrendingRepo, ReposResponse } from "@/app/api/github/repos/route"

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  "C++": "#f34b7d",
  Java: "#b07219",
  C: "#555555",
  "C#": "#178600",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Lua: "#000080",
  PowerShell: "#012456",
  HTML: "#e34c26",
}

function getLanguageColor(lang: string | null): string {
  if (!lang) return "#6e7681"
  return LANGUAGE_COLORS[lang] || "#6e7681"
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedLabel = options.find((o) => o.value === value)?.label || label

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border-2 border-foreground px-3 py-1 text-sm flex items-center gap-2 hover:bg-foreground hover:text-background"
      >
        <span>
          {label}: {selectedLabel}
        </span>
        <ChevronDown
          className={`w-3 h-3 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 border-2 border-foreground bg-background z-50 min-w-full max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-foreground hover:text-background ${
                value === option.value ? "bg-foreground/10" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`
  }
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

const sortOptions = [
  { value: "contribution_score", label: "Health Score" },
  { value: "stars", label: "Stars" },
  { value: "responsiveness", label: "Responsiveness" },
  { value: "throughput", label: "Throughput" },
  { value: "acceptance", label: "Acceptance" },
  { value: "newcomer", label: "Newcomer Friendly" },
  { value: "liveness", label: "Liveness" },
  { value: "merge_velocity", label: "Merge Velocity" },
]

interface TrendingReposProps {
  initialRepos: TrendingRepo[]
  initialTotal: number
}

export function TrendingRepos({ initialRepos, initialTotal }: TrendingReposProps) {
  const [repos, setRepos] = useState<TrendingRepo[]>(initialRepos)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("contribution_score")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(initialTotal)
  const [offset, setOffset] = useState(initialRepos.length)
  const [hasMore, setHasMore] = useState(initialRepos.length < initialTotal)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const languageOptions = [
    { value: "all", label: "All" },
    ...Array.from(new Set(repos.map((r) => r.language).filter(Boolean)))
      .sort()
      .map((lang) => ({ value: lang!, label: lang! })),
  ]

  const fetchRepos = useCallback(async (offsetVal: number, language: string, sort: string, search: string, append: boolean) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        offset: offsetVal.toString(),
        limit: "30",
        sort,
      })
      if (language !== "all") params.set("language", language)
      if (search) params.set("search", search)

      const response = await fetch(`/api/github/repos?${params}`)
      if (!response.ok) throw new Error("Failed to fetch repositories")

      const data: ReposResponse = await response.json()

      if (append) {
        setRepos((prev) => {
          const existing = new Set(prev.map((r) => r.fullName))
          const newRepos = data.repos.filter((r) => !existing.has(r.fullName))
          return [...prev, ...newRepos]
        })
      } else {
        setRepos(data.repos)
      }

      setTotal(data.total)
      setHasMore(data.hasMore)
      setOffset(offsetVal + data.repos.length)
    } catch (err) {
      console.error("Error loading repos:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value)
    setOffset(0)
    setHasMore(true)
    fetchRepos(0, selectedLanguage, value, searchQuery, false)
  }, [selectedLanguage, searchQuery, fetchRepos])

  const handleLanguageChange = useCallback((value: string) => {
    setSelectedLanguage(value)
    setOffset(0)
    setHasMore(true)
    fetchRepos(0, value, sortBy, searchQuery, false)
  }, [sortBy, searchQuery, fetchRepos])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    setHasMore(true)
    fetchRepos(0, selectedLanguage, sortBy, searchQuery, false)
  }, [selectedLanguage, sortBy, searchQuery, fetchRepos])

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return
    fetchRepos(offset, selectedLanguage, sortBy, searchQuery, true)
  }, [offset, isLoading, hasMore, selectedLanguage, sortBy, searchQuery, fetchRepos])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, isLoading, loadMore])

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-highlight">
          Repository Health
        </h2>
        <span className="text-sm text-muted-foreground">
          {total} repositories ranked by health score
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Dropdown
          label="Sort"
          value={sortBy}
          options={sortOptions}
          onChange={handleSortChange}
        />
        <Dropdown
          label="Language"
          value={selectedLanguage}
          options={languageOptions}
          onChange={handleLanguageChange}
        />
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repos..."
            className="w-full border-2 border-foreground pl-8 pr-3 py-1 text-sm bg-background focus:outline-none focus:bg-foreground focus:text-background"
          />
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {repos.map((repo) => (
          <Link
            key={repo.fullName}
            href={`/repos/${repo.owner}/${repo.name}`}
            className="border-2 border-foreground px-4 py-5 flex flex-col group hover:bg-foreground/[0.03]"
          >
            <div className="flex items-start gap-3 mb-2">
              <div
                className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: getLanguageColor(repo.language) }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm break-all group-hover:underline text-highlight">
                  {repo.fullName}
                </div>
                <span className="text-xs text-muted-foreground">
                  {repo.language || "Unknown"} · {formatStars(repo.stars)} stars · Pushed {getTimeAgo(repo.pushedAt)}
                </span>
              </div>
            </div>

            <p className="text-sm mb-3 line-clamp-2 ml-6 min-h-[2.5rem]">
              {repo.description || "\u00A0"}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto ml-6">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {formatStars(repo.stars)}
              </span>
              {repo.forks !== null && (
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  {repo.forks.toLocaleString()}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {repos.length === 0 && !isLoading && (
        <div className="border-2 border-dashed border-foreground/50 p-8 text-center">
          <p>No repositories match the selected filters.</p>
        </div>
      )}

      <div ref={loadMoreRef} className="py-8 flex justify-center">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading more repositories...</span>
          </div>
        )}
        {!hasMore && repos.length > 0 && !isLoading && (
          <span className="text-muted-foreground text-sm">
            All {total} repositories loaded
          </span>
        )}
      </div>
    </section>
  )
}
