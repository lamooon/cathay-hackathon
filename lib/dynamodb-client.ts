import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { CheckInRecord } from './db/schema'

const TABLE_NAME = 'cathay-checkin'

// Direct DynamoDB client for offline-first sync
export class DynamoDBDirectClient {
  private docClient: DynamoDBDocumentClient | null = null

  private initClient() {
    if (this.docClient) return this.docClient

    // These would typically come from a secure backend API
    // For now, using environment variables (not recommended for production)
    const client = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.NEXT_PUBLIC_AWS_SESSION_TOKEN || '',
      },
    })

    this.docClient = DynamoDBDocumentClient.from(client)
    return this.docClient
  }

  async syncCheckIn(record: CheckInRecord): Promise<void> {
    const docClient = this.initClient()

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pnr_id: record.pnr_id,
        pnr: record.pnr,
        flightNumber: record.flightNumber,
        date: record.date,
        origin: record.origin,
        destination: record.destination,
        passengerName: record.passengerName,
        seatNumber: record.seatNumber,
        baggage: record.baggage,
        timestamp: record.timestamp,
        deskId: record.deskId,
        synced: true,
        checkedIn: false,
      },
    })

    try {
      await docClient.send(command)
      console.log('[DynamoDB] Successfully synced:', record.pnr_id)
    } catch (error) {
      console.error('[DynamoDB] Sync failed:', error)
      throw error
    }
  }
}

export const dynamoDBClient = new DynamoDBDirectClient()
