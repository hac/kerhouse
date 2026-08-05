import { Header } from "@/components/header"
import { TalentMap } from "@/components/insights/TalentMap"
import { ImpactDistribution } from "@/components/insights/ImpactDistribution"
import { EngineerDistribution } from "@/components/insights/EngineerDistribution"
import { SkillsRadar } from "@/components/insights/SkillsRadar"
import { ImpactTrend } from "@/components/insights/ImpactTrend"
import { buildPageMetadata } from "@/lib/seo"
import { GET as getMapRoute } from "@/app/api/insights/map/route"
import { GET as getStatsRoute } from "@/app/api/insights/stats/route"

export const metadata = buildPageMetadata({
  title: "Talent Map",
  description: "Global open source developer clusters.",
  path: "/insights",
})

export const dynamic = "force-dynamic"

async function getMapData() {
  try {
    const res = await getMapRoute()
    if (!res.ok) {
      return []
    }
    return await res.json()
  } catch (error) {
    console.error("Failed to fetch map data:", error)
    return []
  }
}

async function getStatsData() {
  try {
    const res = await getStatsRoute()
    if (!res.ok) {
      return null
    }
    return await res.json()
  } catch (error) {
    console.error("Failed to fetch stats data:", error)
    return null
  }
}

export default async function InsightsMapPage() {
  const [mapData, statsData] = await Promise.all([
    getMapData(),
    getStatsData()
  ])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#00E5CC] selection:text-[#0a0a0a]">
      <Header />
      
      <main className="max-w-[1200px] mx-auto py-8 px-4 flex flex-col gap-4">
        {/* Dashboard Header */}
        <div className="border border-dashed border-[#6b7280] p-6 text-center mb-2">
          <h1 className="text-3xl font-bold font-mono tracking-widest text-white uppercase">
            Global Talent Analytics Dashboard
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {/* Map Container */}
            <div className="border border-dashed border-[#6b7280] p-4 bg-[#0a0a0a]">
              <TalentMap data={mapData} />
              
              {/* Map Footer Stats */}
              <div className="mt-6 flex flex-col md:flex-row justify-between text-xs text-gray-300 font-mono gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7280]">[<span className="text-[#00E5CC]">████████</span>{"  "}]</span>
                    <span>SF BAY AREA | 31.4% (312k Impact)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7280]">[<span className="text-[#00E5CC]">█████</span>{"     "}]</span>
                    <span>LONDON      | 22.1% (219k Impact)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7280]">[<span className="text-[#00E5CC]">████</span>{"      "}]</span>
                    <span>BENGALURU   | 16.8% (167k Impact)</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7280]">[<span className="text-[#00E5CC]">████</span>{"      "}]</span>
                    <span>OTHER | 29.7%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Engineer Distribution */}
            <div className="border border-dashed border-[#6b7280] p-4 flex flex-col justify-between">
              <h2 className="text-[#00E5CC] text-xs font-bold font-mono uppercase mb-4 flex items-center gap-2">
                <span className="text-[#00E5CC]">🌐</span> GLOBAL ENGINEER DISTRIBUTION
              </h2>
              <EngineerDistribution data={statsData?.distribution} />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            
            {/* Community Impact Score Distribution */}
            <div className="border border-dashed border-[#6b7280] p-4">
              <h2 className="text-[#00E5CC] text-xs font-bold font-mono uppercase mb-4 flex items-center gap-2">
                <span className="text-[#00E5CC]">⌂</span> COMMUNITY IMPACT SCORE DISTRIBUTION
              </h2>
              <ImpactDistribution data={statsData?.impactDistribution} />
            </div>

            {/* PR Stats Block (Placeholder as seen in image) */}
            <div className="border border-dashed border-[#6b7280] p-4 flex items-center gap-4 text-[#00E5CC]">
              <span className="text-xl">⌂</span>
              <span className="font-mono text-xl">PR ⑂ ↔</span>
            </div>

            {/* Bottom Right Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {/* Average Impact Trend */}
              <div className="border border-dashed border-[#6b7280] p-4 flex flex-col">
                <h2 className="text-[#00E5CC] text-xs font-bold font-mono uppercase mb-4 flex items-center gap-2">
                  <span className="text-[#00E5CC]">📈</span> AVERAGE IMPACT TREND (30d)
                </h2>
                <div className="flex-1 mt-auto">
                  <ImpactTrend data={statsData?.impactTrend} />
                </div>
              </div>

              {/* Skills Radar */}
              <div className="border border-dashed border-[#6b7280] p-4 flex flex-col">
                <h2 className="text-[#00E5CC] text-xs font-bold font-mono uppercase mb-4 flex items-center gap-2">
                  <span className="text-[#00E5CC]">💠</span> SKILLS-DISTRIBUTION RADAR
                </h2>
                <div className="flex-1 mt-auto flex items-center justify-center">
                  <SkillsRadar data={statsData?.skillsRadar} />
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
      
      <footer className="border-t border-dashed border-[#1a1a1a] py-6 mt-12">
        <div className="layout-container text-center text-xs text-gray-500">
          <p>
            © 2026 <span className="text-[#00E5CC]">hackerhou.se</span>. A home for <span className="text-white">human</span> programmers.
          </p>
        </div>
      </footer>
    </div>
  )
}

