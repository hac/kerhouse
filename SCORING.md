# Scoring System

This document describes how repositories are scored on hackerhou.se.

## Health Score (Contribution Score)

The overall "is this a good repo to contribute to?" rating. It combines five weighted pillars into a single number from 0–100.

```
Health Score = Σ(pillar × weight) / Σ(weight of pillars with data) × 100
```

Missing pillars are dropped and remaining weights renormalized, so a repo is never penalized for gaps in the data.

### Weights

| Pillar | Weight |
|--------|--------|
| Responsiveness | 0.30 |
| Throughput | 0.25 |
| Acceptance | 0.20 |
| Newcomer Friendly | 0.15 |
| Liveness | 0.10 |

---

## Pillar Definitions

### Responsiveness (weight: 0.30)

How quickly maintainers give a pull request its first review. Faster reviews score higher.

```
responsiveness = 1 / (1 + medianFirstReviewHours / 48)
```

- 0 hours → 1.0 (perfect)
- 48 hours (2 days) → 0.5
- 96 hours (4 days) → 0.33

### Throughput (weight: 0.25)

How fast and how often PRs get merged, penalized by open PR backlog.

```
mergeTimeScore = 72 / (medianMergeHours + 72)
velocityScore = log(1 + mergedPRsPerMonth) / log(51)
backlogPenalty = 1 / (1 + openPRs / 200)

throughput = (0.6 × mergeTimeScore + 0.4 × velocityScore) × backlogPenalty
```

- `mergeTimeScore`: rewards fast merges (72h target = 0.5)
- `velocityScore`: saturates at ~50 merged PRs/month
- `backlogPenalty`: reduces score if many PRs are waiting

### Acceptance (weight: 0.20)

How likely a submitted PR is to be merged rather than rejected, with a bonus for repos that merge work from outside contributors.

```
acceptanceRate = mergedPRs / (mergedPRs + closedUnmergedPRs)
externalMergedRatio = externalMergedPRs / totalMergedPRs

acceptance = 0.6 × acceptanceRate + 0.4 × externalMergedRatio
```

- `acceptanceRate`: fraction of PRs that get merged (not closed without merging)
- `externalMergedRatio`: fraction of merged PRs from non-owners (community contributions)

### Newcomer Friendly (weight: 0.15)

How welcoming the repo is to first-time contributors.

```
gfi = log(1 + goodFirstIssues + helpWantedIssues) / log(21)
docs = 0.6 × hasContributing + 0.4 × hasCodeOfConduct

newcomer = 0.6 × gfi + 0.4 × docs
```

- `gfi`: saturates at ~20 labeled issues
- `docs`: checks for CONTRIBUTING.md and CODE_OF_CONDUCT.md

### Liveness (weight: 0.10)

How active the repo is right now, based on recent activity.

```
pushRecency = exp(-daysSincePush × ln(2) / 90)
releaseRecency = exp(-daysSinceRelease × ln(2) / 180)

liveness = 0.7 × pushRecency + 0.3 × releaseRecency
```

- Push half-life: 90 days (score halves every 90 days of inactivity)
- Release half-life: 180 days

---

## Hard Gates

A repo is scored 0 and excluded from listings if any of these are true:

- Repository is archived
- Repository is disabled
- Fewer than 10 stars
- Fewer than 5 merged PRs

These repos get a `gated_reason` value and are filtered out of the UI.

---

## Confidence

A 0–1 score indicating how much data was available for the repo.

```
confidence = 0.5 × (sampleSize / 30) + 0.5 × coverage
```

- `sampleSize`: number of PRs analyzed (caps at 30)
- `coverage`: sum of weights for pillars that had data

Low-confidence repos may have less reliable scores.

---

## Other Metrics

### Stars

Raw GitHub star count. Not part of the health score formula.

### Merge Velocity

Number of PRs merged per month. Feeds into the Throughput pillar but is also shown as a standalone metric.

```
mergeVelocityPerMonth = mergedPRsInLast30Days
```

---

## Legacy Per-User Score

A separate scoring system exists in `scripts/compute-repo-scores.ts` for per-user repo scores. This is not used in the main repo listings.

```
repoScore = log₁₀(totalPRs + 1) × (72 / (medianTTM + 72)) × 100
```

- `totalPRs`: total pull requests in the repo
- `medianTTM`: median time-to-merge in hours (default: 168h / 7 days if no data)
