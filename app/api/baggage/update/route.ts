import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const TABLE_NAME = 'cathay-checkin'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
})

const docClient = DynamoDBDocumentClient.from(client)

export async function POST(request: NextRequest) {
  try {
    const record = await request.json()

    if (!record.pnr_id || !record.pnr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update the baggage array in DynamoDB
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pnr_id: record.pnr_id,
        pnr: record.pnr,
      },
      UpdateExpression: 'SET baggage = :baggage, #ts = :timestamp',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':baggage': record.baggage,
        ':timestamp': record.timestamp,
      },
      ReturnValues: 'ALL_NEW',
    })

    const response = await docClient.send(command)

    return NextResponse.json({
      success: true,
      data: response.Attributes,
    })
  } catch (error: any) {
    console.error('[API] Error updating baggage:', error)
    return NextResponse.json(
      {
        error: 'Failed to update baggage',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
