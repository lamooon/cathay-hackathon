/**
 * DynamoDB Table Setup Script
 * Creates the CheckInRecords table with proper schema
 * 
 * Usage: node setup-dynamodb-table.js
 */

require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = 'cathay-checkin';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

async function tableExists() {
  try {
    const command = new DescribeTableCommand({ TableName: TABLE_NAME });
    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable() {
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'pnr_id', KeyType: 'HASH' },  // Partition key
      { AttributeName: 'pnr', KeyType: 'RANGE' },    // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: 'pnr_id', AttributeType: 'S' },
      { AttributeName: 'pnr', AttributeType: 'S' },
      { AttributeName: 'date', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'pnr-index',
        KeySchema: [
          { AttributeName: 'pnr', KeyType: 'HASH' },
          { AttributeName: 'date', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
  };

  try {
    const command = new CreateTableCommand(params);
    const response = await client.send(command);
    console.log('✅ Table created successfully!');
    console.log(`Table ARN: ${response.TableDescription.TableArn}`);
    console.log('\n⏳ Waiting for table to become active...');

    // Wait for table to be active
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
      const describeResponse = await client.send(describeCommand);
      status = describeResponse.Table.TableStatus;
      console.log(`Status: ${status}`);
    }

    console.log('\n✅ Table is now ACTIVE and ready to use!');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  DynamoDB Table Setup');
  console.log('═══════════════════════════════════════════');
  console.log(`Table Name: ${TABLE_NAME}`);
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log('═══════════════════════════════════════════\n');

  console.log('🔍 Checking if table exists...');
  const exists = await tableExists();

  if (exists) {
    console.log('✅ Table already exists!');
    console.log('\nYou can now run: pnpm test:dynamodb');
  } else {
    console.log('❌ Table does not exist. Creating...\n');
    await createTable();
    console.log('\n🎉 Setup complete! You can now run: pnpm test:dynamodb');
  }

  console.log('\n═══════════════════════════════════════════');
}

main().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  if (error.message.includes('security token')) {
    console.log('\n⚠️  Your AWS credentials have expired.');
    console.log('Please update your .env.local file with fresh credentials.');
  }
  process.exit(1);
});
