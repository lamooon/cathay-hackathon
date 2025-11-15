/**
 * DynamoDB Table Deletion Script
 * Deletes the CheckInRecords table
 * 
 * Usage: node delete-dynamodb-table.js
 */

require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient, DeleteTableCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = 'cathay-checkin';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

async function deleteTable() {
  try {
    const command = new DeleteTableCommand({ TableName: TABLE_NAME });
    await client.send(command);
    console.log(`✅ Table "${TABLE_NAME}" deleted successfully!`);
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`ℹ️  Table "${TABLE_NAME}" does not exist.`);
    } else {
      console.error('❌ Error deleting table:', error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  DynamoDB Table Deletion');
  console.log('═══════════════════════════════════════════');
  console.log(`Table Name: ${TABLE_NAME}`);
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log('═══════════════════════════════════════════\n');

  await deleteTable();

  console.log('\n═══════════════════════════════════════════');
  console.log('Now run: node setup-dynamodb-table.js');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ Deletion failed:', error.message);
  process.exit(1);
});
