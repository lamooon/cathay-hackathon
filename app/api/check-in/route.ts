import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pnr = searchParams.get('pnr')

  if (!pnr) {
    return NextResponse.json(
      { error: 'PNR parameter is required' },
      { status: 400 }
    )
  }

  try {
    // Scan DynamoDB with filter on pnr field
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'pnr-index',
      KeyConditionExpression: 'pnr = :pnr',
      ExpressionAttributeValues: {
        ':pnr': pnr.toUpperCase(),
      },
    })

    const response = await docClient.send(command)
    
    return NextResponse.json({
      success: true,
      data: response.Items || [],
      count: response.Items?.length || 0,
    })
  } catch (error: any) {
    console.error('[API] Error fetching from DynamoDB:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch passenger data',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
