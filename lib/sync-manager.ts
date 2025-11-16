import { db } from './db/client'
import { QueuedAction } from './db/schema'
import { apiClient } from './api-client'
import { dynamoDBClient } from './dynamodb-client'

export class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null
  private isOnline: boolean = true
  private isSyncing: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => this.handleOnlineStatusChange(true))
      window.addEventListener('offline', () => this.handleOnlineStatusChange(false))
    }
  }

  private handleOnlineStatusChange(online: boolean) {
    this.isOnline = online
    if (online) {
      console.log('[Skylytics] Connection restored - starting sync')
      this.startSync()
    } else {
      console.log('[Skylytics] Connection lost - stopping sync')
      this.stopSync()
    }
  }

  async syncQueue(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      console.log('[Skylytics] Cannot sync - offline')
      return { success: 0, failed: 0 }
    }

    if (this.isSyncing) {
      console.log('[Skylytics] Sync already in progress')
      return { success: 0, failed: 0 }
    }

    this.isSyncing = true
    const pendingActions = await db.getPendingQueue()
    let success = 0
    let failed = 0

    console.log(`[Skylytics] Syncing ${pendingActions.length} pending actions`)

    for (const action of pendingActions) {
      try {
        await this.sendToBackOffice(action)
        
        // Mark as synced in local DB
        action.payload.synced = true
        await db.saveCheckIn(action.payload)
        
        // Mark queue item as synced (keep for history)
        await db.updateQueueStatus(action.id, 'synced')
        
        success++
        console.log('[Skylytics] Synced:', action.payload.pnr_id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Skylytics] Failed to sync:', action.payload.pnr_id, errorMessage)
        
        action.retryCount++
        if (action.retryCount >= 3) {
          await db.updateQueueStatus(action.id, 'failed', errorMessage)
        }
        failed++
      }
    }

    this.isSyncing = false
    return { success, failed }
  }

  private async sendToBackOffice(action: QueuedAction): Promise<void> {
    try {
      // Try direct DynamoDB sync first (for offline-first architecture)
      if (process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID) {
        await dynamoDBClient.syncCheckIn(action.payload)
      } else {
        // Fallback to API Gateway if credentials not available
        await apiClient.syncCheckIn(action.payload)
      }
    } catch (error) {
      throw error
    }
  }

  startSync() {
    if (this.syncInterval) return

    // Initial sync
    this.syncQueue()

    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncQueue()
    }, 30000)
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async manualSync(): Promise<{ success: number; failed: number }> {
    return this.syncQueue()
  }

  getOnlineStatus(): boolean {
    return this.isOnline
  }
}

export const syncManager = new SyncManager()
