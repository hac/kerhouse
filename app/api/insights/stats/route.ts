import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = "force-dynamic"
import {
  getClientIdentifier,
  checkApiRateLimit,
  rateLimitExceededResponse,
} from "@/lib/rate-limit"

export async function GET(request?: Request) {
  // Rate limiting - only apply for external requests (when request object is provided)
  if (request) {
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkApiRateLimit(clientId)

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }
  }

  try {
    const distributionData = await sql`
      SELECT
        AVG(frontend_score) as frontend,
        AVG(backend_score) as backend,
        AVG(ai_score) as ai,
        AVG(devops_score) as devops,
        AVG(data_score) as data
      FROM leaderboard
    `;
    const distribution = distributionData[0];

    const impactDistribution = await sql`
      SELECT
        width_bucket(total_score, 0, 500, 10) as bucket,
        count(*)::int as count
      FROM leaderboard
      WHERE total_score > 0
      GROUP BY bucket
      ORDER BY bucket
    `;

    const skillsRadar = await sql`
      SELECT skill, count(*)::int as count
      FROM leaderboard, unnest(unique_skills) as skill
      WHERE unique_skills IS NOT NULL
      GROUP BY skill
      ORDER BY count DESC
      LIMIT 6
    `;

    const impactTrend = await sql`
      SELECT
        date_trunc('day', created_at) as day,
        AVG(total_score) as avg_impact
      FROM leaderboard
      WHERE created_at IS NOT NULL
        AND created_at > now() - interval '30 days'
        AND total_score > 0
      GROUP BY day
      ORDER BY day
    `;

    return NextResponse.json({ distribution, impactDistribution, skillsRadar, impactTrend });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Insights stats fetch error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
