'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/db/client'
import { seedDatabase } from '@/lib/mock-data'
import { OnlineStatusIndicator } from '@/components/online-status-indicator'
import { Button } from '@/components/ui/button'
import { Plane } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    async function initDB() {
      try {
        await db.init()
        await seedDatabase(db)
        setDbReady(true)
        console.log('[v0] Database initialized and seeded')
      } catch (error) {
        console.error('[v0] Failed to initialize database:', error)
      }
    }
    initDB()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Plane className="size-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Skylytics</h1>
              <p className="text-xs text-muted-foreground">Contingency Operations</p>
            </div>
          </div>
          <OnlineStatusIndicator />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-3 text-center">
            <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground">
              Offline Check-In System
            </h2>
            <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
              Reliable airline operations during system outages. Check in passengers, tag baggage, and sync when connectivity returns.
            </p>
          </div>

          {!dbReady ? (
            <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
              <div className="space-y-3 text-center">
                <div className="mx-auto size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Initializing offline database...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/check-in" className="group">
                <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plane className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Passenger Check-In</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Look up PNRs and check in passengers with full offline support
                    </p>
                  </div>
                  <Button className="mt-auto">Open Check-In</Button>
                </div>
              </Link>

              <Link href="/reconciliation" className="group">
                <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <svg
                      className="size-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Reconciliation</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Review and sync offline operations with back office systems
                    </p>
                  </div>
                  <Button variant="secondary" className="mt-auto">View Queue</Button>
                </div>
              </Link>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-6">
            <h3 className="mb-4 font-semibold text-foreground">System Features</h3>
            <ul className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Full offline PNR lookup and passenger data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Automated baggage tag generation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Local IndexedDB queue management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>CSV export for manual reconciliation</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
