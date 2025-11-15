// AWS Lambda handler for check-in sync
// Deploy this to Lambda and connect to API Gateway

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || 'skylytics-checkins';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // POST /check-in - Sync check-in record
    if (event.httpMethod === 'POST' && event.path.includes('/check-in')) {
      const body = JSON.parse(event.body);
      
      // Convert from app format to DynamoDB format
      const item = {
        pnr_id: body.pnr_id.S,
        pnr: body.pnr.S,
        flightNumber: body.flightNumber.S,
        date: body.date.S,
        origin: body.origin.S,
        destination: body.destination.S,
        passengerName: body.passengerName.S,
        seatNumber: body.seatNumber.S,
        baggage: body.baggage.L.map(bag => ({
          tagNumber: bag.M.tagNumber.S,
          weight: parseFloat(bag.M.weight.N),
          color: bag.M.color.S,
          status: bag.M.status.S,
        })),
        timestamp: body.timestamp.S,
        deskId: body.deskId.S,
        synced: body.synced.BOOL,
      };

      await dynamodb.put({
        TableName: TABLE_NAME,
        Item: item,
      }).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Check-in synced successfully', pnr_id: item.pnr_id }),
      };
    }

    // GET /pnr/{pnr} - Get check-in records by PNR
    if (event.httpMethod === 'GET' && event.path.includes('/pnr/')) {
      const pnr = event.pathParameters.pnr;

      const result = await dynamodb.query({
        TableName: TABLE_NAME,
        IndexName: 'pnr-index', // You need to create this GSI
        KeyConditionExpression: 'pnr = :pnr',
        ExpressionAttributeValues: {
          ':pnr': pnr,
        },
      }).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Items || []),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
