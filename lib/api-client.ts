import { CheckInRecord, API_CONFIG } from './db/schema'

export class APIClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL
  }

  async syncCheckIn(record: CheckInRecord): Promise<void> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.SYNC_CHECK_IN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.toDynamoDBFormat(record)),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sync failed: ${response.status} - ${error}`)
    }
  }

  async getCheckInByPNR(pnr: string): Promise<CheckInRecord[]> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.GET_PNR}/${pnr}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch PNR: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data.map(this.fromDynamoDBFormat) : []
  }

  // Convert to DynamoDB format with type annotations
  private toDynamoDBFormat(record: CheckInRecord) {
    return {
      pnr_id: { S: record.pnr_id },
      pnr: { S: record.pnr },
      flightNumber: { S: record.flightNumber },
      date: { S: record.date },
      origin: { S: record.origin },
      destination: { S: record.destination },
      passengerName: { S: record.passengerName },
      seatNumber: { S: record.seatNumber },
      baggage: {
        L: record.baggage.map(bag => ({
          M: {
            tagNumber: { S: bag.tagNumber },
            weight: { N: bag.weight.toString() },
            color: { S: bag.color },
            status: { S: bag.status },
          },
        })),
      },
      timestamp: { S: record.timestamp },
      deskId: { S: record.deskId },
      synced: { BOOL: record.synced },
    }
  }

  // Convert from DynamoDB format
  private fromDynamoDBFormat(item: any): CheckInRecord {
    return {
      pnr_id: item.pnr_id?.S || item.pnr_id,
      pnr: item.pnr?.S || item.pnr,
      flightNumber: item.flightNumber?.S || item.flightNumber,
      date: item.date?.S || item.date,
      origin: item.origin?.S || item.origin,
      destination: item.destination?.S || item.destination,
      passengerName: item.passengerName?.S || item.passengerName,
      seatNumber: item.seatNumber?.S || item.seatNumber,
      baggage: (item.baggage?.L || item.baggage || []).map((bag: any) => ({
        tagNumber: bag.M?.tagNumber?.S || bag.tagNumber,
        weight: parseFloat(bag.M?.weight?.N || bag.weight),
        color: bag.M?.color?.S || bag.color,
        status: bag.M?.status?.S || bag.status,
      })),
      timestamp: item.timestamp?.S || item.timestamp,
      deskId: item.deskId?.S || item.deskId,
      synced: item.synced?.BOOL ?? item.synced ?? false,
    }
  }
}

export const apiClient = new APIClient()
