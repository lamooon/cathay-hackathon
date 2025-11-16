'use client'

import { useEffect, useState, useRef } from 'react'
import { db } from '@/lib/db/client'

import { Button } from '@/components/ui/button'
import { Plane, CheckCircle2, Upload } from 'lucide-react'
import Link from 'next/link'

function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  
  const records = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    
    // Simple CSV parsing (handles quoted fields)
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    
    const record: any = {}
    headers.forEach((header, index) => {
      let value = values[index] || ''
      
      // Parse special fields
      if (header === 'baggage') {
        try {
          // Handle empty array or parse JSON
          record[header] = value === '[]' ? [] : JSON.parse(value)
        } catch {
          record[header] = []
        }
      } else if (header === 'checkedIn') {
        record[header] = value === 'true'
      } else if (header === 'synced') {
        // Always import as not synced - synced status is only set after actual sync
        record[header] = false
      } else {
        record[header] = value
      }
    })
    
    records.push(record)
  }
  
  return records
}

export default function HomePage() {
  const [dbReady, setDbReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recordCount, setRecordCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showLoadedMessage, setShowLoadedMessage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function initDB() {
      try {
        await db.init()
        const count = await db.getRecordCount()
        setRecordCount(count)
        setDbReady(true)
        console.log('[Skylytics] Database initialized with', count, 'records')
      } catch (error) {
        console.error('[Skylytics] Failed to initialize database:', error)
      }
    }
    initDB()
  }, [])

  async function handleFileUpload(file: File) {
    setLoading(true)
    try {
      const text = await file.text()
      const records = parseCSV(text)
      
      console.log('[Skylytics] Parsed', records.length, 'records from CSV')
      
      for (const record of records) {
        await db.saveCheckIn(record)
      }
      
      const count = await db.getRecordCount()
      setRecordCount(count)
      console.log('[Skylytics] Loaded', records.length, 'records into database')
      
      // Show message temporarily
      setShowLoadedMessage(true)
      setTimeout(() => setShowLoadedMessage(false), 5000)
    } catch (err) {
      console.error('Failed to load CSV:', err)
      alert('Failed to load CSV file: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file)
    } else {
      alert('Please drop a CSV file')
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      console.log('[Skylytics] File selected:', file.name, file.type)
      handleFileUpload(file)
      // Reset input so same file can be selected again
      e.target.value = ''
    }
  }

  async function handleClearDatabase() {
    if (!confirm('Are you sure you want to clear all passenger data? This cannot be undone.')) {
      return
    }
    
    try {
      // Clear IndexedDB by deleting and recreating
      indexedDB.deleteDatabase('skylytics-db')
      
      // Reinitialize
      await db.init()
      const count = await db.getRecordCount()
      setRecordCount(count)
      
      console.log('[Skylytics] Database cleared')
    } catch (err) {
      console.error('Failed to clear database:', err)
      alert('Failed to clear database')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Skylytics" className="size-8" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Skylytics</h1>
              <p className="text-xs text-muted-foreground">Contingency Operations</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {dbReady && recordCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="gap-2"
              >
                <Upload className="size-4" />
                Import CSV
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl space-y-8">
          {!dbReady ? (
            <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
              <div className="space-y-3 text-center">
                <div className="mx-auto size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Initializing database...</p>
              </div>
            </div>
          ) : (
            <>
              {recordCount === 0 ? (
                <div 
                  className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card hover:border-primary/50'
                  } p-8`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-4 text-center">
                    <Upload className={`mx-auto size-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Load Passenger Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop a CSV file or click to browse
                      </p>
                    </div>
                  </div>
                </div>
              ) : showLoadedMessage ? (
                <div className="rounded-lg border border-border bg-card p-6 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                    <p className="text-2xl font-semibold text-foreground">
                      {recordCount} passenger {recordCount === 1 ? 'record' : 'records'} loaded
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/check-in" className="group">
                  <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Plane className="size-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">Passenger Check-In</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Look up PNRs and check in passengers
                      </p>
                    </div>
                    <Button className="mt-auto">Open Check-In</Button>
                  </div>
                </Link>

                <Link href="/reconciliation" className="group">
                  <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <svg
                        className="size-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">Reconciliation</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Review and sync offline operations
                      </p>
                    </div>
                    <Button variant="secondary" className="mt-auto">View Queue</Button>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

    </div>
  )
}
