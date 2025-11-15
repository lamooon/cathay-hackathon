'use client'

import { useState, useEffect, use } from 'react'
import { db } from '@/lib/db/client'
import { Passenger, BaggageTag } from '@/lib/db/schema'
import { generateBaggageTagNumber } from '@/lib/mock-data'
import { OnlineStatusIndicator } from '@/components/online-status-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, ArrowLeft, Package, Printer, Plus } from 'lucide-react'
import Link from 'next/link'

export default function BaggagePage({ params }: { params: Promise<{ passengerId: string }> }) {
  const resolvedParams = use(params)
  const [passenger, setPassenger] = useState<Passenger | null>(null)
  const [baggageTags, setBaggageTags] = useState<BaggageTag[]>([])
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        await db.init()
        
        // Load passenger from IndexedDB by searching all passengers
        const allPassengers = await db.getPassengerByPNR('')
        const foundPassenger = allPassengers.find(p => p.id === resolvedParams.passengerId)
        
        if (!foundPassenger) {
          console.error('[v0] Passenger not found')
          return
        }
        
        setPassenger(foundPassenger)
        
        // Load existing baggage tags
        const tags = await db.getBaggageTagsByPNR(foundPassenger.pnr)
        setBaggageTags(tags)
      } catch (err) {
        console.error('[v0] Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [resolvedParams.passengerId])

  async function handleGenerateTag() {
    if (!passenger) return
    if (!weight || parseFloat(weight) <= 0) {
      alert('Please enter a valid weight')
      return
    }

    const tagNumber = generateBaggageTagNumber()
    const newTag: BaggageTag = {
      id: `tag-${Date.now()}`,
      tagNumber,
      pnr: passenger.pnr,
      passengerName: `${passenger.firstName} ${passenger.lastName}`,
      flightNumber: passenger.flightNumber,
      destination: passenger.destination,
      weight: parseFloat(weight),
      status: 'pending',
      timestamp: Date.now(),
    }

    try {
      // Save to IndexedDB
      await db.addBaggageTag(newTag)
      
      // Add to sync queue
      await db.addToQueue({
        id: `baggage-${Date.now()}`,
        type: 'baggage-tag',
        payload: newTag,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      // Update passenger record
      const updatedPassenger = {
        ...passenger,
        baggageTags: [...passenger.baggageTags, tagNumber],
      }
      await db.addPassenger(updatedPassenger)
      setPassenger(updatedPassenger)

      // Update local state
      setBaggageTags([...baggageTags, newTag])
      setWeight('')
      
      console.log('[v0] Baggage tag generated:', tagNumber)
    } catch (err) {
      console.error('[v0] Failed to generate tag:', err)
      alert('Failed to generate baggage tag')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading passenger data...</p>
        </div>
      </div>
    )
  }

  if (!passenger) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Passenger Not Found</CardTitle>
            <CardDescription>Unable to load passenger information</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/check-in">
              <Button className="w-full">Return to Check-In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/check-in">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Package className="size-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Baggage Tagging</h1>
                <p className="text-xs text-muted-foreground">Generate and print tags</p>
              </div>
            </div>
          </div>
          <OnlineStatusIndicator />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Passenger Info */}
          <Card>
            <CardHeader>
              <CardTitle>Passenger Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold text-foreground">
                  {passenger.firstName} {passenger.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PNR</p>
                <p className="font-mono font-semibold text-foreground">{passenger.pnr}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flight</p>
                <p className="font-semibold text-foreground">
                  {passenger.flightNumber} → {passenger.destination}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generate New Tag */}
          <Card>
            <CardHeader>
              <CardTitle>Generate New Baggage Tag</CardTitle>
              <CardDescription>Enter baggage weight and generate a new tag</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Weight (kg)
                  </label>
                  <Input
                    type="number"
                    placeholder="23.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateTag()}
                    step="0.1"
                    min="0"
                    max="50"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleGenerateTag} className="gap-2">
                    <Plus className="size-4" />
                    Generate Tag
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Tags */}
          {baggageTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Tags ({baggageTags.length})</CardTitle>
                <CardDescription>Baggage tags for this passenger</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {baggageTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-mono text-lg font-bold text-foreground">
                          {tag.tagNumber}
                        </h3>
                        <Badge variant={tag.status === 'synced' ? 'default' : 'secondary'}>
                          {tag.status === 'synced' ? 'Synced' : 'Pending Sync'}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Weight: <span className="font-semibold text-foreground">{tag.weight} kg</span></span>
                        <span>Destination: <span className="font-semibold text-foreground">{tag.destination}</span></span>
                      </div>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Printer className="size-4" />
                      Print
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <Link href="/check-in" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Check-In
              </Button>
            </Link>
            <Link href="/reconciliation" className="flex-1">
              <Button className="w-full">
                View Reconciliation Queue
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
