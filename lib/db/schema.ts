// IndexedDB schema matching DynamoDB structure

export interface Baggage {
  tagNumber: string
  weight: number
  color: string
  status: string
}

export interface CheckInRecord {
  pnr_id: string // Partition key
  pnr: string // Sort key
  flightNumber: string
  date: string
  origin: string
  destination: string
  passengerName: string
  seatNumber: string
  baggage: Baggage[]
  timestamp: string
  deskId: string
  synced: boolean
}

export interface QueuedAction {
  id: string
  type: 'check-in' | 'baggage-add' | 'update'
  payload: CheckInRecord
  timestamp: number
  status: 'pending' | 'synced' | 'failed'
  retryCount: number
  errorMessage?: string
}

export const DB_NAME = 'skylytics-db'
export const DB_VERSION = 2 // Increment for schema change

export const STORES = {
  CHECK_INS: 'check-ins',
  QUEUE: 'sync-queue',
} as const

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod',
  ENDPOINTS: {
    SYNC_CHECK_IN: '/check-in',
    GET_PNR: '/pnr',
  },
} as const
