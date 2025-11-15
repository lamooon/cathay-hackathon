'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db/client'
import { CheckInRecord } from '@/lib/db/schema'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, Search, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function CheckInPage() {
  const [pnr, setPnr] = useState('')
  const [passengers, setPassengers] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPassenger, setSelectedPassenger] = useState<CheckInRecord | null>(null)
  const [allPNRs, setAllPNRs] = useState<string[]>([])
  const [filteredPNRs, setFilteredPNRs] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    db.init().catch(console.error)
    loadAllPNRs()
  }, [])

  useEffect(() => {
    if (pnr.trim()) {
      const filtered = allPNRs.filter(p => p.toUpperCase().includes(pnr.toUpperCase()))
      setFilteredPNRs(filtered.slice(0, 10)) // Limit to 10 suggestions
      setShowDropdown(filtered.length > 0)
    } else {
      setFilteredPNRs([])
      setShowDropdown(false)
    }
  }, [pnr, allPNRs])

  async function loadAllPNRs() {
    try {
      const allRecords = await db.getAllCheckIns()
      const uniquePNRs = Array.from(new Set(allRecords.map(r => r.pnr)))
      setAllPNRs(uniquePNRs)
    } catch (err) {
      console.error('[Skylytics] Failed to load PNRs:', err)
    }
  }

  async function handleSearch(selectedPNR?: string) {
    const searchPNR = selectedPNR || pnr
    if (!searchPNR.trim()) {
      setError('Please enter a PNR')
      return
    }

    setLoading(true)
    setError('')
    setPassengers([])
    setSelectedPassenger(null)
    setShowDropdown(false)

    try {
      // Use local IndexedDB only
      console.log('Searching for PNR:', searchPNR.toUpperCase())
      const results = await db.getCheckInByPNR(searchPNR.toUpperCase())
      console.log('Search results:', results)
      
      if (results.length === 0) {
        setError(`No passengers found for PNR: ${searchPNR}`)
      } else {
        // Mark as checked in
        const updatedResults = results.map(p => ({
          ...p,
          checkedIn: true,
          timestamp: new Date().toISOString()
        }))
        
        // Save updated records
        for (const passenger of updatedResults) {
          await db.saveCheckIn(passenger)
        }
        
        setPassengers(updatedResults)
      }
    } catch (err) {
      setError('Failed to search. Please try again.')
      console.error('[Skylytics] Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handlePNRSelect(selectedPNR: string) {
    setPnr(selectedPNR)
    setShowDropdown(false)
    handleSearch(selectedPNR)
  }

  async function handleCheckIn(passenger: CheckInRecord) {
    try {
      const updatedRecord = { 
        ...passenger, 
        timestamp: new Date().toISOString() 
      }
      await db.saveCheckIn(updatedRecord)
      
      // Add to sync queue
      await db.addToQueue({
        id: `checkin-${Date.now()}-${passenger.pnr_id}`,
        type: 'check-in',
        payload: updatedRecord,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      // Update local state
      setPassengers(prev =>
        prev.map(p => (p.pnr_id === passenger.pnr_id ? updatedRecord : p))
      )
      setSelectedPassenger(updatedRecord)
    } catch (err) {
      console.error('[Skylytics] Check-in error:', err)
      alert('Failed to check in passenger')
    }
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
                <h1 className="text-xl font-bold text-foreground">Passenger Check-In</h1>
                <p className="text-xs text-muted-foreground">PNR Lookup System</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>Search by PNR</CardTitle>
              <CardDescription>Enter the 6-character booking reference to look up passengers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 relative">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Enter PNR (e.g., ABC123)"
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    onFocus={() => pnr.trim() && setShowDropdown(filteredPNRs.length > 0)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="text-lg font-mono uppercase"
                    maxLength={6}
                  />
                  {showDropdown && filteredPNRs.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredPNRs.map((pnrOption) => (
                        <button
                          key={pnrOption}
                          onClick={() => handlePNRSelect(pnrOption)}
                          className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors font-mono text-sm"
                        >
                          {pnrOption}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => handleSearch()} disabled={loading} className="gap-2">
                  <Search className="size-4" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              {error && (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {passengers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Passengers Found ({passengers.length})</CardTitle>
                <CardDescription>PNR: {pnr}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {passengers.map((passenger) => (
                  <div
                    key={passenger.pnr_id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-all hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {passenger.passengerName}
                        </h3>
                        {passenger.baggage.length > 0 && (
                          <Badge className="gap-1 bg-emerald-600 text-white">
                            <CheckCircle2 className="size-3" />
                            {passenger.baggage.length} Bag{passenger.baggage.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {!passenger.synced && (
                          <Badge variant="outline" className="gap-1">
                            Pending Sync
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>Flight: <span className="font-mono font-semibold text-foreground">{passenger.flightNumber}</span></span>
                        <span>Seat: <span className="font-semibold text-foreground">{passenger.seatNumber}</span></span>
                        <span>{passenger.origin} → <span className="font-semibold text-foreground">{passenger.destination}</span></span>
                        <span>Date: <span className="font-semibold text-foreground">{passenger.date}</span></span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedPassenger(passenger)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Selected Passenger Details */}
          {selectedPassenger && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Passenger Details</CardTitle>
                <CardDescription>Ready for baggage tagging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Passenger Name</p>
                    <p className="font-semibold text-foreground">{selectedPassenger.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PNR</p>
                    <p className="font-mono font-semibold text-foreground">{selectedPassenger.pnr}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Flight Number</p>
                    <p className="font-semibold text-foreground">{selectedPassenger.flightNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-semibold text-foreground">{selectedPassenger.origin} → {selectedPassenger.destination}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seat Assignment</p>
                    <p className="font-semibold text-foreground">{selectedPassenger.seatNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Baggage Count</p>
                    <p className="font-semibold text-foreground">
                      {selectedPassenger.baggage.length || 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground">{selectedPassenger.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Desk ID</p>
                    <p className="font-semibold text-foreground">{selectedPassenger.deskId}</p>
                  </div>
                </div>
                <Link href={`/baggage/${selectedPassenger.pnr_id}`}>
                  <Button className="w-full">Confirm Check-In</Button>
                </Link>
              </CardContent>
            </Card>
          )}


        </div>
      </main>
    </div>
  )
}
