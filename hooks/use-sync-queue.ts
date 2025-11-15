'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db/client'
import { QueuedAction } from '@/lib/db/schema'

export function useSyncQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [loading, setLoading] = useState(true)

  async function loadQueue() {
    try {
      await db.init()
      const pendingQueue = await db.getPendingQueue()
      setQueue(pendingQueue)
    } catch (error) {
      console.error('[v0] Failed to load queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
    
    // Refresh queue every 5 seconds
    const interval = setInterval(loadQueue, 5000)
    
    return () => clearInterval(interval)
  }, [])

  return { queue, loading, refresh: loadQueue }
}
