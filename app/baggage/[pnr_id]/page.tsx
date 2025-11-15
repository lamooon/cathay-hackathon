'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { db } from '@/lib/db/client'
import { CheckInRecord, Baggage } from '@/lib/db/schema'
import { generateBaggageTagNumber } from '@/lib/mock-data'
import { OnlineStatusIndicator } from '@/components/online-status-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plane, ArrowLeft, Package, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function BaggagePage() {
  const params = useParams()
  const router = useRouter()
  const pnr_id = params.pnr_id as string

  const [record, setRecord] = useState<CheckInRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [color, setColor] = useState('BLACK')

  useEffect(() => {
    loadRecord()
  }, [pnr_id])

  async function loadRecord() {
    try {
      await db.init()
      const checkIn = await db.getCheckInById(pnr_id)
      if (checkIn) {
        setRecord(checkIn)
      } else {
        alert('Passenger not found')
        router.push('/check-in')
      }
    } catch (err) {
      console.error('[Skylytics] Failed to load record:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddBaggage() {
    if (!record) return
    if (!weight || parseFloat(weight) <= 0) {
      alert('Please enter a valid weight')
      return
    }

    const newBag: Baggage = {
      tagNumber: generateBaggageTagNumber(),
      weight: parseFloat(weight),
      color,
      status: 'CHECKED',
    }

    const updatedRecord = {
      ...record,
      baggage: [...record.baggage, newBag],
      timestamp: new Date().toISOString(),
    }

    try {
      await db.saveCheckIn(updatedRecord)
      
      // Add to sync queue
      await db.addToQueue({
        id: `baggage-${Date.now()}-${record.pnr_id}`,
        type: 'baggage-add',
        payload: updatedRecord,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      setRecord(updatedRecord)
      setWeight('')
      setColor('BLACK')
    } catch (err) {
      console.error('[Skylytics] Failed to add baggage:', err)
      alert('Failed to add baggage')
    }
  }

  async function handleRemoveBaggage(tagNumber: string) {
    if (!record) return

    const updatedRecord = {
      ...record,
      baggage: record.baggage.filter(b => b.tagNumber !== tagNumber),
      timestamp: new Date().toISOString(),
    }

    try {
      await db.saveCheckIn(updatedRecord)
      
      await db.addToQueue({
        id: `baggage-remove-${Date.now()}-${record.pnr_id}`,
        type: 'update',
        payload: updatedRecord,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      setRecord(updatedRecord)
    } catch (err) {
      console.error('[Skylytics] Failed to remove baggage:', err)
      alert('Failed to remove baggage')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!record) {
    return null
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
                <p className="text-xs text-muted-foreground">{record.passengerName}</p>
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
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">PNR</p>
                  <p className="font-mono font-semibold">{record.pnr}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flight</p>
                  <p className="font-semibold">{record.flightNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Route</p>
                  <p className="font-semibold">{record.origin} → {record.destination}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seat</p>
                  <p className="font-semibold">{record.seatNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">{record.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desk</p>
                  <p className="font-semibold">{record.deskId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Baggage */}
          <Card>
            <CardHeader>
              <CardTitle>Add Baggage</CardTitle>
              <CardDescription>Enter baggage details to generate a tag</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Weight (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 18.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLACK">Black</SelectItem>
                      <SelectItem value="RED">Red</SelectItem>
                      <SelectItem value="BLUE">Blue</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="BROWN">Brown</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddBaggage} className="w-full gap-2">
                <Package className="size-4" />
                Generate Baggage Tag
              </Button>
            </CardContent>
          </Card>

          {/* Baggage List */}
          <Card>
            <CardHeader>
              <CardTitle>Checked Baggage ({record.baggage.length})</CardTitle>
              <CardDescription>
                Total Weight: {record.baggage.reduce((sum, b) => sum + b.weight, 0).toFixed(1)} kg
              </CardDescription>
            </CardHeader>
            <CardContent>
              {record.baggage.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No baggage checked yet
                </p>
              ) : (
                <div className="space-y-3">
                  {record.baggage.map((bag) => (
                    <div
                      key={bag.tagNumber}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-mono text-lg font-semibold">{bag.tagNumber}</p>
                          <Badge>{bag.status}</Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Weight: <span className="font-semibold text-foreground">{bag.weight} kg</span></span>
                          <span>Color: <span className="font-semibold text-foreground">{bag.color}</span></span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBaggage(bag.tagNumber)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href="/check-in" className="flex-1">
              <Button variant="outline" className="w-full">Back to Check-In</Button>
            </Link>
            <Link href="/reconciliation" className="flex-1">
              <Button className="w-full">View Sync Queue</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
