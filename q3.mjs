import { neon } from '@neondatabase/serverless'
const sql = neon('postgresql://burhan:Burh%40nR3%40d%24@ep-aged-mouse-ai1o5rd0-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require')

function resolve(r, username) {
  const ownerLogin = r.ownerLogin || r.owner
  const fullName = r.full_name || r.fullName
  if (fullName && fullName.includes('/')) return fullName
  if (ownerLogin && r.name) return `${ownerLogin}/${r.name}`
  if (r.name) return `${username}/${r.name}`
  if (fullName) return fullName
  return ''
}

const [{count}] = await sql`SELECT COUNT(*)::int AS count FROM analyses WHERE top_repos_json IS NOT NULL`
console.log('profiles with repos:', count)

const keySets = new Map()
let totalProfiles=0, total=0, resolvable=0, unresolvable=0
const badExamples=[]
const PAGE=100
for (let off=0; off<count; off+=PAGE) {
  const rows = await sql`SELECT username, top_repos_json FROM analyses WHERE top_repos_json IS NOT NULL ORDER BY username LIMIT ${PAGE} OFFSET ${off}`
  for (const row of rows) {
    totalProfiles++
    let repos = row.top_repos_json
    if (typeof repos==='string'){ try{repos=JSON.parse(repos)}catch{continue} }
    if (!Array.isArray(repos)) continue
    for (const r of repos) {
      total++
      keySets.set(Object.keys(r).sort().join(','), (keySets.get(Object.keys(r).sort().join(','))||0)+1)
      const slug = resolve(r, row.username)
      if (slug && slug.includes('/')) resolvable++
      else { unresolvable++; if (badExamples.length<15) badExamples.push({username:row.username, r}) }
    }
  }
}
console.log('profiles scanned:', totalProfiles)
console.log('total repo entries:', total)
console.log('resolvable to owner/repo:', resolvable)
console.log('UNresolvable:', unresolvable)
console.log('\n--- distinct key shapes (count => keys) ---')
for (const [k,c] of [...keySets.entries()].sort((a,b)=>b[1]-a[1])) console.log(c,'=>',k)
console.log('\n--- bad examples ---')
console.log(JSON.stringify(badExamples,null,2))
