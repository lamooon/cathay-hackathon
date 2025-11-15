/**
 * AWS Connection Test
 * Tests if AWS credentials are valid
 */

require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testConnection() {
  console.log('Testing AWS Connection...\n');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...');
  console.log('Session Token length:', process.env.AWS_SESSION_TOKEN?.length || 0);
  console.log('\n---\n');

  // Test STS (who am I?)
  try {
    const stsClient = new STSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });
    
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('✅ AWS Credentials Valid!');
    console.log('Account:', identity.Account);
    console.log('User ARN:', identity.Arn);
    console.log('\n---\n');
  } catch (error) {
    console.log('❌ STS Test Failed:', error.message);
    return;
  }

  // Test DynamoDB access
  try {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });
    
    const tables = await dynamoClient.send(new ListTablesCommand({}));
    console.log('✅ DynamoDB Access OK!');
    console.log('Existing tables:', tables.TableNames.length > 0 ? tables.TableNames.join(', ') : 'None');
    
    if (tables.TableNames.includes('CheckInRecords')) {
      console.log('\n✅ CheckInRecords table already exists!');
    } else {
      console.log('\n⚠️  CheckInRecords table does not exist yet.');
      console.log('Run: pnpm setup:dynamodb');
    }
  } catch (error) {
    console.log('❌ DynamoDB Test Failed:', error.message);
  }
}

testConnection().catch(console.error);
