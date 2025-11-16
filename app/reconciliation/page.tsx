'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db/client'
import { QueuedAction, CheckInRecord } from '@/lib/db/schema'
import { syncManager } from '@/lib/sync-manager'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Edit, Upload, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function ReconciliationPage() {
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editingItem, setEditingItem] = useState<QueuedAction | null>(null)
  const [editForm, setEditForm] = useState<CheckInRecord | null>(null)
  const [syncedCount, setSyncedCount] = useState(0)

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
      
      // Get synced count from actual records, not queue
      const stats = await db.getCheckInStats()
      setSyncedCount(stats.synced)
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

  function handleEditClick(item: QueuedAction) {
    setEditingItem(item)
    setEditForm({ ...item.payload })
  }

  async function handleSaveEdit() {
    if (!editingItem || !editForm) return

    try {
      // Update the check-in record
      await db.saveCheckIn(editForm)

      // Update the queue item payload
      editingItem.payload = editForm
      await db.addToQueue(editingItem)

      alert('Record updated successfully')
      setEditingItem(null)
      setEditForm(null)
      await loadQueue()
    } catch (err) {
      console.error('[Skylytics] Failed to update record:', err)
      alert('Failed to update record')
    }
  }

  async function handleClearSynced() {
    try {
      const syncedItems = queue.filter(q => q.status === 'synced')
      if (syncedItems.length === 0) {
        alert('No synced items to clear')
        return
      }

      if (!confirm(`Remove ${syncedItems.length} synced items from queue?`)) {
        return
      }

      for (const item of syncedItems) {
        await db.deleteQueueItem(item.id)
      }

      alert(`Cleared ${syncedItems.length} synced items`)
      await loadQueue()
    } catch (err) {
      console.error('[Skylytics] Failed to clear synced items:', err)
      alert('Failed to clear synced items')
    }
  }

  async function handleResetDatabase() {
    if (!confirm('⚠️ WARNING: This will delete ALL local data including check-ins, baggage records, and sync queue. This cannot be undone. Continue?')) {
      return
    }

    if (!confirm('Are you absolutely sure? This is your last chance to cancel.')) {
      return
    }

    try {
      await db.clearAllData()
      alert('Database reset successfully. You can now import fresh data.')
      await loadQueue()
    } catch (err) {
      console.error('[Skylytics] Failed to reset database:', err)
      alert('Failed to reset database')
    }
  }



  function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  // Sync queue should be # of unique passengers changed, not # of baggage operations
  const pendingPassengers = new Set(queue.filter(q => q.status === 'pending').map(q => q.payload.pnr))
  const pendingCount = pendingPassengers.size
  const failedCount = queue.filter(q => q.status === 'failed').length
  const queueSyncedCount = queue.filter(q => q.status === 'synced').length
  
  // Completed count comes from actual synced records in DB, not queue
  const completedCount = syncedCount

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
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Skylytics" className="size-8" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Reconciliation</h1>
                <p className="text-xs text-muted-foreground">Sync Queue Management</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Sync Queue</CardDescription>
                <CardTitle className="text-3xl">{pendingCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  Passengers pending sync
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">{completedCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4" />
                  Total synced records
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
              <CardDescription>Sync offline data to cloud</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={handleManualSync} disabled={syncing} className="gap-2">
                <Upload className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing to Cloud...' : 'Sync to Cloud'}
              </Button>
              <Button variant="outline" onClick={loadQueue} className="gap-2">
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              {queueSyncedCount > 0 && (
                <Button variant="outline" onClick={handleClearSynced} className="gap-2 text-muted-foreground">
                  <Trash2 className="size-4" />
                  Clear Synced Queue ({queueSyncedCount})
                </Button>
              )}
              {/* {<Button
                variant="destructive"
                onClick={handleResetDatabase}
                className="gap-2 ml-auto"
              >
                <AlertTriangle className="size-4" />
                Reset Database
              </Button>} */}
            </CardContent>
          </Card>

          {/* Recent Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations ({queue.length})</CardTitle>
              <CardDescription>Check-in and baggage operations history</CardDescription>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No operations recorded
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
                          {item.payload.synced && (
                            <Badge variant="default" className="bg-emerald-600">
                              <CheckCircle2 className="mr-1 size-3" />
                              Synced to Cloud
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>PNR: <span className="font-mono font-semibold text-foreground">{item.payload.pnr}</span></span>
                          <span>Flight: <span className="font-semibold text-foreground">{item.payload.flightNumber}</span></span>
                          <span>Bags: <span className="font-semibold text-foreground">{item.payload.baggage.length}</span></span>
                          <span>Time: <span className="font-semibold text-foreground">{formatDateTime(item.timestamp)}</span></span>
                          {item.retryCount > 0 && (
                            <span>Retries: <span className="font-semibold text-foreground">{item.retryCount}</span></span>
                          )}
                        </div>
                        {item.errorMessage && (
                          <p className="text-sm text-destructive">{item.errorMessage}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(item)}
                        className="ml-4"
                      >
                        <Edit className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Check-In Record</DialogTitle>
            <DialogDescription>
              Update passenger and flight information
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengerName">Passenger Name</Label>
                  <Input
                    id="passengerName"
                    value={editForm.passengerName}
                    onChange={(e) => setEditForm({ ...editForm, passengerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pnr">PNR</Label>
                  <Input
                    id="pnr"
                    value={editForm.pnr}
                    onChange={(e) => setEditForm({ ...editForm, pnr: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flightNumber">Flight Number</Label>
                  <Input
                    id="flightNumber"
                    value={editForm.flightNumber}
                    onChange={(e) => setEditForm({ ...editForm, flightNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seatNumber">Seat Number</Label>
                  <Input
                    id="seatNumber"
                    value={editForm.seatNumber}
                    onChange={(e) => setEditForm({ ...editForm, seatNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin</Label>
                  <Input
                    id="origin"
                    value={editForm.origin}
                    onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={editForm.destination}
                    onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskId">Desk ID</Label>
                <Input
                  id="deskId"
                  value={editForm.deskId}
                  onChange={(e) => setEditForm({ ...editForm, deskId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Baggage ({editForm.baggage.length} items)</Label>
                <div className="rounded-md border border-border p-3 space-y-2">
                  {editForm.baggage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No baggage items</p>
                  ) : (
                    editForm.baggage.map((bag, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{bag.tagNumber}</Badge>
                        <span>{bag.weight}kg</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{bag.color}</span>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant={bag.status === 'CHECKED' ? 'default' : 'secondary'}>
                          {bag.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
