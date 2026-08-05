import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { TerminalProvider } from '@/components/terminal-provider'
import { Terminal } from '@/components/terminal'
import { buildPageMetadata } from '@/lib/seo'
import { OrganizationSchema } from '@/components/schema/OrganizationSchema'
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import './globals.css'

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "A Home for Human Programmers",
    description: "Discover open source projects, meet developers, find roles, and more — a home for human programmers.",
    keywords: ["kerhouse", "hacker house", "open source", "developers", "coding community"],
  }),
  metadataBase: new URL("https://hackerhou.se"),
  title: {
    default: "Kerhouse — A Home for Human Programmers",
    template: "%s | Kerhouse",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="auto"
            themes={["auto", "light", "dark", "monokai", "dracula", "solarized", "nord"]}
            disableTransitionOnChange
            enableSystem={false}
          >
            <AuthProvider>
                <TerminalProvider>
                  <OrganizationSchema />
                  {children}
                  <Terminal />
                  <Toaster /> {/* Added Toaster here */}
                </TerminalProvider>
            </AuthProvider>
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
