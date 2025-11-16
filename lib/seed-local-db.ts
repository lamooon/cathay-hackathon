/**
 * Seed Local IndexedDB with Test Data
 * Run this in the browser console to populate local database
 */

import { db } from './db/client'

const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
const destinations = ['NRT', 'ICN', 'PVG', 'TPE', 'MNL']
const seatRows = ['12', '15', '18', '22', '25', '28', '32', '35', '38', '42']
const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F']

function generatePNR() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let pnr = ''
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pnr
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateMockPassenger(index: number) {
  const pnr = generatePNR()
  const flightNumber = `CX${Math.floor(Math.random() * 900) + 100}`
  const date = new Date().toISOString().split('T')[0]
  const passengerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`
  const seatNumber = `${randomElement(seatRows)}${randomElement(seatLetters)}`
  
  return {
    pnr_id: `${pnr}_${index}`,
    pnr: pnr,
    flightNumber: flightNumber,
    date: date,
    origin: 'HKG',
    destination: randomElement(destinations),
    passengerName: passengerName,
    seatNumber: seatNumber,
    baggage: [],
    timestamp: new Date().toISOString(),
    deskId: `DESK-${Math.floor(Math.random() * 10) + 1}`,
    synced: false,
    checkedIn: false,
  }
}

export async function seedLocalDB() {
  console.log('🌱 Seeding local database...')
  
  await db.init()
  
  const records = []
  for (let i = 1; i <= 20; i++) {
    const record = generateMockPassenger(i)
    await db.saveCheckIn(record)
    records.push(record)
    console.log(`✓ Added: ${record.passengerName} (PNR: ${record.pnr})`)
  }
  
  console.log(`\n✅ Successfully seeded ${records.length} passengers`)
  console.log('\nSample PNRs to test:')
  records.slice(0, 5).forEach(r => console.log(`  - ${r.pnr}`))
  
  return records
}

// For browser console usage
if (typeof window !== 'undefined') {
  (window as any).seedLocalDB = seedLocalDB
}
