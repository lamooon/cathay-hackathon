import { DB_NAME, DB_VERSION, STORES, CheckInRecord, QueuedAction } from './schema'

class SkylyticsDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Delete old stores if they exist
        if (db.objectStoreNames.contains('passengers')) {
          db.deleteObjectStore('passengers')
        }
        if (db.objectStoreNames.contains('baggage-tags')) {
          db.deleteObjectStore('baggage-tags')
        }

        // Check-ins store (matches DynamoDB structure)
        if (!db.objectStoreNames.contains(STORES.CHECK_INS)) {
          const checkInStore = db.createObjectStore(STORES.CHECK_INS, { keyPath: 'pnr_id' })
          checkInStore.createIndex('pnr', 'pnr', { unique: false })
          checkInStore.createIndex('flightNumber', 'flightNumber', { unique: false })
          checkInStore.createIndex('synced', 'synced', { unique: false })
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' })
          queueStore.createIndex('status', 'status', { unique: false })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async getCheckInByPNR(pnr: string): Promise<CheckInRecord[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHECK_INS, 'readonly')
      const store = transaction.objectStore(STORES.CHECK_INS)
      const index = store.index('pnr')
      const request = index.getAll(pnr)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveCheckIn(record: CheckInRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHECK_INS, 'readwrite')
      const store = transaction.objectStore(STORES.CHECK_INS)
      const request = store.put(record)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCheckInById(pnr_id: string): Promise<CheckInRecord | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHECK_INS, 'readonly')
      const store = transaction.objectStore(STORES.CHECK_INS)
      const request = store.get(pnr_id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllCheckIns(): Promise<CheckInRecord[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHECK_INS, 'readonly')
      const store = transaction.objectStore(STORES.CHECK_INS)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async addToQueue(action: QueuedAction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.QUEUE)
      const request = store.put(action)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingQueue(): Promise<QueuedAction[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.QUEUE, 'readonly')
      const store = transaction.objectStore(STORES.QUEUE)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllQueue(): Promise<QueuedAction[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.QUEUE, 'readonly')
      const store = transaction.objectStore(STORES.QUEUE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateQueueStatus(id: string, status: QueuedAction['status'], errorMessage?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.QUEUE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const action = getRequest.result
        if (action) {
          action.status = status
          if (errorMessage) action.errorMessage = errorMessage
          const putRequest = store.put(action)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error('Action not found'))
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.QUEUE, 'readwrite')
      const store = transaction.objectStore(STORES.QUEUE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHECK_INS, STORES.QUEUE], 'readwrite')
      
      const checkInsStore = transaction.objectStore(STORES.CHECK_INS)
      const queueStore = transaction.objectStore(STORES.QUEUE)
      
      checkInsStore.clear()
      queueStore.clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

export const db = new SkylyticsDB()
