const developers = [
  {
    username: "nerdy_dev",
    avatar: "[@]",
    languages: ["Python", "Rust", "Linux"],
    followers: 325,
    repos: 156,
    location: "DE"
  },
  {
    username: "codequeenJS",
    avatar: "[#]",
    languages: ["JavaScript", "TypeScript", "React"],
    followers: 220,
    repos: 145,
    location: "GB"
  },
  {
    username: "dev_joe",
    avatar: "[*]",
    languages: ["Go", "DevOps", "AWS"],
    followers: 210,
    repos: 130,
    location: "NY"
  },
  {
    username: "rust_alice",
    avatar: "[&]",
    languages: ["Rust", "WebAssembly", "C"],
    followers: 189,
    repos: 98,
    location: "CA"
  },
]

export function FindDevelopers() {
  return (
    <section className="border-2 border-dashed border-foreground/70 p-6">
      <h2 className="text-xl font-bold mb-6">Find Developers</h2>
      
      <div className="space-y-4">
        {developers.map((dev) => (
          <div 
            key={dev.username}
            className="border-2 border-foreground/50 p-4 hover:bg-foreground/5"
          >
            <div className="flex items-start gap-3">
              <div className="text-xl font-mono">{dev.avatar}</div>
              
              <div className="flex-1 min-w-0">
                <div className="font-bold">{dev.username}</div>
                <div className="text-sm text-muted-foreground">
                  {dev.languages.join(" | ")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {dev.followers} Followers, {dev.repos} Repos, {dev.location}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button className="border-2 border-foreground px-3 py-1 text-sm hover:bg-foreground hover:text-background">
                Follow
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-right">
        <a href="/developers" className="text-sm hover:underline">See more developers &gt;</a>
      </div>
    </section>
  )
}
