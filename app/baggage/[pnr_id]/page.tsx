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
import { Plane, ArrowLeft, Package, Trash2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

// Flight number to color mapping
const FLIGHT_COLORS: Record<string, string> = {}

function getColorForFlight(flightNumber: string): string {
  // Generate consistent color based on flight number
  if (!FLIGHT_COLORS[flightNumber]) {
    const colors = ['BLACK', 'RED', 'BLUE', 'SILVER', 'BROWN']
    const hash = flightNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    FLIGHT_COLORS[flightNumber] = colors[hash % colors.length]
  }
  return FLIGHT_COLORS[flightNumber]
}

export default function BaggagePage() {
  const params = useParams()
  const router = useRouter()
  const pnr_id = params.pnr_id as string

  const [record, setRecord] = useState<CheckInRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [color, setColor] = useState('BLACK')
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    loadRecord()
  }, [pnr_id])

  useEffect(() => {
    // Set color based on flight number when record loads
    if (record) {
      const flightColor = getColorForFlight(record.flightNumber)
      setColor(flightColor)
    }
  }, [record])

  // Auto-scan simulation - only once when page loads
  useEffect(() => {
    if (record && !isScanning && !barcodeInput && record.baggage.length === 0) {
      // Auto-start scanning after 2-3 seconds
      const delay = 2000 + Math.random() * 1000
      const timer = setTimeout(() => {
        startAutoScan()
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [record])

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

  function startAutoScan() {
    setIsScanning(true)
    setScanProgress(0)
    
    // Animate progress bar (0.5-1s)
    const duration = 500 + Math.random() * 500
    const steps = 20
    const stepDuration = duration / steps
    
    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      setScanProgress((currentStep / steps) * 100)
      
      if (currentStep >= steps) {
        clearInterval(interval)
        // Generate random weight between 10-30 kg
        const weight = parseFloat((Math.random() * 20 + 10).toFixed(1))
        setBarcodeInput(weight.toString())
        setIsScanning(false)
        setScanProgress(0)
      }
    }, stepDuration)
  }

  async function handleScanOrConfirm() {
    if (!record) return
    
    const bagWeight = parseFloat(barcodeInput)
    
    // If no weight, trigger a scan
    if (!bagWeight || bagWeight <= 0) {
      startAutoScan()
      return
    }

    // If we have weight, confirm and create tag
    const newBag: Baggage = {
      tagNumber: generateBaggageTagNumber(),
      weight: bagWeight,
      color,
      status: 'CHECKED',
    }

    const updatedRecord = {
      ...record,
      baggage: [...record.baggage, newBag],
      timestamp: new Date().toISOString(),
    }

    try {
      // Save to local IndexedDB only
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

      // Update local state - this will live-update the UI
      setRecord(updatedRecord)
      setBarcodeInput('')
      
      // Ready for next scan
    } catch (err) {
      console.error('[Skylytics] Failed to add baggage:', err)
      alert('Failed to add baggage')
    }
  }

  function handleSendData() {
    setShowNotification(true)
    setTimeout(() => {
      setShowNotification(false)
    }, 3000)
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
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Package className="size-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Baggage Tagging</h1>
                <p className="text-xs text-muted-foreground">{record.passengerName}</p>
              </div>
            </Link>
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

          {/* Barcode Scanner Simulation */}
          <Card>
            <CardHeader>
              <CardTitle>Baggage Scanner</CardTitle>
              <CardDescription>Automatic baggage weight detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scanned Weight (kg)</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Waiting for scan..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="flex-1 text-lg font-mono"
                    disabled={isScanning}
                  />
                  {isScanning && (
                    <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100" 
                         style={{ width: `${scanProgress}%` }} />
                  )}
                </div>
                {isScanning && (
                  <p className="text-sm text-muted-foreground animate-pulse">Scanning baggage...</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Baggage Color (Auto-assigned)</label>
                <Input
                  value={color}
                  disabled
                  className="font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Color assigned based on flight {record.flightNumber}
                </p>
              </div>
              <Button 
                onClick={handleScanOrConfirm} 
                className="w-full gap-2"
                disabled={isScanning}
              >
                <Package className="size-4" />
                {barcodeInput && !isScanning ? 'Confirm Baggage' : 'Scan Baggage'}
              </Button>
            </CardContent>
          </Card>

          {/* Baggage List */}
          <Card>
            <CardHeader>
              <CardTitle>Checked Baggage</CardTitle>
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
                  {record.baggage.map((bag, index) => (
                    <div
                      key={bag.tagNumber}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
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
            <Button 
              onClick={handleSendData}
              variant="outline"
              className="flex-1"
            >
              Send Data
            </Button>
            <Link href="/check-in" className="flex-1">
              <Button className="w-full">Check-In Next Passenger</Button>
            </Link>
          </div>

          {/* Notification */}
          {showNotification && (
            <div className="fixed bottom-4 right-4 rounded-lg border border-emerald-600 bg-emerald-50 dark:bg-emerald-950 p-4 shadow-lg animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <p className="font-semibold">Data sent successfully!</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
