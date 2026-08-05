"use client"

import Link from "next/link"
import { Home, Palette, TerminalSquare, UserCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from "react"
import { useSession, signOut as nextSignOut } from "next-auth/react"
import { useTerminal } from "./terminal-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const themes = [
  { id: "auto", name: "Auto" },
  { id: "light", name: "Light" },
  { id: "dark", name: "VS Code Dark+" },
  { id: "monokai", name: "Monokai" },
  { id: "dracula", name: "Dracula" },
  { id: "solarized", name: "Solarized Dark" },
  { id: "nord", name: "Nord" },
]

export function Header() {
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const { openTerminal } = useTerminal()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const ready = status !== "loading"
  const user = session?.user

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="border-b-2 border-dashed border-foreground/70 py-4">
      <div className="layout-container flex items-center justify-between">
        <div className="flex items-center gap-8 translate-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-brand hover:opacity-90"
          >
            <Home className="w-5 h-5" strokeWidth={2.5} />
            <span>hackerhou.se</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/repos" className="hover:underline underline-offset-4">Repos</Link>
            <Link href="/devs" className="hover:underline underline-offset-4">Devs</Link>
            <Link href="/roles" className="hover:underline underline-offset-4">Roles</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openTerminal}
            className="p-1 cursor-pointer hover:text-muted-foreground"
            aria-label="Open terminal"
          >
            <TerminalSquare className="w-4 h-4" />
          </button>
          <div className="relative mr-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 cursor-pointer hover:text-muted-foreground"
              aria-label="Select theme"
            >
              <Palette className="w-4 h-4" />
            </button>
            {mounted && menuOpen && (
              <div className="absolute right-0 top-full mt-2 border-2 border-foreground bg-background z-50 min-w-40">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id)
                      setMenuOpen(false)
                    }}
                    className={`w-full cursor-pointer text-left px-3 py-1.5 text-sm hover:bg-foreground hover:text-background ${
                      theme === t.id ? "bg-foreground/10" : ""
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {ready && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="p-1 cursor-pointer hover:text-muted-foreground text-foreground flex items-center gap-2"
                  title={user.name || user.email || "User"}
                >
                  {user.image ? (
                    <img src={user.image} alt="" className="w-5 h-5 border border-foreground" />
                  ) : (
                    <UserCircle className="w-5 h-5" strokeWidth={2} />
                  )}
                  {user.name}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile/edit-github">Edit GitHub Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nextSignOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/sign-in"
              className="border-2 border-highlight px-4 py-0.5 font-medium text-highlight hover:bg-highlight hover:text-highlight-foreground inline-flex items-center justify-center"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
