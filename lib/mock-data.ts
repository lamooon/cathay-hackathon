import { CheckInRecord } from './db/schema'

// Mock check-in data matching DynamoDB structure
export const mockCheckIns: CheckInRecord[] = [
  {
    pnr_id: 'ABC123-SMITH/JOHN',
    pnr: 'ABC123',
    flightNumber: 'CX739',
    date: '2025-11-20',
    origin: 'HKG',
    destination: 'SIN',
    passengerName: 'SMITH/JOHN',
    seatNumber: '12A',
    baggage: [],
    timestamp: new Date().toISOString(),
    deskId: 'HKG-F32',
    synced: false,
  },
  {
    pnr_id: 'ABC123-SMITH/JANE',
    pnr: 'ABC123',
    flightNumber: 'CX739',
    date: '2025-11-20',
    origin: 'HKG',
    destination: 'SIN',
    passengerName: 'SMITH/JANE',
    seatNumber: '12B',
    baggage: [],
    timestamp: new Date().toISOString(),
    deskId: 'HKG-F32',
    synced: false,
  },
  {
    pnr_id: 'DEF456-JOHNSON/MICHAEL',
    pnr: 'DEF456',
    flightNumber: 'CX715',
    date: '2025-11-20',
    origin: 'HKG',
    destination: 'JFK',
    passengerName: 'JOHNSON/MICHAEL',
    seatNumber: '8C',
    baggage: [],
    timestamp: new Date().toISOString(),
    deskId: 'HKG-F32',
    synced: false,
  },
  {
    pnr_id: 'GHI789-WILLIAMS/SARAH',
    pnr: 'GHI789',
    flightNumber: 'CX840',
    date: '2025-11-20',
    origin: 'HKG',
    destination: 'LAX',
    passengerName: 'WILLIAMS/SARAH',
    seatNumber: '15F',
    baggage: [],
    timestamp: new Date().toISOString(),
    deskId: 'HKG-F32',
    synced: false,
  },
  {
    pnr_id: 'JKL012-BROWN/DAVID',
    pnr: 'JKL012',
    flightNumber: 'CX902',
    date: '2025-11-20',
    origin: 'HKG',
    destination: 'LHR',
    passengerName: 'BROWN/DAVID',
    seatNumber: '3A',
    baggage: [],
    timestamp: new Date().toISOString(),
    deskId: 'HKG-F32',
    synced: false,
  },
]

export function generateBaggageTagNumber(): string {
  return Math.floor(100000000 + Math.random() * 900000000).toString()
}

export function getDeskId(): string {
  return 'HKG-F32' // Could be dynamic based on location
}

export async function seedDatabase(db: typeof import('./db/client').db): Promise<void> {
  for (const checkIn of mockCheckIns) {
    await db.saveCheckIn(checkIn)
  }
  console.log('[v0] Database seeded with mock check-ins')
}
