'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db/client'
import { QueuedAction } from '@/lib/db/schema'
import { syncManager } from '@/lib/sync-manager'
import { OnlineStatusIndicator } from '@/components/online-status-indicator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, ArrowLeft, RefreshCw, Download, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ReconciliationPage() {
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadQueue() {
    try {
      await db.init()
      const allQueue = await db.getAllQueue()
      setQueue(allQueue.sort((a, b) => b.timestamp - a.timestamp))
    } catch (err) {
      console.error('[Skylytics] Failed to load queue:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleManualSync() {
    setSyncing(true)
    try {
      const result = await syncManager.manualSync()
      alert(`Sync complete: ${result.success} succeeded, ${result.failed} failed`)
      await loadQueue()
    } catch (err) {
      console.error('[Skylytics] Sync error:', err)
      alert('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleExportCSV() {
    const pending = queue.filter(q => q.status === 'pending')
    if (pending.length === 0) {
      alert('No pending items to export')
      return
    }

    const headers = ['PNR', 'Passenger', 'Flight', 'Destination', 'Baggage Count', 'Timestamp']
    const rows = pending.map(item => {
      const p = item.payload
      return [
        p.pnr,
        p.passengerName,
        p.flightNumber,
        p.destination,
        p.baggage.length.toString(),
        new Date(item.timestamp).toISOString(),
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skylytics-pending-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pendingCount = queue.filter(q => q.status === 'pending').length
  const syncedCount = queue.filter(q => q.status === 'synced').length
  const failedCount = queue.filter(q => q.status === 'failed').length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Plane className="size-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Reconciliation</h1>
                <p className="text-xs text-muted-foreground">Sync Queue Management</p>
              </div>
            </div>
          </div>
          <OnlineStatusIndicator />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending Sync</CardDescription>
                <CardTitle className="text-3xl">{pendingCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  Waiting for sync
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Synced</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">{syncedCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4" />
                  Successfully synced
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Failed</CardDescription>
                <CardTitle className="text-3xl text-destructive">{failedCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="size-4" />
                  Requires attention
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage sync queue and export data</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleManualSync} disabled={syncing} className="gap-2">
                <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Manual Sync'}
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                <Download className="size-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={loadQueue} className="gap-2">
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            </CardContent>
          </Card>

          {/* Queue Items */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Queue ({queue.length})</CardTitle>
              <CardDescription>All check-in and baggage operations</CardDescription>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No operations in queue
                </p>
              ) : (
                <div className="space-y-3">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{item.payload.passengerName}</p>
                          <Badge variant={
                            item.status === 'synced' ? 'default' :
                            item.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {item.status === 'synced' && <CheckCircle2 className="mr-1 size-3" />}
                            {item.status === 'failed' && <XCircle className="mr-1 size-3" />}
                            {item.status === 'pending' && <Clock className="mr-1 size-3" />}
                            {item.status}
                          </Badge>
                          <Badge variant="outline">{item.type}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>PNR: <span className="font-mono font-semibold text-foreground">{item.payload.pnr}</span></span>
                          <span>Flight: <span className="font-semibold text-foreground">{item.payload.flightNumber}</span></span>
                          <span>Bags: <span className="font-semibold text-foreground">{item.payload.baggage.length}</span></span>
                          <span>Time: <span className="font-semibold text-foreground">{new Date(item.timestamp).toLocaleString()}</span></span>
                          {item.retryCount > 0 && (
                            <span>Retries: <span className="font-semibold text-foreground">{item.retryCount}</span></span>
                          )}
                        </div>
                        {item.errorMessage && (
                          <p className="text-sm text-destructive">{item.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
