'use client'

import { useSyncQueue } from '@/hooks/use-sync-queue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { syncManager } from '@/lib/sync-manager'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function SyncQueueWidget() {
  const { queue, loading, refresh } = useSyncQueue()
  const [syncing, setSyncing] = useState(false)

  async function handleManualSync() {
    setSyncing(true)
    try {
      const result = await syncManager.manualSync()
      console.log('[v0] Sync completed:', result)
      await refresh()
    } catch (error) {
      console.error('[v0] Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">Loading queue...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Sync Queue</CardTitle>
        <Badge variant={queue.length > 0 ? 'secondary' : 'default'}>
          {queue.length} pending
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {queue.length === 0
            ? 'All operations are synced'
            : `${queue.length} operation${queue.length === 1 ? '' : 's'} waiting to sync`}
        </p>
        <Button
          onClick={handleManualSync}
          disabled={syncing || queue.length === 0}
          className="w-full gap-2"
        >
          <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Manual Sync'}
        </Button>
      </CardContent>
    </Card>
  )
}
