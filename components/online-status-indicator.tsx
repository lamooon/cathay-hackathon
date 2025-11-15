'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { Wifi, WifiOff } from 'lucide-react'

export function OnlineStatusIndicator() {
  const isOnline = useOnlineStatus()

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      {isOnline ? (
        <>
          <Wifi className="size-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-600">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="size-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-600">Offline Mode</span>
        </>
      )}
    </div>
  )
}
