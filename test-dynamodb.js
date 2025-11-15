/**
 * Standalone DynamoDB Test Script
 * 
 * This script:
 * 1. Inserts 20 mock passenger check-in records to DynamoDB
 * 2. Retrieves a single record by PNR
 * 
 * Usage: node test-dynamodb.js
 */

require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB Configuration
const TABLE_NAME = 'cathay-checkin';

// Initialize DynamoDB Client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Mock data generators - Cathay Pacific only
const airlines = ['CX']; // Cathay Pacific
const origins = ['HKG']; // Hong Kong International Airport
const destinations = ['NRT', 'ICN', 'PVG', 'TPE', 'MNL'];
const baggageColors = ['BLACK', 'RED', 'BLUE', 'SILVER', 'BROWN'];
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const seatRows = ['12', '15', '18', '22', '25', '28', '32', '35', '38', '42'];
const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

function generatePNR() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateMockPassenger(index) {
  const pnr = generatePNR();
  const flightNumber = `${randomElement(airlines)}${Math.floor(Math.random() * 900) + 100}`;
  const date = new Date().toISOString().split('T')[0]; // Today's date
  const passengerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
  const seatNumber = `${randomElement(seatRows)}${randomElement(seatLetters)}`;
  
  return {
    pnr_id: `${pnr}_${index}`,
    pnr: pnr,
    flightNumber: flightNumber,
    date: date,
    origin: randomElement(origins),
    destination: randomElement(destinations),
    passengerName: passengerName,
    seatNumber: seatNumber,
    baggage: [], // Empty - baggage added during check-in process
    timestamp: new Date().toISOString(),
    deskId: `DESK-${Math.floor(Math.random() * 10) + 1}`,
    synced: true,
    checkedIn: false, // Default to not checked in
  };
}

/**
 * Insert a single record to DynamoDB
 */
async function insertRecord(record) {
  try {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    });
    
    await docClient.send(command);
    console.log(`✓ Inserted: ${record.passengerName} (PNR: ${record.pnr})`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert ${record.passengerName}:`, error.message);
    return false;
  }
}

/**
 * Insert 20 mock passengers to DynamoDB
 */
async function insertMockData() {
  console.log('\n🚀 Starting to insert 20 mock passengers...\n');
  
  const records = [];
  for (let i = 1; i <= 20; i++) {
    records.push(generateMockPassenger(i));
  }
  
  let successCount = 0;
  for (const record of records) {
    const success = await insertRecord(record);
    if (success) successCount++;
  }
  
  console.log(`\n✅ Successfully inserted ${successCount} out of 20 records\n`);
  return records;
}

/**
 * Retrieve a single record by pnr_id and pnr
 */
async function getRecordByPNR(pnr_id, pnr) {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pnr_id: pnr_id,
        pnr: pnr,
      },
    });
    
    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error('Error retrieving record:', error.message);
    return null;
  }
}

/**
 * Scan all records (for testing purposes)
 */
async function getAllRecords() {
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
    });
    
    const response = await docClient.send(command);
    return response.Items || [];
  } catch (error) {
    console.error('Error scanning records:', error.message);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  DynamoDB Test Script - Check-In Records');
  console.log('═══════════════════════════════════════════');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log('═══════════════════════════════════════════');
  
  // Insert mock data
  const insertedRecords = await insertMockData();
  
  // Test retrieval of first record
  if (insertedRecords.length > 0) {
    const firstRecord = insertedRecords[0];
    console.log('\n🔍 Testing record retrieval...');
    console.log(`Fetching: ${firstRecord.passengerName} (${firstRecord.pnr_id}, ${firstRecord.pnr})\n`);
    
    const retrieved = await getRecordByPNR(firstRecord.pnr_id, firstRecord.pnr);
    
    if (retrieved) {
      console.log('✅ Successfully retrieved record:');
      console.log(JSON.stringify(retrieved, null, 2));
    } else {
      console.log('❌ Failed to retrieve record');
    }
  }
  
  // Show all records count
  console.log('\n📊 Fetching all records count...');
  const allRecords = await getAllRecords();
  console.log(`Total records in table: ${allRecords.length}\n`);
  
  console.log('═══════════════════════════════════════════');
  console.log('  Test Complete!');
  console.log('═══════════════════════════════════════════\n');
}

// Run the script
main().catch(console.error);
